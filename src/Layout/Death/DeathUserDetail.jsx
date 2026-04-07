import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "./supabaseClient";
import axios from "axios";
import { v4 as uuidv4 } from "uuid";
import CryptoJS from "crypto-js";
import "./DeathUserDetails.css";

import { getApiUrl } from "../../config/env";

// Modal component for showing credentials
const CredentialsModal = ({ credentials, onClose, onDownload, onCopy }) => {
  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h3>Your Important Credentials</h3>
          <p className="modal-subheader">
            Please copy and store these securely. You will only see them once.
          </p>
        </div>
        <div className="modal-body">
          <div className="credential">
            <label htmlFor="uuidInput" className="credential__label">Your ID</label>
            <div className="credential__input-group">
              <input
                id="uuidInput"
                type="text"
                value={credentials.uuid}
                readOnly
                className="credential__input"
              />
              <button
                onClick={() => onCopy(credentials.uuid, "ID")}
                className="btn btn--copy"
              >
                Copy
              </button>
            </div>
          </div>
          <div className="credential">
            <label htmlFor="passwordInput" className="credential__label">Your Password</label>
            <div className="credential__input-group">
              <input
                id="passwordInput"
                type="text"
                value={credentials.iv}
                readOnly
                className="credential__input"
              />
              <button
                onClick={() => onCopy(credentials.iv, "Password")}
                className="btn btn--copy"
              >
                Copy
              </button>
            </div>
          </div>
          <div className="warning-box">
            Do not share this with anyone except your trusted beneficiary.
          </div>
        </div>
        <div className="modal-footer">
          <button onClick={onDownload} className="btn btn--secondary">
            Download .txt
          </button>
          <button onClick={onClose} className="btn btn--primary">
            I Have Saved My Credentials
          </button>
        </div>
      </div>
    </div>
  );
};

// Modal component for confirming closure
const ConfirmationModal = ({ onConfirm, onCancel }) => {
  return (
    <div className="modal-overlay">
      <div className="modal-content modal-content--confirm">
        <div className="modal-header">
          <h4>Are you sure?</h4>
        </div>
        <div className="modal-body">
          <p>
            These credentials will not be shown again. Ensure you have saved them
            before proceeding.
          </p>
        </div>
        <div className="modal-footer">
          <button onClick={onCancel} className="btn btn--secondary">
            Cancel
          </button>
          <button onClick={onConfirm} className="btn btn--danger">
            Proceed & Close
          </button>
        </div>
      </div>
    </div>
  );
};

