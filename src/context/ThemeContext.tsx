"use client"

import type React from "react"
import { createContext, useState, useContext, useEffect } from "react"
import { useColorScheme } from "react-native"

// Define theme type
type ThemeType = "light" | "dark"

// Create context
interface ThemeContextType {
  theme: ThemeType
  toggleTheme: () => void
  isDarkMode: boolean
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

// Theme provider component
export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Get device color scheme
  const deviceTheme = useColorScheme() as ThemeType

  // Initialize theme state with device preference
  const [theme, setTheme] = useState<ThemeType>(deviceTheme || "light")

  // Update theme if device preference changes
  useEffect(() => {
    if (deviceTheme) {
      setTheme(deviceTheme)
    }
  }, [deviceTheme])

  // Toggle theme function
  const toggleTheme = () => {
    setTheme((prevTheme) => (prevTheme === "light" ? "dark" : "light"))
  }

  // Check if current theme is dark
  const isDarkMode = theme === "dark"

  return <ThemeContext.Provider value={{ theme, toggleTheme, isDarkMode }}>{children}</ThemeContext.Provider>
}

// Custom hook to use theme
export const useTheme = () => {
  const context = useContext(ThemeContext)

  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider")
  }

  return context
}
