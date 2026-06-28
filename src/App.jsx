import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { useState } from "react";
import BookieSelection from "./BookieSelection";
import LoginPage from "./LoginPage";
import Dashboard from "./Dashboard";
import ProtectedRoute from "./ProtectedRoute";
import { AlertProvider, useAlert } from "./AlertContext";



import { Toaster } from 'react-hot-toast';

import DocumentViewer from "./pages/DocumentViewer";

const App = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    // Initial check for token
    return !!localStorage.getItem('bt_token');
  });
  const [activeBookie, setActiveBookie] = useState('sportybet'); // Default or empty

  return (
    <AlertProvider>
      <Toaster
        position="bottom-center"
        toastOptions={{
          style: {
            background: '#1a1a1a',
            color: '#fff',
            borderRadius: '50px',
            border: '1px solid #333',
            padding: '12px 24px',
          },
        }}
      />
      <Router>
        <Routes>
          {/* First page */}
          <Route path="/" element={<BookieSelection />} />

          {/* Document routes */}
          <Route path="/docs/:docName" element={<DocumentViewer />} />

          {/* Login route */}
          <Route
            path="/login/:bookieName"
            element={<LoginPage setIsAuthenticated={setIsAuthenticated} setActiveBookie={setActiveBookie} />}
          />

          {/* Protected Dashboard Route */}
          <Route element={<ProtectedRoute isAuthenticated={isAuthenticated} />}>
            <Route path="/dashboard" element={<Dashboard activeBookie={activeBookie} />} />
          </Route>

          {/* Redirect unknown routes to login */}
          {/* <Route path="*" element={<Navigate to="/login" />} /> */}
        </Routes>
      </Router>
    </AlertProvider>
  );
};

export default App;