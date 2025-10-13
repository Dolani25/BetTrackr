import { createContext, useContext, useState } from "react";
import Alerty from "./Alerty";

const AlertContext = createContext();

export const AlertProvider = ({ children }) => {
  const [alertText, setAlertText] = useState("");
  const [isVisible, setIsVisible] = useState(false);

  const showAlert = (text) => {
    setAlertText(text);
    setIsVisible(true);

    setTimeout(() => {
      setIsVisible(false);
    }, 3000); // Hide alert after 3 seconds
  };

  return (
    <AlertContext.Provider value={{ showAlert }}>
      {children}
      {isVisible && <Alerty text={alertText} />}
    </AlertContext.Provider>
  );
};

export const useAlert = () => {
  return useContext(AlertContext);
};