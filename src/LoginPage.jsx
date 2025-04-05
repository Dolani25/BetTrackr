import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useState } from "react";
import "./LoginPage.css";

import { FaArrowLeft, FaLock, FaTimes, FaEye, FaEyeSlash } from "react-icons/fa";

import { useAlert } from "./AlertContext";

const LoginPage = ({ setIsAuthenticated }) => {
  const { showAlert } = useAlert();
  const { bookieName } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const bookie = location.state?.bookie || {};

  // Using a single state object for credentials
  const [credentials, setCredentials] = useState({ username: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);

  const togglePasswordVisibility = () => {
    setShowPassword((prev) => !prev);
  };

  const handleLogin = async (e) => {
    e.preventDefault();

    // Simulated authentication for testing
    if (credentials.username === "admin" && credentials.password === "password") {
      showAlert("Simulated admin login successful!");
      setIsAuthenticated(true);
      navigate("/dashboard");
      return;
    }

    // Real API authentication
    const payload = {
      bookie: bookie.name,
      username: credentials.username,
      password: credentials.password,
    };

    try {
      const response = await fetch("http://localhost:5000/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      console.log("Login response:", data);

      if (data.success) {
        setIsAuthenticated(true); // Mark user as authenticated
        navigate("/dashboard"); // Redirect on success
      } else {
        alert(data.message || "Invalid credentials!");
      }

    } catch (error) {
      console.error("Error logging in:", error);
      alert("Login failed. Try again.");
    }
  };

  return (
    <>
      <header>
        <button className="back-button" onClick={() => navigate(-1)}>
          <FaArrowLeft />
        </button>
            <div style={{display:"flex" , justifyContent:"center"}} id="logo">
      <img style={{height:"24px", marginRight:"7px" , width:"24px"}} src="/assets/dice.png" alt="BetTrackr" /> 
      <h style={{marginTop:"3px"}} >BetTrackr</h>
    </div>
        <button className="close-button">
          <FaTimes />
        </button>
      </header>

      <section id="sect">
        <img
          id="bookieLogo"
          src={bookie?.logo || "/default-logo.png"}
          alt={bookie?.name || "Bookie"}
          width="100"
        />
        <h2>{bookie?.name || "Unknown Bookie"}</h2>

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

            <button id="continue" type="submit">Login</button>

            <p style={{ display:"flex" , justifyContent:"center", fontSize: "70%", marginTop: "1.5vh", color: "#101010" }}>
              Login secured with trusted technologies &nbsp;
              <FaLock size={15} color="rgba(0,0,0,0.4)" />
            </p>
          </form>
        </div>
      </section>
    </>
  );
};

export default LoginPage;