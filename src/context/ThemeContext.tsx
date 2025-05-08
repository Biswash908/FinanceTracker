"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect } from "react"
import AsyncStorage from "@react-native-async-storage/async-storage"

// Define theme context type
type ThemeContextType = {
  isDarkMode: boolean
  toggleTheme: () => void
}

// Create context with default values
const ThemeContext = createContext<ThemeContextType>({
  isDarkMode: false,
  toggleTheme: () => {},
})

// Custom hook to use the theme context
export const useTheme = () => {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider")
  }
  return context
}

// Theme provider component
interface ThemeProviderProps {
  children: React.ReactNode
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [isLoaded, setIsLoaded] = useState(false)

  // Load theme preference from storage on mount
  useEffect(() => {
    const loadThemePreference = async () => {
      try {
        const storedTheme = await AsyncStorage.getItem("theme")
        if (storedTheme !== null) {
          setIsDarkMode(storedTheme === "dark")
        }
        setIsLoaded(true)
      } catch (error) {
        console.error("Failed to load theme preference:", error)
        setIsLoaded(true)
      }
    }

    loadThemePreference()
  }, [])

  // Toggle theme function
  const toggleTheme = async () => {
    const newTheme = !isDarkMode
    setIsDarkMode(newTheme)

    // Save theme preference to storage
    try {
      await AsyncStorage.setItem("theme", newTheme ? "dark" : "light")
    } catch (error) {
      console.error("Failed to save theme preference:", error)
    }
  }

  // Only render children after theme is loaded from storage
  if (!isLoaded) {
    return null
  }

  return <ThemeContext.Provider value={{ isDarkMode, toggleTheme }}>{children}</ThemeContext.Provider>
}
