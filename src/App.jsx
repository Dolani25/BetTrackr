import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { useState } from "react";
import BookieSelection from "./BookieSelection";
import LoginPage from "./LoginPage"; 
import Dashboard from "./Dashboard";
import ProtectedRoute from "./ProtectedRoute";
import { AlertProvider, useAlert } from "./AlertContext";

const App = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  return (
    <AlertProvider>
      <Router>
        <Routes>
          {/* First page */}
          <Route path="/" element={<BookieSelection />} />
          
          {/* Login route */}
          <Route 
            path="/login/:bookieName" 
            element={<LoginPage setIsAuthenticated={setIsAuthenticated} />} 
          />
          
          {/* Protected Dashboard Route */}
          <Route element={<ProtectedRoute isAuthenticated={isAuthenticated} />}>
            <Route path="/dashboard" element={<Dashboard />} />
          </Route>

          {/* Redirect unknown routes to login */}
          {/* <Route path="*" element={<Navigate to="/login" />} /> */}
        </Routes>
      </Router>
    </AlertProvider>
  );
};

export default App;