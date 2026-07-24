import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../Death/supabaseClient";
import "./GoogleLoginPage.css"; // Import your CSS styles
import { Link } from "react-router-dom";
import { getAppUrl } from "../../config/env";

// === PLUG-AND-PLAY BACKGROUND IMAGES ===
// Add/replace URLs here. The component tries each in order and uses the
// first one that actually loads in the browser. If all fail, the CSS
// gradient fallback in .hero-bg is shown instead — never a broken icon.
// Current set: grandparents AND grandchildren together, bonding over a
// device — full family, spanning generations, with a clear tech element
// tying back to GoneGift's "pass on your digital legacy" mission.
const HERO_IMAGES = [
  "https://images.pexels.com/photos/7489063/pexels-photo-7489063.jpeg?auto=compress&cs=tinysrgb&w=1600&h=1000&fit=crop",
  "https://images.pexels.com/photos/8185853/pexels-photo-8185853.jpeg?auto=compress&cs=tinysrgb&w=1600&h=1000&fit=crop",
  "https://images.pexels.com/photos/8307628/pexels-photo-8307628.jpeg?auto=compress&cs=tinysrgb&w=1600&h=1000&fit=crop",
];


const GoogleLoginPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [loggingIn, setLoggingIn] = useState(false);
  const [bgUrl, setBgUrl] = useState(null);
  const [bgLoaded, setBgLoaded] = useState(false);

  // Preload hero images in order, use the first one that loads successfully.
  // Perf-only additions vs. before: preconnect to the image CDN so the
  // very first request doesn't pay DNS/TLS setup on top of the fetch, and
  // a fetchPriority hint so the visible image isn't queued behind
  // lower-importance requests. The try-in-order fallback logic itself is
  // unchanged.
  useEffect(() => {
    let cancelled = false;

    const preconnectHref = "https://images.pexels.com";
    if (!document.querySelector(`link[rel="preconnect"][href="${preconnectHref}"]`)) {
      const link = document.createElement("link");
      link.rel = "preconnect";
      link.href = preconnectHref;
      link.crossOrigin = "anonymous";
      document.head.appendChild(link);
    }

    const tryLoad = (index) => {
      if (index >= HERO_IMAGES.length || cancelled) return;

      const img = new Image();
      img.decoding = "async";
      img.fetchPriority = index === 0 ? "high" : "low";
      img.onload = () => {
        if (cancelled) return;
        setBgUrl(HERO_IMAGES[index]);
        setBgLoaded(true);
      };
      img.onerror = () => {
        if (cancelled) return;
        tryLoad(index + 1); // fall through to the next candidate
      };
      img.src = HERO_IMAGES[index];
    };

    tryLoad(0);

    return () => {
      cancelled = true;
    };
  }, []);

  // Handle post-login email check and navigation
  const handlePostLogin = async () => {
    try {
      setLoggingIn(true); // keep UI in loading state during checks
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        console.error("No user authenticated or error:", userError?.message);
        navigate("/login");
        return;
      }

      // check if profile details have been filled out yet
      const { data: existingUser, error: fetchError } = await supabase
        .from("death_user")
        .select("user_role, first_name")
        .eq("email", user.email)
        .maybeSingle();

      if (fetchError) {
        console.error("Error checking death_user:", fetchError.message);
        navigate("/login");
        return;
      }

      if (existingUser) {
        if (!existingUser.first_name || existingUser.first_name.trim() === "") {
          navigate("/primaryinfo");
          return;
        }
        navigate("/death-dashboard");
        return;
      }

      // New user: upsert into death_user and redirect to /primaryinfo
      const { error: upsertError } = await supabase.from("death_user").upsert(
        {
          user_idx: user.id,
          email: user.email,
          user_role: "general",
        },
        { onConflict: "email" }
      );

      if (upsertError) {
        console.error("Error upserting user:", upsertError.message);
        navigate("/login");
        return;
      }

      navigate("/primaryinfo");
    } catch (err) {
      console.error("Error in post-login flow:", err.message);
      navigate("/login");
    } finally {
      setLoggingIn(false);
      setLoading(false);
    }
  };

  useEffect(() => {
    const checkSession = async () => {
      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
          setLoading(false);
          return;
        }
        await handlePostLogin();
      } catch (err) {
        console.error("Error checking session:", err.message);
        setLoading(false);
        navigate("/login");
      }
    };

    checkSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) {
        handlePostLogin();
      } else if (event === "SIGNED_OUT") {
        setLoading(false);
        navigate("/login");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleGoogleLogin = async () => {
    setLoggingIn(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session) {
        await handlePostLogin();
        return;
      }

      const redirectUrl = getAppUrl("/login");
      await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: redirectUrl,
          scopes: "email profile",
        },
      });
    } catch (error) {
      console.error("Google login error:", error.message);
      setLoggingIn(false);
    }
  };

  if (loading || loggingIn) {
    return (
      <div className="session-loading-screen" role="status" aria-live="polite">
        <div className="session-loading-spinner"></div>
        <p className="session-loading-text">
          {loggingIn ? "Authenticating..." : "Checking session..."}
        </p>
      </div>
    );
  }

  return (
    <div className="login-container">
      {/* Full-page immersive hero — background image + overlay + header + card */}
      <div className="hero-bg">
        <div
          className={`hero-bg-image${bgLoaded ? " is-loaded" : ""}`}
          style={bgUrl ? { backgroundImage: `url(${bgUrl})` } : undefined}
          role="img"
          aria-label="Grandparents and grandchildren bonding together over technology, spanning generations of family"
        />
        <div className="hero-overlay"></div>

        {/* Subtle floating accents */}
        <span className="floating-orb orb-1"></span>
        <span className="floating-orb orb-2"></span>
        <span className="floating-orb orb-3"></span>
        <span className="floating-orb orb-4"></span>

        {/* Glass header */}
        <header className="glass-header">
          <span className="logo-text">GoneGift</span>
          <nav className="nav">
            <Link to="/feathers">Features</Link>
            <Link to="/about">About</Link>
          </nav>
        </header>

        {/* Centered login card */}
        <div className="hero-center">
          <div className="login-card">
            <div className="login-header">
              <h1 className="login-title">Welcome back</h1>
              <p className="login-subtitle">
                Sign in with Google to continue to GoneGift.
              </p>
            </div>

            <div className="login-form">
              <button
                className="google-login-btn"
                onClick={handleGoogleLogin}
                disabled={loggingIn}
              >
                {loggingIn ? (
                  <div className="spinner-button"></div>
                ) : (
                  <>
                    <svg
                      className="google-icon"
                      viewBox="0 0 24 24"
                      width="20"
                      height="20"
                    >
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      />
                    </svg>
                    Continue with Google
                  </>
                )}
              </button>

              <div className="divider">
                <span>or</span>
              </div>

              <div className="alternative-login">
                <p className="alternative-text">
                  Need help? <Link to="/help">Visit our help center</Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer — a fully separate section, not overlaid on the hero */}
      <footer className="footer-cool">
        <div className="footer-top">
          <div className="footer-brand">
            <h3>GoneGift</h3>
            <p>Creating meaningful connections beyond time.</p>
            <div className="footer-social">
              <a href="#" aria-label="Instagram">
                <svg width="24" height="24" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M7 2C4.243 2 2 4.243 2 7v10c0 2.757 2.243 5 5 5h10c2.757 0 5-2.243 5-5V7c0-2.757-2.243-5-5-5H7zm0 2h10c1.654 0 3 1.346 3 3v10c0 1.654-1.346 3-3 3H7c-1.654 0-3-1.346-3-3V7c0-1.654 1.346-3 3-3zm5 3a5 5 0 100 10 5 5 0 000-10zm0 2a3 3 0 110 6 3 3 0 010-6zm4.5-.5a1 1 0 100 2 1 1 0 000-2z" />
                </svg>
              </a>
              <a href="#" aria-label="LinkedIn">
                <svg width="24" height="24" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M4.98 3.5C4.98 4.88 3.86 6 2.5 6S0 4.88 0 3.5 1.12 1 2.5 1s2.48 1.12 2.48 2.5zM0 8h5v15H0V8zm7 0h4.6v2.2h.1c.64-1.2 2.2-2.5 4.4-2.5 4.7 0 5.6 3.1 5.6 7.1V23H17v-6.8c0-1.6 0-3.7-2.2-3.7-2.2 0-2.5 1.8-2.5 3.6V23H7V8z" />
                </svg>
              </a>
            </div>
          </div>

          <div className="footer-links-col">
            <h4>Product</h4>
            <ul>
              <li><a href="/updateAndPlans">Updates & Plans</a></li>
              <li><Link to="/feathers">Features</Link></li>
            </ul>
          </div>

          <div className="footer-links-col">
            <h4>Support</h4>
            <ul>
              <li><Link to="/help">Help</Link></li>
              <li><Link to="/userGuides">User Guides</Link></li>
              <li><Link to="/community">Community</Link></li>
            </ul>
          </div>

          <div className="footer-links-col">
            <h4>Legal</h4>
            <ul>
              <li><Link to="/privacy">Privacy Policy</Link></li>
            </ul>
          </div>
        </div>

        <div className="footer-bottom">
          <p>&copy; 2025 GoneGift. All rights reserved.</p>
          <p>Made with care for preserving memories</p>
        </div>
      </footer>
    </div>
  );
};
export default GoogleLoginPage;