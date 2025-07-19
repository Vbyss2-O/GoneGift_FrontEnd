import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "./supabaseClient";
import axios from "axios";
import { v4 as uuidv4 } from "uuid";
import CryptoJS from "crypto-js";
import "./DeathUserDetails.css"

const UserDetailsForm = () => {
  const navigate = useNavigate();
  const [firstName, setFirstName] = useState("");
  const [lastname, setLastname] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingScreen, setLoadingScreen] = useState(true);
  const [user, setUser] = useState(null);
  const [middleName, setMiddleName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [accessToken, setAccessToken] = useState(null);

  // Check if user is logged in, if not redirect to login
  useEffect(() => {
    const checkUser = async () => {
      try {
        const { data, error } = await supabase.auth.getUser();
        if (error || !data?.user) {
          console.error("User not found or error:", error?.message || "No user found");
          navigate("/login");
        } else {
          setUser(data.user);
          setLoadingScreen(false);
        }
      } catch (err) {
        console.error("Error in checkUser:", err.message);
        navigate("/login");
      }
    };
    checkUser();
  }, [navigate]);

  useEffect(() => {
    const initAuth = async () => {
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        console.error("Error getting session:", error);
        return;
      }

      const accessToken = data.session?.access_token;

      if (accessToken) {
        setAccessToken(accessToken);
      } else {
        console.warn("No access token found—user probably signed out.");
      }
    };

    initAuth();
  }, []);

  // Hashing function using crypto.subtle API
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
    try {
      // 1. Generate salt from UUID (SHA256)
      const salt = CryptoJS.SHA256(uuid).toString();

      // 2. Derive a 256-bit key using PBKDF2
      const derivedKey = CryptoJS.PBKDF2(uuid, salt, {
        keySize: 256 / 32,
        iterations: 10000,
      });

      // 3. Generate a random IV (Initialization Vector)
      const iv = CryptoJS.lib.WordArray.random(16);

      // 4. Encrypt the derived key itself as string
      const encrypted = CryptoJS.AES.encrypt(
        derivedKey.toString(CryptoJS.enc.Hex), // Data to encrypt
        derivedKey,                            // Use derived key as encryption key
        {
          iv: iv,
          mode: CryptoJS.mode.CBC,
          padding: CryptoJS.pad.Pkcs7,
        }
      );

      // 5. Return both encrypted value and IV as Base64 (needed for decryption)
      return {
        encryptedKey: encrypted.toString(),       // Base64 string
        iv: iv.toString(CryptoJS.enc.Base64),     // Also Base64 string
      };

    } catch (error) {
      console.error('Key generation/encryption failed:', error);
      throw error;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const generatedUuid = uuidv4();
      const email = user.email;

      // Get the encrypted key directly from the function
      const { encryptedKey, iv } = generateKeysWithEncryption(generatedUuid);
      const hashedUuid = await hashWithSalt(generatedUuid.trim() + "Vedant_Kasar" + iv.trim());

      const userDetails = {
        userIdX: user.id,
        email: email,
        firstName: firstName,
        middleName: middleName,
        lastname: lastname,
        dateOfBirth: dateOfBirth,
        lastActivityDate: new Date().toISOString(),
        inactivityThresholdDays: 0,
        userRole: "general",
        isdeceased: false,
        attemptCount: 0,
        lastInteraction: new Date().toISOString(),
        buddyStatus: "CHILLING",
        hashuuid: hashedUuid,
        secretKey: encryptedKey, // Use the returned value directly
        flag: true,
      };

      const response = await axios.post(`${import.meta.env.VITE_API_URL}/api/deathusers`, userDetails, {
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`
        },
      });

      showCredentialsBox(generatedUuid, iv);
      navigate("/death-dashboard");
    } catch (err) {
      console.error("Error submitting form:", err.response?.data || err.message);
      alert("Submission failed. Please check console logs.");
    } finally {
      setLoading(false);
    }
  };

  function showCredentialsBox(uuid, password) {
    // Create overlay
    const overlay = document.createElement("div");
    overlay.className = "credentials-overlay";

    // Create box
    const box = document.createElement("div");
    box.className = "credentials-box";
    box.innerHTML = `
      <h3>Your Important Credentials</h3>
      <p><strong>Your ID:</strong></p>
      <div class="credential-field">
        <input type="text" value="${uuid}" readonly class="credential-input" id="uuidInput">
        <button id="copyUuid" class="copy-button">Copy</button>
      </div>
      <p><strong>Your Password:</strong></p>
      <div class="credential-field">
        <input type="text" value="${password}" readonly class="credential-input" id="passwordInput">
        <button id="copyPassword" class="copy-button">Copy</button>
      </div>
      <p class="warning-text">Do not share this with anyone except your beneficiary.</p>
      <div class="button-group">
        <button id="downloadFile" class="action-button download-button">Download .txt</button>
        <button id="closeBox" class="action-button close-button">Close</button>
      </div>
    `;

    overlay.appendChild(box);
    document.body.appendChild(overlay);

    // Copy handlers
    box.querySelector("#copyUuid").onclick = () => {
      navigator.clipboard.writeText(uuid);
    };
    box.querySelector("#copyPassword").onclick = () => {
      navigator.clipboard.writeText(password);
    };

    // Download handler
    box.querySelector("#downloadFile").onclick = () => {
      const textContent = `ID: ${uuid}\nPassword: ${password}`;
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

    // Close handler
    box.querySelector("#closeBox").onclick = () => {
      // Create confirmation overlay
      const confirmOverlay = document.createElement("div");
      confirmOverlay.className = "confirm-overlay";

      // Create confirmation box
      const confirmBox = document.createElement("div");
      confirmBox.className = "confirm-box";
      confirmBox.innerHTML = `
        <h4>Warning</h4>
        <p>This credential will not be visible again. One-time copy only. Make sure you have saved it before proceeding.</p>
        <div class="confirm-buttons">
          <button id="cancelConfirm" class="cancel-button">Close</button>
          <button id="continueConfirm" class="continue-button">Continue</button>
        </div>
      `;

      confirmOverlay.appendChild(confirmBox);
      document.body.appendChild(confirmOverlay);

      // Handle Close (just hide confirmation)
      confirmBox.querySelector("#cancelConfirm").onclick = () => {
        document.body.removeChild(confirmOverlay);
      };

      // Handle Continue (remove everything)
      confirmBox.querySelector("#continueConfirm").onclick = () => {
        document.body.removeChild(confirmOverlay);
        document.body.removeChild(overlay);
      };
    };
  }

  return (
    <div className="user-details-container">
      {loadingScreen ? (
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading...</p>
        </div>
      ) : (
        <>
          <h2>Enter Your Details</h2>
          <form className="user-details-form" onSubmit={handleSubmit}>
            <div className="input-group">
              <label>First Name</label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value.toLowerCase().replace(/[^a-z]/g, ""))}
                required
                className="form-input"
                placeholder="Enter your first name"
              />
            </div>
            <div className="input-group">
              <label>Middle Name</label>
              <input
                type="text"
                value={middleName}
                onChange={(e) => setMiddleName(e.target.value.toLowerCase().replace(/[^a-z]/g, ""))}
                required
                className="form-input"
                placeholder="Enter your middle name"
              />
            </div>
            <div className="input-group">
              <label>Last Name</label>
              <input
                type="text"
                value={lastname}
                onChange={(e) => setLastname(e.target.value.toLowerCase().replace(/[^a-z]/g, ""))}
                required
                className="form-input"
                placeholder="Enter your last name"
              />
            </div>
            <div className="input-group">
              <label>Date of Birth</label>
              <input
                type="date"
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
                required
                className="form-input"
              />
            </div>
            <button type="submit" disabled={loading} className="submit-button">
              {loading ? "Submitting..." : "Submit"}
            </button>
          </form>
        </>
      )}
    </div>
  );
};

export default UserDetailsForm;