const UserDetailsForm = () => {
  const navigate = useNavigate();
  const [firstName, setFirstName] = useState("");
  const [lastname, setLastname] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingScreen, setLoadingScreen] = useState(true);
  const [user, setUser] = useState(null);
  const [accessToken, setAccessToken] = useState(null);
  const [modalCredentials, setModalCredentials] = useState(null);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);

  useEffect(() => {
    const checkUser = async () => {
      try {
        const { data, error } = await supabase.auth.getUser();
        if (error || !data?.user) {
          navigate("/login");
        } else {
          setUser(data.user);
          const { data: sessionData } = await supabase.auth.getSession();
          setAccessToken(sessionData.session?.access_token);
          setLoadingScreen(false);
        }
      } catch (err) {
        navigate("/login");
      }
    };
    checkUser();
  }, [navigate]);

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

  const generateKeysWithEncryption = (uuid) => {
    const salt = CryptoJS.SHA256(uuid).toString();
    const derivedKey = CryptoJS.PBKDF2(uuid, salt, {
      keySize: 256 / 32,
      iterations: 10000,
    });
    const iv = CryptoJS.lib.WordArray.random(16);
    const encrypted = CryptoJS.AES.encrypt(
      derivedKey.toString(CryptoJS.enc.Hex),
      derivedKey,
      {
        iv: iv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7,
      }
    );
    return {
      encryptedKey: encrypted.toString(),
      iv: iv.toString(CryptoJS.enc.Base64),
    };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const generatedUuid = uuidv4();
      const { encryptedKey, iv } = generateKeysWithEncryption(generatedUuid);
      const hashedUuid = await hashWithSalt(
        generatedUuid.trim() + "Vedant_Kasar" + iv.trim()
      );

      const userDetails = {
        userIdX: user.id,
        email: user.email,
        firstName,
        middleName,
        lastname,
        dateOfBirth,
        lastActivityDate: new Date().toISOString(),
        inactivityThresholdDays: 0,
        userRole: "general",
        isdeceased: false,
        attemptCount: 0,
        lastInteraction: new Date().toISOString(),
        buddyStatus: "CHILLING",
        hashuuid: hashedUuid,
        secretKey: encryptedKey,
        flag: true,
      };

      await axios.post(
        `${getApiUrl("")}/api/deathusers`,
        userDetails,
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      setModalCredentials({ uuid: generatedUuid, iv });
    } catch (err) {
      console.error("Error submitting form:", err.response?.data || err.message);
      alert("Submission failed. Please check the console for details.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (text, type) => {
    navigator.clipboard.writeText(text);
    alert(`${type} copied to clipboard!`);
  };

  const handleDownload = () => {
    const { uuid, iv } = modalCredentials;
    const textContent = `Please save these credentials securely.\n\nID: ${uuid}\nPassword: ${iv}`;
    const blob = new Blob([textContent], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "gonegift-credentials.txt";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleCloseCredentialsModal = () => {
    setIsConfirmModalOpen(true);
  };

  const handleConfirmClose = () => {
    setIsConfirmModalOpen(false);
    setModalCredentials(null);
    navigate("/death-dashboard");
  };

  if (loadingScreen) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <>
      <div className="user-details-page-wrapper">
        <h2 className="user-details-title">Enter Your Details</h2>
        <p className="user-details-subtitle">
          Complete your profile once. We will generate secure credentials after submission.
        </p>

        <form className="form form--grid" onSubmit={handleSubmit}>
          <div className="form__group">
            <label className="form__label">First Name</label>
            <input
              type="text"
              value={firstName}
              onChange={(e) =>
                setFirstName(e.target.value.toLowerCase().replace(/[^a-z]/g, ""))
              }
              required
              className="form__input"
              placeholder="Enter your first name"
            />
          </div>
          <div className="form__group">
            <label className="form__label">Middle Name</label>
            <input
              type="text"
              value={middleName}
              onChange={(e) =>
                setMiddleName(e.target.value.toLowerCase().replace(/[^a-z]/g, ""))
              }
              required
              className="form__input"
              placeholder="Enter your middle name"
            />
          </div>
          <div className="form__group">
            <label className="form__label">Last Name</label>
            <input
              type="text"
              value={lastname}
              onChange={(e) =>
                setLastname(e.target.value.toLowerCase().replace(/[^a-z]/g, ""))
              }
              required
              className="form__input"
              placeholder="Enter your last name"
            />
          </div>
          <div className="form__group">
            <label className="form__label">Date of Birth</label>
            <input
              type="date"
              value={dateOfBirth}
              onChange={(e) => setDateOfBirth(e.target.value)}
              required
              className="form__input"
            />
          </div>

          <div className="form__actions">
            <button type="submit" disabled={loading} className="btn btn--primary btn--block">
              {loading ? "Submitting..." : "Submit Details"}
            </button>
          </div>
        </form>
      </div>

      {modalCredentials && (
        <CredentialsModal
          credentials={modalCredentials}
          onClose={handleCloseCredentialsModal}
          onDownload={handleDownload}
          onCopy={handleCopy}
        />
      )}

      {isConfirmModalOpen && (
        <ConfirmationModal
          onConfirm={handleConfirmClose}
          onCancel={() => setIsConfirmModalOpen(false)}
        />
      )}
    </>
  );
};

export default UserDetailsForm;