import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useState, useRef, useEffect } from "react";
import toast from 'react-hot-toast';
import "./LoginPage.css";
import { FaArrowLeft, FaLock, FaTimes, FaEye, FaEyeSlash } from "react-icons/fa";
import { useAlert } from "./AlertContext";
import FooterLinks from "./components/FooterLinks";
import WavyProgress from "./components/WavyProgress";

const LoginPage = ({ setIsAuthenticated, setActiveBookie }) => {
  const { showAlert } = useAlert();
  const { bookieName } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const bookie = location.state?.bookie || {};
  const abortControllerRef = useRef(null);

  // Using a single state object for credentials
  const [credentials, setCredentials] = useState({ username: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  const intervalRef = useRef(null);
  const isSubmittingRef = useRef(false);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const togglePasswordVisibility = () => {
    setShowPassword((prev) => !prev);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;

    if (intervalRef.current) clearInterval(intervalRef.current);
    setIsLoading(true);
    setProgress(0);

    const toastId = toast.loading('Connecting...');

    // Abort any existing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    // Real API authentication
    const payload = {
      bookie: bookie.name,
      username: credentials.username,
      password: credentials.password,
    };

    const existingToken = localStorage.getItem('bt_token');

    // Poll for real-time progress while waiting for POST /api/login to resolve
    intervalRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/progress/${bookie.name}/${credentials.username}`);
        const data = await res.json();
        if (data.success && data.progress > 0) {
          setProgress(data.progress);
          if (data.message) {
            toast.loading(data.message, { id: toastId });
          }
        }
      } catch (err) { }
    }, 1000);

    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": existingToken ? `Bearer ${existingToken}` : ""
        },
        body: JSON.stringify(payload),
        signal: abortControllerRef.current.signal
      });

      const data = await response.json();
      console.log("Login response:", data);

      if (data.success) {
        clearInterval(intervalRef.current);
        setProgress(100);
        toast.success(data.early ? "Login Successful!" : "Logged in!", { id: toastId });

        // Store session info
        if (data.token) {
          localStorage.setItem('bt_token', data.token);
          localStorage.setItem('bt_userId', data.userId || data.userid);
        }
        if (data.balance !== undefined) {
          localStorage.setItem('bt_balance', data.balance);
        }
        if (data.nickname) {
          localStorage.setItem('bt_nickname', data.nickname);
        }

        setTimeout(() => {
          setIsAuthenticated(true); // Mark user as authenticated
          setActiveBookie(bookie.name); // Store active bookie
          navigate("/dashboard"); // Redirect on success
        }, 600); // Short delay to see 100% completion
      } else {
        clearInterval(intervalRef.current);
        setIsLoading(false);
        toast.error(data.message || "Invalid credentials!", { id: toastId });
      }

    } catch (error) {
      clearInterval(intervalRef.current);
      setIsLoading(false);

      if (error.name === 'AbortError') {
        console.log("Login request cancelled");
        toast.dismiss(toastId);
        return;
      }
      console.error("Error logging in:", error);
      toast.error("Login failed. Try again.", { id: toastId });
    } finally {
      abortControllerRef.current = null;
      isSubmittingRef.current = false;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <header>
        <button className="back-button" onClick={() => navigate(-1)}>
          <FaArrowLeft />
        </button>
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center" }} id="logo">
          <img style={{ height: "24px", marginRight: "7px", width: "24px" }} src="/assets/dice.png" alt="BetTrackr" />
          <span style={{ fontWeight: 600, color: "#707070", fontSize: "1.1rem" }}>BetTrackr</span>
        </div>
        <button className="close-button">
          <FaTimes />
        </button>
      </header>

      <section id="sect" style={{ flex: 1 }}>
        <div style={{ position: 'relative', width: '9vh', height: '9vh', margin: '0 auto 3vh auto', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          {isLoading && (
            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <WavyProgress progress={progress} size="12vh" color={bookie?.name === 'SportyBet' ? '#e3001b' : '#21409A'} trackColor="rgba(0,0,0,0.05)" />
            </div>
          )}
          <img
            id="bookieLogo"
            src={bookie?.logo || "/default-logo.png"}
            alt={bookie?.name || "Bookie"}
            style={{ margin: 0, position: 'relative', zIndex: 2 }}
          />
        </div>
        <h2 style={{ marginTop: 0 }}>{bookie?.name || "Unknown Bookie"}</h2>

        <div className="login2">
          <form onSubmit={handleLogin}>
            <input
              type="text"
              placeholder="Username"
              value={credentials.username}
              onChange={(e) =>
                setCredentials({ ...credentials, username: e.target.value })
              }
              required
            />

            <div className="password-container">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                value={credentials.password}
                onChange={(e) =>
                  setCredentials({ ...credentials, password: e.target.value })
                }
                required
              />
              <button
                type="button"
                className="toggle-password"
                onClick={togglePasswordVisibility}
              >
                {showPassword ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>

            <button
              id="continue"
              type="submit"
              disabled={isLoading}
              style={{ opacity: isLoading ? 0.7 : 1, cursor: isLoading ? 'not-allowed' : 'pointer' }}
            >
              {isLoading ? "Logging in..." : "Login"}
            </button>

            <p style={{ display: "flex", justifyContent: "center", fontSize: "70%", marginTop: "1.5vh", color: "#101010" }}>
              Login secured with trusted technologies &nbsp;
              <FaLock size={15} color="rgba(0,0,0,0.4)" />
            </p>
          </form>
        </div>
      </section>
      <FooterLinks />
    </div>
  );
};

export default LoginPage;