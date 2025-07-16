import React, { useEffect, useState } from "react";
import axios from "axios";
import { supabase } from "./Death/supabaseClient"; // Adjust path if needed
import { v4 as uuidv4 } from "uuid";
import { useNavigate } from "react-router-dom";
import "./LifeBuddy.css"; // Import your CSS styles
import BackButton from "./components/BackButton"; // Import the BackButton component
import MonitoringToggle from "./components/MonitoringToggle"; // Assuming this is the correct path

const LifeBuddyDashboard = () => {
  const [userIdX, setUserIdX] = useState(null);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [replyMessage, setReplyMessage] = useState("");
  const [replyStatus, setReplyStatus] = useState(null);
  const [userx, setUserX] = useState(null);
  const navigate = useNavigate();
  const [accessToken, setAccessToken] = useState(null);

  // Effect to get the access token from Supabase session
  useEffect(() => {
    const initAuth = async () => {
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        console.error("Error getting session:", error);
        setError("Failed to authenticate session."); // Set error for the user
        return;
      }

      const token = data.session?.access_token;

      if (token) {
        setAccessToken(token);
      } else {
        console.warn("No access token found—user probably signed out.");
        // If no token, and it's needed for the dashboard, consider redirecting to login
        // setError("User not authenticated. Please log in."); // Can also set error here
      }
    };

    initAuth();
  }, []); // Run only once on component mount

  // Fetch userIdX and initial DeathUser data from Supabase and API
  // This effect now depends on `accessToken`
  useEffect(() => {
    const fetchUserData = async () => {
      if (!accessToken) {
        // Don't proceed if accessToken is not available yet
        return;
      }

      try {
        const {
          data: { user },
          error,
        } = await supabase.auth.getUser();
        if (error || !user) {
          setError("User not authenticated. Please log in.");
          return;
        }
        setUserIdX(user.id);

        // Fetch DeathUser data
        const userResponse = await axios.get(
          `${import.meta.env.VITE_API_URL}/api/deathusers/${user.id}`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }
        );
        setUserX(userResponse.data);

        // Now fetch activities, passing accessToken
        fetchActivities(user.id, accessToken); // Pass accessToken here
      } catch (err) {
        setError("Failed to fetch user data. Please log in.");
        console.error(err);
      }
    };

    fetchUserData();
  }, [accessToken]); // Rerun when accessToken changes from null to a valid token

  // Fetch LifeBuddy activities for the user
  // This function now explicitly accepts accessToken
  const fetchActivities = async (userId, token) => {
    if (!userId || !token) return; // Ensure both are available
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/lifebuddy/activities/${userId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`, // Use the passed token
          },
        }
      );
      setActivities(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      if (err.response && err.response.status === 204) {
        setActivities([]);
      } else {
        setError("Failed to load Buddy logs. Try again!");
        console.error(err);
      }
    } finally {
      setLoading(false);
    }
  };

  // Handle reply submission
  const handleReply = async () => {
    if (!userIdX || !replyMessage.trim()) {
      setReplyStatus("Please provide a reply message");
      return;
    }
    if (!accessToken) {
      setReplyStatus("Authentication token missing. Please log in again.");
      return;
    }

    setReplyStatus(null);
    try {
      await axios.delete(
        `${import.meta.env.VITE_API_URL}/buddy/delete/${userIdX}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      console.log("Previous logs deleted successfully Thank You!");
    } catch (err) {
      console.error("Failed to delete previous logs:", err);
      // Decide if you want to stop here or proceed to add new log even if delete failed
      // For now, it proceeds.
    }
    try {
      const token = uuidv4();
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/buddy?userId=${userIdX}&token=${token}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );
      setReplyStatus(response.data);
      setReplyMessage("");
      fetchActivities(userIdX, accessToken); // Ensure accessToken is passed
    } catch (err) {
      setReplyStatus("Failed to send reply. Try again!");
      console.error(err);
    }
  };

  async function goToInfoPage() {
    navigate("/buddyAbout");
  }

  // Update DeathUser when replyStatus is not null
  useEffect(() => {
    const updateDeathUser = async () => {
      if (!replyStatus || replyStatus.includes("Failed") || !userIdX || !accessToken) return; // Add accessToken check

      try {
        const userResponse = await axios.get(
          `${import.meta.env.VITE_API_URL}/api/deathusers/${userIdX}`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }
        );
        const currentUser = userResponse.data;
        const updatedUser = {
          ...currentUser,
          lastInteraction: new Date().toISOString(),
          attemptCount: 0, // Added as per requirement
        };

        await axios.post(
          `${import.meta.env.VITE_API_URL}/api/deathusers`,
          updatedUser,
          {
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${accessToken}`,
            },
          }
        );
        setUserX(updatedUser); // Update userx after successful POST
        console.log("DeathUser updated successfully");
      } catch (err) {
        console.error("Failed to update DeathUser:", err);
        setError("Failed to update user data after reply.");
      }
    };

    updateDeathUser();
  }, [replyStatus, userIdX, accessToken]); // Add accessToken to dependencies

  return (
    <>
      <BackButton />
      <div className="lifebuddy-dashboard">
        <center>
          <h1>Buddy's Dashboard</h1>
        </center>
        {/* Adjusted style to remove fixed positioning for the about icon */}
        <button
          onClick={goToInfoPage}
          style={{
            all: "unset",
            cursor: "pointer",
            display: "block", // Ensures it takes up its own line
            margin: "0 auto 20px", // Centers it and adds space below
          }}
        >
          <img src="/about.png" alt="About icon" className="lifebuddy-about" />
        </button>

        <br />
        <center>
          <img
            src="https://thumbs.dreamstime.com/b/vector-funny-cartoon-red-friendly-robot-character-isolated-white-background-kids-d-toy-chat-bot-icon-logo-design-template-117144509.jpg?w=768"
            alt="LifeBuddy Icon"
            className="lifebuddy-icon"
          />
        </center>

        {/* You might want to consider adding a MonitoringToggle here if it's relevant to the dashboard */}
        {userx?.userIdX && ( // Render only if user data is available
            <MonitoringToggle
                userId={userx.userIdX} // Assuming userIdX is the correct prop name for the toggle
                initialEnabled={userx.isMonitoringEnabled} // Assuming you have a field for this
            />
        )}


        {error && <p className="error">{error}</p>}

        <div className="activity-log">
          <h2>Buddy Logs</h2>
          {activities.length === 0 && !loading && !error && (
            <p>No logs yet.Buddy’s waiting for your antics!</p>
          )}
          {loading ? (
            <p>Loading Buddy logs...</p>
          ) : (
            <ul>
              {activities.map((activity) => (
                <li
                  key={activity.activityId}
                  className={`log-item ${activity.action
                    .toLowerCase()
                    .replace(" ", "-")}`}
                >
                  <strong>Buddy</strong> - {activity.action} I Am{" "}
                  <strong>{userx ? activity.buddyStatus : "Loading..."}</strong>
                  <br />
                  <small>{new Date(activity.timestamp).toLocaleString()}</small>
                  <br />
                  <p>{activity.details}</p>
                </li>
              ))}
            </ul>
          )}
          <br />
        </div>

        <div className="reply-section">
          <h2>Reply to Buddy</h2>
          <textarea
            value={replyMessage}
            onChange={(e) => setReplyMessage(e.target.value)}
            placeholder="What’s your wildest story for Buddy?"
            rows="4"
            cols="50"
          />
          <button
            onClick={handleReply}
            disabled={!userIdX || !replyMessage.trim() || !accessToken} // Disable if no accessToken
            style={{ background: "green", color: "white" }}
          >
            Send Reply
          </button>
          {replyStatus && (
            <p className={replyStatus.includes("Failed") ? "error" : "success"}>
              {replyStatus}
            </p>
          )}
        </div>
      </div>
    </>
  );
};

export default LifeBuddyDashboard;