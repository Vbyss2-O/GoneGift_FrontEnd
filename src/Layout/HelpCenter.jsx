import React from "react";
import "./HelpCenter.css";

const UserGuides = () => {
  return (
    <div className="userguides-container">
      <h1 className="userguides-title">Help Center</h1>

      <p className="userguides-desc">
        Welcome to GoneGift. Use the guide below for a clear, secure setup and
        account workflow.
      </p>

      <ul className="userguides-list">
        <li>
          <strong>Create Your Account:</strong> Sign in securely and store your
          unique credential in a safe private location.
        </li>
        <li>
          <strong>Upload Memories:</strong> Add files, letters, and voice notes
          that you want to preserve for beneficiaries.
        </li>
        <li>
          <strong>Set Beneficiaries:</strong> Select trusted contacts who can
          receive your protected content.
        </li>
        <li>
          <strong>Use Shared Space:</strong> Collaborate with family members to
          build a shared memory archive.
        </li>
        <li>
          <strong>Check Monitoring Status:</strong> LifeBuddy performs phased
          check-ins to confirm account activity.
        </li>
        <li>
          <strong>Secure Delivery:</strong> If triggered, encrypted content is
          delivered only through authorized beneficiary access.
        </li>
      </ul>

      <p className="userguides-contact">
        For additional assistance, contact support through the Help section.
      </p>
    </div>
  );
};

export default UserGuides;