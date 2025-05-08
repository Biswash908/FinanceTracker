"use client"

import type React from "react"
import { TouchableOpacity, Text, StyleSheet } from "react-native"
import { useTheme } from "../context/ThemeContext"
import { MaterialIcons } from "@expo/vector-icons"

const ThemeToggle: React.FC = () => {
  const { isDarkMode, toggleTheme } = useTheme()

  return (
    <TouchableOpacity style={styles.container} onPress={toggleTheme}>
      <MaterialIcons
        name={isDarkMode ? "light-mode" : "dark-mode"}
        size={20}
        color={isDarkMode ? "#FFC107" : "#3498db"}
      />
      <Text style={[styles.text, isDarkMode && { color: "#FFC107" }]}>{isDarkMode ? "Light Mode" : "Dark Mode"}</Text>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    padding: 8,
    borderRadius: 20,
    backgroundColor: "transparent",
  },
  text: {
    marginLeft: 8,
    fontSize: 14,
    color: "#3498db",
  },
})

export default ThemeToggle
