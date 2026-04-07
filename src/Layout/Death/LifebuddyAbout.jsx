import BackButton from "../components/BackButton";
import "./LifebuddyAbout.css";

const LifeBuddyAbout = () => {
  return (
    <>
      <BackButton />
      <div className="lifebuddyabout-container">
        <h1 className="lifebuddyabout-title">What is LifeBuddy?</h1>
        <p className="lifebuddyabout-desc">
          <strong>LifeBuddy</strong> is a digital check-in system designed to monitor your well-being through periodic interactions. If you don't respond over time, your buddy status progresses through different stages to ensure you're okay.
        </p>

        <h2 className="lifebuddyabout-subtitle">How it Works:</h2>
        <ul className="lifebuddyabout-list">
          <li>
            <span className="lifebuddyabout-stage">CHILLING:</span> The default state. You're considered active. No alerts till 90 days no activity.
          </li>
          <li>
            <span className="lifebuddyabout-stage">CHILLING1:</span> After 95 days of no activity, LifeBuddy sends a first check-in message. If you don't respond, the system escalates.
          </li>
          <li>
            <span className="lifebuddyabout-stage">CURIOUS:</span> After 110 days of no activity and no response, another message is sent expressing concern.
          </li>
          <li>
            <span className="lifebuddyabout-stage">WORRIED:</span> After 120 days no Response, LifeBuddy sends a stronger warning and checks again.
          </li>
          <li>
            <span className="lifebuddyabout-stage">GOODBYE:</span> After 140 days no Response, LifeBuddy assumes something may have gone seriously wrong and sends a goodbye notification.
          </li>
          <li>
            <span className="lifebuddyabout-stage">Deceased Trigger:</span> If no activity even after the goodbye message and the system confirms no response, it marks you as deceased and triggers a digital death protocol.
          </li>
        </ul>

        <p className="lifebuddyabout-note">
          You can always reset your state to <span className="lifebuddyabout-stage">CHILLING</span> by interacting with LifeBuddy during any stage.
        </p>
      </div>
    </>
  );
};

export default LifeBuddyAbout;