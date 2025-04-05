import React from "react";

const Card = ({ children, className }) => {
  return (
    <div className={`p-4 border rounded-lg shadow-md bg-white ${className}`}>
      {children}
    </div>
  );
};

const CardHeader = ({ children }) => (
  <div className="border-b pb-2 mb-2 font-bold text-lg">{children}</div>
);

const CardTitle = ({ children }) => <h2 className="text-xl font-bold">{children}</h2>;

const CardContent = ({ children }) => <div>{children}</div>;

export { Card, CardHeader, CardTitle, CardContent };