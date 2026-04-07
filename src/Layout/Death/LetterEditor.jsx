import React, { useState, useEffect } from "react";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import { supabase } from "./supabaseClient";
import axios from "axios";
import CryptoJS from "crypto-js";
import { getApiUrl } from "../../config/env";
import BackButton from "../components/BackButton";
import "./LetterEditor.css";

const LetterEditor = () => {
  const [letterTitle, setLetterTitle] = useState("");
  const [letterContent, setLetterContent] = useState("");
  const [currentUser, setCurrentUser] = useState(null);
  const [validationLoading, setValidationLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [uuid, setUuid] = useState("");
  const [password, setPassword] = useState("");
  const [isUuidValid, setIsUuidValid] = useState(false);
  const [decryptedKey, setDecryptedKey] = useState(null);

  const isBusy = validationLoading || saveLoading;

  const hashWithSalt = async (x) => {
    const salt = x.substring(0, 16);
    const text = x + salt;
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    return Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  };

  const fetchCurrentUser = async () => {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error) {
      console.error("Error fetching user data:", error);
      return;
    }

    if (user) {
      setCurrentUser(user);
    }
  };

  const getEncryptedKey = async (userId) => {
    const response = await axios.get(`${getApiUrl("")}/api/deathusers/getKey/${userId}`);
    if (response.status === 200 && response.data) {
      return response.data;
    }
    throw new Error("No encrypted key found.");
  };

  const decryptKey = async (uuidValue, encryptedKey, ivBase64) => {
    if (!encryptedKey || !ivBase64) {
      throw new Error("Encrypted key or IV is missing");
    }

    const salt = CryptoJS.SHA256(uuidValue).toString();
    const derivedKey = CryptoJS.PBKDF2(uuidValue, salt, {
      keySize: 256 / 32,
      iterations: 10000,
    });

    const iv = CryptoJS.enc.Base64.parse(ivBase64);
    const decrypted = CryptoJS.AES.decrypt(
      { ciphertext: CryptoJS.enc.Base64.parse(encryptedKey) },
      derivedKey,
      {
        iv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7,
      }
    );

    const finalKey = decrypted.toString(CryptoJS.enc.Utf8);
    if (!finalKey) {
      throw new Error("Decryption resulted in empty key");
    }

    return finalKey;
  };

  const validateUuid = async () => {
    if (!currentUser) {
      setMessage("Please wait for user data to load.");
      return;
    }

    if (!uuid.trim() || !password.trim()) {
      setMessage("ID and password are required.");
      return;
    }

    setValidationLoading(true);
    try {
      const input = uuid.trim() + "Vedant_Kasar" + password.trim();
      const hashedToken = await hashWithSalt(input);

      const response = await axios.get(
        `${getApiUrl("")}/api/deathusers/findHashToken/${hashedToken}`
      );

      if (response.status === 200) {
        setIsUuidValid(true);
        const encryptedKeyData = await getEncryptedKey(currentUser.id);
        const derivedKey = await decryptKey(uuid.trim(), encryptedKeyData, password.trim());
        setDecryptedKey(derivedKey);
        setMessage("ID validated successfully. You can now save the letter.");
        return;
      }

      setIsUuidValid(false);
      setDecryptedKey(null);
      setMessage("Invalid ID or password. Please try again.");
    } catch (error) {
      console.error("Validation error:", error);
      setIsUuidValid(false);
      setDecryptedKey(null);
      setMessage(`Validation failed: ${error.message || "Please try again."}`);
    } finally {
      setValidationLoading(false);
    }
  };

  const encryptLetter = async (content) => {
    if (!decryptedKey) {
      throw new Error("Decrypted AES key not available");
    }

    return CryptoJS.AES.encrypt(content, decryptedKey).toString();
  };

  const handleSave = async () => {
    if (!currentUser) {
      setMessage("You must be logged in to save a letter.");
      return;
    }

    if (!letterTitle || !letterContent) {
      setMessage("Please enter a title and content for the letter.");
      return;
    }

    if (!isUuidValid || !decryptedKey) {
      setMessage("Please validate ID and password first.");
      return;
    }

    setSaveLoading(true);
    setMessage("");

    try {
      const encryptedContent = await encryptLetter(letterContent);
      const cleanTitle = letterTitle.replace(/[\/\\]/g, "_").replace(/\s+/g, "_");
      const fileName = `${cleanTitle}_${Date.now()}.html.enc`;
      const file = new Blob([encryptedContent], { type: "text/plain" });
      const filePath = `${currentUser.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("letters")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
          contentType: "text/plain",
        });

      if (uploadError) {
        throw new Error(`Failed to upload to Supabase: ${uploadError.message}`);
      }

      const fileMetadata = {
        idOfUser: currentUser.id,
        letterFileUrl: filePath,
        mediaFileUrl: null,
        voiceFileUrl: null,
        fileName: letterTitle,
        usery: {
          userIdX: currentUser.id,
        },
      };

      const response = await axios.post(`${getApiUrl("")}/api/filemetadata`, fileMetadata, {
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.status !== 200 && response.status !== 201) {
        throw new Error("Failed to save letter metadata.");
      }

      setMessage("Letter saved successfully!");
      setLetterTitle("");
      setLetterContent("");
      setUuid("");
      setPassword("");
      setIsUuidValid(false);
      setDecryptedKey(null);
    } catch (error) {
      console.error("Save error:", error);
      setMessage(error.message || "Failed to save letter");
    } finally {
      setSaveLoading(false);
    }
  };

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  if (!currentUser) {
    return <div>Loading user information...</div>;
  }

  const isSuccess = message.toLowerCase().includes("success");

  return (
    <>
      <BackButton />
      <div className="letter-editor-page">
        <div className="letter-auth-box">
          <div className="letter-field">
            <label className="letter-label">ID</label>
            <input
              className="letter-input"
              type="password"
              placeholder="Enter ID"
              value={uuid}
              onChange={(e) => setUuid(e.target.value)}
              disabled={isBusy || isUuidValid}
            />
          </div>

          <div className="letter-field">
            <label className="letter-label">Password</label>
            <input
              className="letter-input"
              type="password"
              placeholder="Enter Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isBusy || isUuidValid}
            />
          </div>

          <button
            className="letter-btn"
            onClick={validateUuid}
            disabled={!uuid || !password || isBusy || isUuidValid}
          >
            {validationLoading ? "Validating..." : "Validate Secrets"}
          </button>
        </div>

        <div className="letter-main-card">
          <h2 className="letter-header">Letters to Loved Ones</h2>

          <div className="letter-field">
            <label className="letter-label">Letter Title</label>
            <input
              className="letter-input"
              type="text"
              value={letterTitle}
              onChange={(e) => setLetterTitle(e.target.value)}
              placeholder="Enter letter title"
              disabled={!isUuidValid}
            />
          </div>

          <div className="letter-quill-wrap">
            <ReactQuill
              value={letterContent}
              onChange={setLetterContent}
              theme="snow"
              readOnly={!isUuidValid}
            />
          </div>

          <div className="letter-button-row">
            <button
              className="letter-btn"
              onClick={handleSave}
              disabled={isBusy || !isUuidValid || !decryptedKey || !letterTitle || !letterContent}
            >
              {saveLoading ? "Saving..." : "Save Letter"}
            </button>
          </div>

          {message && (
            <p className={`letter-message ${isSuccess ? "success" : "error"}`}>
              {message}
            </p>
          )}
        </div>
      </div>
    </>
  );
};

export default LetterEditor;
