import React, { useState, useEffect } from "react";
import { supabase } from "./supabaseClient";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import DragNdrop from "../components/DragNDrop";
import BackButton from "../components/BackButton";
import "./DeathReportForm.css";

import { getApiUrl } from "../../config/env";

const DeathReportForm = () => {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);

  const [name, setName] = useState("");
  const [surname, setSurname] = useState("");
  const [reportDetails, setReportDetails] = useState("");
  const [file, setFile] = useState(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [secretId, setSecretId] = useState("");
  const [password, setPassword] = useState("");
  const [dob, setDob] = useState("");
  const [isUuidValid, setIsUuidValid] = useState(false);
  const [key, setKey] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [accessToken, setAccessToken] = useState(null);

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

  useEffect(() => {
    const fetchUser = async () => {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();
      if (error || !user) {
        console.error("Error fetching user:", error?.message);
        navigate("/login");
        return;
      }
      setCurrentUser(user);
    };
    fetchUser();
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

  const validateUuid = async () => {
    if (!currentUser) {
      setMessage("Please wait for user data to load.");
      return;
    }
    if (!secretId.trim() || !password.trim()) {
      setMessage("ID and password are required.");
      return;
    }

    setLoading(true);
    try {
      const input = secretId.trim() + "Vedant_Kasar" + password.trim();
      const hashedToken = await hashWithSalt(input);
      const response = await axios.get(
        `${getApiUrl("")}/api/deathusers/findHashToken/${hashedToken}`,
        {
          headers: {
          },
        }
      );
      //finded hashtoken of current user (this is because user cant able to fool me with entering his own credentials)
      const check = await axios.get(
        `${getApiUrl("")}/api/deathusers/findHashTokenByUUID/${
          currentUser.id
        }`,
        {
          headers: {
          },
        }
      );

      if (response.status === 200 && check.data !== hashedToken) {
        setIsUuidValid(true);
        setMessage("ID validated successfully. You can now upload a file.");
        setKey(hashedToken); // Store the hashed token for later use
      } else {
        setIsUuidValid(false);
        setMessage("Invalid ID or password. Please check and try again.");
      }
    } catch (error) {
      console.error("Validation error:", error);
      setIsUuidValid(false);
      if (error.response && error.response.status === 404) {
        setMessage("Validation endpoint not found or invalid ID/password.");
      } else {
        setMessage(
          `Validation failed: ${error.message || "Please try again."}`
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!currentUser) {
      setMessage("You must be logged in to report a death.");
      return;
    }
    // Added dob and middleName to required fields check
    if (!name || !middleName || !surname || !file || !email || !dob) {
      setMessage(
        "Please fill in all required fields and upload a death certificate."
      );
      return;
    }

    if (file.type !== "application/pdf") {
      setMessage("Only PDF files are allowed.");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const bucket = "report";
      const originalName = file.name.replace(/\.[^/.]+$/, ""); // Remove original extension
      const safeName = originalName.replace(/[^\w\-]+/g, "_");
      const uniqueFileName = `${currentUser.id}_${Date.now()}_${safeName}`;
      const filePath = `${currentUser.id}/${uniqueFileName}`;
      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
          contentType: file.type,
        });

      if (uploadError) {
        throw new Error(`Failed to upload to Supabase: ${uploadError.message}`);
      }

      const reportData = {
        bucketUrl: filePath,
        name: name.toLowerCase(),
        middleName: middleName.toLowerCase(),
        surname: surname.toLowerCase(),
        reportDetails: reportDetails || null,
        email: email,
        secretKey: key, // Corrected from secrectKey to secretKey
        dateOfBirth: dob, // Added date of birth field
        status: "pending",
      };

      await axios.post(
        `${getApiUrl("")}/api/death-reports`,
        reportData,
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      setMessage("Death report submitted successfully!");
      setName("");
      setSurname("");
      setReportDetails("");
      setFile(null);
      setEmail(""); // Clear email field after submission
      setDob(""); // Clear dob field after submission
      setMiddleName(""); // Clear middleName after submission
      setSecretId(""); // Clear secretId after submission
      setPassword(""); // Clear password after submission
      setIsUuidValid(false); // Reset UUID validation state
      setKey(""); // Clear stored key
    } catch (error) {
      console.error("Report error:", error);
      setMessage(error.message || "Failed to submit death report.");
    } finally {
      setLoading(false);
    }
  };

  if (!currentUser) return <div>Loading...</div>;

  return (
    <>
      <BackButton />
      <div className="death-report-form-container">
        <h2 className="death-report-form-title">Report a Death</h2>
        <form onSubmit={handleSubmit}>
          <div className="death-report-field">
            <label className="death-report-label">ID</label>
            <input
              type="password"
              value={secretId}
              onChange={(e) => {
                setSecretId(e.target.value);
                setIsUuidValid(false);
                setKey("");
              }}
              placeholder="Enter the secret ID of the Deceased user"
              className="death-report-input"
              required
            />
          </div>
          <div className="death-report-field">
            <label className="death-report-label">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setIsUuidValid(false);
                setKey("");
              }}
              placeholder="Enter the Password of the Deceased user  "
              className="death-report-input"
              required
            />
          </div>

          {!isUuidValid && (
            <button
              type="button"
              onClick={validateUuid}
              disabled={loading || !secretId.trim() || !password.trim()}
              className="death-report-button death-report-button-validate"
            >
              {loading ? "Validating..." : "Validate ID"}
            </button>
          )}
          <fieldset
            style={{ border: "none", padding: 0 }}
            disabled={!isUuidValid}
          >
            {" "}
            {/* Disable fields until UUID is valid */}
            <div className="death-report-field">
              <label className="death-report-label">Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) =>
                  setName(e.target.value.toLowerCase().replace(/[^a-z]/g, ""))
                }
                placeholder="Enter the user’s name"
                className="death-report-input"
                required
              />
            </div>
            <div className="death-report-field">
              <label className="death-report-label">Middle Name</label>
              <input
                type="text"
                value={middleName}
                onChange={(e) =>
                  setMiddleName(
                    e.target.value.toLowerCase().replace(/[^a-z]/g, "")
                  )
                }
                placeholder="Enter the user’s Middle Name"
                className="death-report-input"
                required
              />
            </div>
            <div className="death-report-field">
              <label className="death-report-label">Surname</label>
              <input
                type="text"
                value={surname}
                onChange={(e) =>
                  setSurname(
                    e.target.value.toLowerCase().replace(/[^a-z]/g, "")
                  )
                }
                placeholder="Enter the user’s surname"
                className="death-report-input"
                required
              />
            </div>
            <div className="death-report-field">
              <label className="death-report-label">Date of Birth</label>
              <input
                type="date" // Kept as text as per original, but type="date" could be considered
                value={dob} // Corrected: value should be dob
                onChange={(e) => setDob(e.target.value)} // Corrected: onChange should set dob
                placeholder="Enter Date of Birth (DD-MM-YYYY)"
                className="death-report-input"
                required
              />
            </div>
            <div className="death-report-field">
              <label className="death-report-label">Email</label>{" "}
              {/* Changed label to "Email" */}
              <input
                type="email" // Changed type to "email" for better validation
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter the user’s email"
                className="death-report-input"
                required
              />
            </div>
            <div className="death-report-field">
              <label className="death-report-label">Details (Optional)</label>{" "}
              {/* Added (Optional) */}
              <textarea
                value={reportDetails}
                onChange={(e) => setReportDetails(e.target.value)}
                placeholder="Provide any additional details (e.g., date of death, place of death)"
                className="death-report-textarea"
              />
            </div>
            <div>
              <label className="death-report-label">
                Upload Death Certificate (PDF only)
              </label>{" "}
              {/* Clarified file type */}
              <div>
                <DragNdrop onFilesSelected={setFile} />
              </div>
            </div>
            <button
              type="submit"
              disabled={loading || !isUuidValid}
              className="death-report-button"
            >
              {" "}
              {/* Disable submit if not validated */}
              {loading ? "Submitting..." : "Submit Report"}
            </button>
          </fieldset>
        </form>
        {message && (
          <p className={message.includes("success") ? "death-report-success" : "death-report-error"}>
            {message}
          </p>
        )}
      </div>
    </>
  );
};

export default DeathReportForm;
