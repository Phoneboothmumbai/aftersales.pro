import React, { createContext, useContext, useState, useEffect } from "react";

const ThemeContext = createContext(null);

export const ThemeProvider = ({ children }) => {
  // Always default to light theme
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem("theme");
    // Force light theme, ignore saved preference
    return "light";
  });

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add("light"); // Always light
    localStorage.setItem("theme", "light");
  }, [theme]);

  const toggleTheme = () => {
    // Disabled - always light
    // setTheme((prev) => (prev === "light" ? "dark" : "light"));
  };

  return (
    <ThemeContext.Provider value={{ theme: "light", setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};
