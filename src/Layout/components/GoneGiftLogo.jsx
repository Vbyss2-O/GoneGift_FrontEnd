import React from 'react';
import './GoneGiftLogo.css'; // Import the CSS file

const GoneGiftLogo = () => {
  return (
    <div className="gonegift-logo" aria-label="GoneGift brand">
      <img
        src="/gonegift.png"
        alt="GoneGift logo"
        className="gonegift-logo-image"
      />
      <h2 className="logo-glitch" data-text="GoneGift">
        GoneGift
      </h2>
    </div>
  );
};

export default GoneGiftLogo;