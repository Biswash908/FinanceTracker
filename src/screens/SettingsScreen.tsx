"use client"

import { useState } from "react"
import { View, Text, StyleSheet, TouchableOpacity, Switch, ScrollView, Alert, Share } from "react-native"
import { authService } from "../services/auth-service"
import { useTheme } from "../context/ThemeContext"
import { MaterialIcons } from "@expo/vector-icons"

const SettingsScreen = () => {
  // Theme context
  const { isDarkMode, toggleTheme } = useTheme()

  // State
  const [currency, setCurrency] = useState("AED")
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Currency options
  const currencies = ["AED", "USD", "EUR", "GBP", "NPR", "INR"]

  // Change currency
  const changeCurrency = (newCurrency) => {
    setCurrency(newCurrency)
    // In a real app, you would update the app's currency setting
  }

  // Refresh token
  const refreshToken = async () => {
    try {
      setIsRefreshing(true)
      await authService.refreshToken()
      Alert.alert("Success", "Token refreshed successfully")
    } catch (error) {
      Alert.alert("Error", `Failed to refresh token: ${error.message}`)
    } finally {
      setIsRefreshing(false)
    }
  }

  // Export logs
  const exportLogs = async () => {
    try {
      // In a real app, you would gather logs from your logging system
      const logs = "Sample log data for demonstration purposes"

      await Share.share({
        message: logs,
        title: "App Logs",
      })
    } catch (error) {
      Alert.alert("Error", `Failed to export logs: ${error.message}`)
    }
  }

  // Render a setting item with a switch
  const renderSwitchSetting = (title, value, onValueChange, description = null) => (
    <View style={[styles.settingItem, isDarkMode && { borderBottomColor: "#444" }]}>
      <View style={styles.settingTextContainer}>
        <Text style={[styles.settingTitle, isDarkMode && { color: "#FFF" }]}>{title}</Text>
        {description && <Text style={[styles.settingDescription, isDarkMode && { color: "#AAA" }]}>{description}</Text>}
      </View>
      <View style={styles.themeIndicator}>
        {title === "Dark Mode" && (
          <View style={styles.themeIconContainer}>
            <MaterialIcons
              name={isDarkMode ? "dark-mode" : "light-mode"}
              size={20}
              color={isDarkMode ? "#FFC107" : "#FDB813"}
              style={styles.themeIcon}
            />
          </View>
        )}
        <Switch
          value={value}
          onValueChange={onValueChange}
          trackColor={{ false: "#767577", true: "#3498db" }}
          thumbColor={value ? "#fff" : "#f4f3f4"}
        />
      </View>
    </View>
  )

  // Render a setting item with a button
  const renderButtonSetting = (title, onPress, buttonText, description = null, loading = false) => (
    <View style={[styles.settingItem, isDarkMode && { borderBottomColor: "#444" }]}>
      <View style={styles.settingTextContainer}>
        <Text style={[styles.settingTitle, isDarkMode && { color: "#FFF" }]}>{title}</Text>
        {description && <Text style={[styles.settingDescription, isDarkMode && { color: "#AAA" }]}>{description}</Text>}
      </View>
      <TouchableOpacity
        style={[styles.settingButton, isDarkMode && { backgroundColor: "#2C5282" }]}
        onPress={onPress}
        disabled={loading}
      >
        <Text style={styles.settingButtonText}>{loading ? "Loading..." : buttonText}</Text>
      </TouchableOpacity>
    </View>
  )

  return (
    <ScrollView style={[styles.container, isDarkMode && { backgroundColor: "#121212" }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, isDarkMode && { color: "#FFF" }]}>Settings</Text>
      </View>

      {/* Appearance Section */}
      <View style={[styles.section, isDarkMode && { backgroundColor: "#1E1E1E", borderColor: "#333" }]}>
        <Text style={[styles.sectionTitle, isDarkMode && { color: "#FFF" }]}>Appearance</Text>

        {renderSwitchSetting("Dark Mode", isDarkMode, toggleTheme, "Switch between light and dark theme")}
      </View>

      {/* Preferences Section */}
      <View style={[styles.section, isDarkMode && { backgroundColor: "#1E1E1E", borderColor: "#333" }]}>
        <Text style={[styles.sectionTitle, isDarkMode && { color: "#FFF" }]}>Preferences</Text>

        <View style={[styles.settingItem, isDarkMode && { borderBottomColor: "#444" }]}>
          <View style={styles.settingTextContainer}>
            <Text style={[styles.settingTitle, isDarkMode && { color: "#FFF" }]}>Currency</Text>
            <Text style={[styles.settingDescription, isDarkMode && { color: "#AAA" }]}>
              Select your preferred currency
            </Text>
          </View>
        </View>

        <View style={styles.currencyOptions}>
          {currencies.map((curr) => (
            <TouchableOpacity
              key={curr}
              style={[
                styles.currencyOption,
                isDarkMode && { backgroundColor: "#333" },
                currency === curr && (isDarkMode ? { backgroundColor: "#2C5282" } : styles.selectedCurrencyOption),
              ]}
              onPress={() => changeCurrency(curr)}
            >
              <Text
                style={[
                  styles.currencyOptionText,
                  isDarkMode && { color: "#DDD" },
                  currency === curr && styles.selectedCurrencyOptionText,
                ]}
              >
                {curr}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Account Section */}
      <View style={[styles.section, isDarkMode && { backgroundColor: "#1E1E1E", borderColor: "#333" }]}>
        <Text style={[styles.sectionTitle, isDarkMode && { color: "#FFF" }]}>Account</Text>

        {renderButtonSetting("Refresh Token", refreshToken, "Refresh", "Get a new authentication token", isRefreshing)}
      </View>

      {/* Developer Section */}
      <View style={[styles.section, isDarkMode && { backgroundColor: "#1E1E1E", borderColor: "#333" }]}>
        <Text style={[styles.sectionTitle, isDarkMode && { color: "#FFF" }]}>Developer</Text>

        {renderButtonSetting("Export Logs", exportLogs, "Export", "Share app logs for debugging")}
      </View>

      {/* App Info */}
      <View style={styles.appInfo}>
        <Text style={[styles.appVersion, isDarkMode && { color: "#AAA" }]}>Version 1.0.0</Text>
        <Text style={[styles.appCopyright, isDarkMode && { color: "#777" }]}>© 2025 DragX's Meso Tracker</Text>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
    padding: 16,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#333",
  },
  section: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: "#eee",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 16,
  },
  settingItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  settingTextContainer: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    color: "#333",
    fontWeight: "500",
  },
  settingDescription: {
    fontSize: 14,
    color: "#666",
    marginTop: 4,
  },
  themeIndicator: {
    flexDirection: "row",
    alignItems: "center",
  },
  themeIconContainer: {
    marginRight: 10,
  },
  themeIcon: {
    marginRight: 4,
  },
  settingButton: {
    backgroundColor: "#3498db",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  settingButtonText: {
    color: "#fff",
    fontWeight: "500",
  },
  currencyOptions: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 8,
    marginBottom: 8,
  },
  currencyOption: {
    backgroundColor: "#f0f0f0",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    marginRight: 8,
    marginBottom: 8,
  },
  selectedCurrencyOption: {
    backgroundColor: "#3498db",
  },
  currencyOptionText: {
    fontSize: 14,
    color: "#333",
  },
  selectedCurrencyOptionText: {
    color: "#fff",
    fontWeight: "bold",
  },
  appInfo: {
    alignItems: "center",
    marginTop: 8,
    marginBottom: 24,
  },
  appVersion: {
    fontSize: 14,
    color: "#666",
  },
  appCopyright: {
    fontSize: 12,
    color: "#999",
    marginTop: 4,
  },
})

export default SettingsScreen
