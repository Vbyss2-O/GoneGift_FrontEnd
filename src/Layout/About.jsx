import React from "react";
import "./About.css";

const AboutGoneGift = () => {
  return (
    <div className="aboutgonegift-container">
      <h1 className="aboutgonegift-title">About GoneGift</h1>
      <p className="aboutgonegift-intro">
        GoneGift helps people preserve personal memories and securely deliver
        them to trusted beneficiaries at the right time.
      </p>

      <div className="aboutgonegift-content">
        <ul className="aboutgonegift-list">
          <li>
            <strong>Purpose:</strong> Preserve letters, voice notes, photos, and
            personal files so your story remains available to your loved ones.
          </li>
          <li>
            <strong>Privacy First:</strong> Each account is protected with a
            unique encrypted credential. Only trusted beneficiaries with the
            correct credential can access content.
          </li>
          <li>
            <strong>Meaningful Delivery:</strong> Content can be prepared in
            advance and delivered securely when the release process is
            triggered.
          </li>
          <li>
            <strong>Shared Space:</strong> Families can build a collective memory
            archive together in one secure location.
          </li>
          <li>
            <strong>LifeBuddy Monitoring:</strong> A phased check-in process helps
            confirm inactivity before any delivery workflow begins.
          </li>
          <li>
            <strong>End-to-End Encryption:</strong> Content remains encrypted until
            authorized beneficiaries decrypt it.
          </li>
        </ul>

        <p className="aboutgonegift-signature">
          — Vedant Kasar, Founder
        </p>
      </div>
    </div>
  );
};

export default AboutGoneGift;
