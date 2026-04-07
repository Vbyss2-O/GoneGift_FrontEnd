import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "./supabaseClient";
import BackButton from "../components/BackButton";
import "./BeneficiaryList.css";

import { getApiUrl } from "../../config/env";

const BeneficiaryList = () => {
  const navigate = useNavigate();
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [beneficiaries, setBeneficiaries] = useState([]);
  const [accessToken, setAccessToken] = useState(null);

  useEffect(() => {
    const initAuth = async () => {
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        console.error("Error getting session:", error);
        // Do not navigate to login here, as user might just not be logged in yet,
        // and fetchUserData will handle the redirect.
        return;
      }

      const accessToken = data.session?.access_token;

      if (accessToken) {
        setAccessToken(accessToken);
      } else {
        console.warn("No access token found—user probably signed out.");
        // If no access token, and not loading, we might need to redirect to login
        // but let fetchUserData handle this for consistency with user checks.
      }
    };

    initAuth();
  }, []); // This runs once on component mount to get the initial session

  useEffect(() => {
    const fetchUserDataAndBeneficiaries = async () => {
      setLoading(true); // Set loading true at the start of this main fetch operation
      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
          console.error(
            "Error fetching user:",
            userError?.message || "No user found"
          );
          navigate("/login");
          return;
        }

        const { data: existingUser, error: fetchError } = await supabase
          .from("death_user")
          .select("first_name, lastname, user_role, user_idx")
          .eq("user_idx", user.id)
          .limit(1)
          .maybeSingle();

        if (fetchError || !existingUser) {
          console.error(
            "Error fetching user data from death_user table:",
            fetchError?.message || "User not found in death_user table"
          );
          navigate("/login");
          return;
        }

        setUserData({
          userIdX: user.id,
          email: user.email,
          firstName: existingUser.first_name,
          lastname: existingUser.lastname,
          deathUserId: existingUser.user_idx, // Using user_idx instead of id
        });

        // ONLY call fetchBeneficiaries IF accessToken is available
        // and if existingUser.user_idx is available
        if (accessToken && existingUser.user_idx) {
          await fetchBeneficiaries(existingUser.user_idx);
        } else if (!accessToken) {
            console.warn("Waiting for accessToken to be set before fetching beneficiaries.");
            // We set loading to false here, but the user data is available.
            // Beneficiaries will load when accessToken changes.
            setLoading(false);
            return;
        }


      } catch (error) {
        console.error("Error in fetchUserDataAndBeneficiaries:", error.message);
        setError(error.message); // Set error state if something goes wrong here
        navigate("/login"); // Redirect on critical errors
      } finally {
        // Ensure loading is set to false only if we're not waiting for accessToken
        if (accessToken) { // Only set false if accessToken is present (meaning fetchBeneficiaries was attempted or user is logged out)
            setLoading(false);
        }
      }
    };

    // Call the combined function
    fetchUserDataAndBeneficiaries();
  }, [navigate, accessToken]); // Dependency on accessToken is crucial here

  const fetchBeneficiaries = async (userId) => {
    try {
      setError(null); // Clear previous errors
      if (!accessToken) {
        console.warn("Attempted to fetch beneficiaries without an access token.");
        setError("Authentication required. Please log in.");
        setBeneficiaries([]);
        return;
      }

      const response = await fetch(
        `${getApiUrl("")}/api/deathusers/listOfBeneficiary/${userId}`,
        {
          headers: {
          },
        }
      );

      if (!response.ok) {
        if (response.status === 404) {
          setBeneficiaries([]);
          return;
        }
        const errorText = await response.text();
        let errorMessage = `Failed to fetch beneficiaries: ${response.statusText}`;
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.error || errorMessage;
        } catch (parseError) {
          errorMessage = errorText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        const data = await response.json();
        const beneficiaryArray = Array.isArray(data) ? data : (data ? [data] : []);
        setBeneficiaries(beneficiaryArray);
      } else {
        setBeneficiaries([]);
        console.warn("Received non-JSON response for beneficiaries list.");
      }
    } catch (error) {
      console.error("Error fetching beneficiaries:", error);
      setError(error.message);
      setBeneficiaries([]);
    }
  };

  const removeBeneficiary = async (beneficiaryId) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this beneficiary?"
    );
    if (!confirmDelete) return;

    try {
        if (!accessToken) {
            alert("Not authenticated. Please log in.");
            navigate("/login"); // Or handle re-authentication
            return;
        }
      const response = await fetch(
        `${getApiUrl("")}/api/beneficiaries/${beneficiaryId}`,
        {
          method: "DELETE",
          headers: {
          },
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = "Failed to delete beneficiary";
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.error || errorMessage;
        } catch (parseError) {
          errorMessage = errorText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      // Refresh the list after deletion
      if (userData?.deathUserId) {
        await fetchBeneficiaries(userData.deathUserId);
      }
    } catch (error) {
      console.error("Error deleting beneficiary:", error);
      alert(`Failed to delete beneficiary: ${error.message}. Try again.`);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <>
      <BackButton />
      <div className="beneficiary-list-container">
        <h2>
          Welcome, {userData?.firstName} {userData?.lastname}
        </h2>
        <h3>Your Beneficiaries:</h3>

        {error && <div className="error-message">Error: {error}</div>}

        {beneficiaries.length === 0 ? (
          <p className="beneficiary-empty">No beneficiaries found.</p>
        ) : (
          <ul className="beneficiary-list">
            {beneficiaries.map((ben) => (
              <li key={ben.id} className="beneficiary-item">
                <div className="beneficiary-info">
                  <strong>Name:</strong> {ben.name} <br />
                  <strong>Email:</strong> {ben.email}
                </div>
                <button
                  onClick={() => removeBeneficiary(ben.id)}
                  className="remove-button"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}

      </div>
    </>
  );
};

export default BeneficiaryList;