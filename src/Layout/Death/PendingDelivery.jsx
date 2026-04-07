import BackButton from "../components/BackButton";
import "./PlaceholderPage.css";

const PendingDelivery = () => {
    return (
        <>
            <BackButton />
            <div className="placeholder-page">
                <h1>Pending Delivery</h1>
                <p>Your delivery is on its way.</p>
                <p>Please wait for further updates.</p>
            </div>
        </>
    );
};

export default PendingDelivery;