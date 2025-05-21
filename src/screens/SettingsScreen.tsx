"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { View, Text, StyleSheet, TouchableOpacity, Switch, ScrollView, Alert, ActivityIndicator } from "react-native"
import { useTheme } from "../context/ThemeContext"
import { MaterialIcons } from "@expo/vector-icons"
import AsyncStorage from "@react-native-async-storage/async-storage"

const SettingsScreen = () => {
  const { isDarkMode, toggleTheme } = useTheme()
  const [isLoading, setIsLoading] = useState(false)
  const [notificationsEnabled, setNotificationsEnabled] = useState(true)
  const [biometricsEnabled, setBiometricsEnabled] = useState(false)

  // State
  const [currency, setCurrency] = useState("AED")
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [customerId, setCustomerId] = useState(null)

  // Load customer ID on mount
  useEffect(() => {
    const loadCustomerId = async () => {
      try {
        const storedCustomerId = await AsyncStorage.getItem("customerId")
        if (storedCustomerId) {
          setCustomerId(storedCustomerId)
        }
      } catch (error) {
        console.error("Error loading customer ID:", error)
      }
    }

    loadCustomerId()
  }, [])

  // Connect bank account
const connectBankAccount = async () => {
  try {
    // Store a flag to trigger the Lean WebView in App.tsx
    await AsyncStorage.setItem("triggerLeanConnect", "true")
    
    // Show a message to the user
    Alert.alert("Connect Bank Account", "Opening bank connection interface...", [{ text: "OK" }])
  } catch (error) {
    console.error("Error triggering bank connection:", error)
    Alert.alert("Error", "Failed to initiate bank connection. Please try again.")
  }
}

  // Connect bank account - this will be called from the UI
  const handleConnectBank = () => {
    // This function should trigger the Lean SDK connection
    // The actual implementation will be in App.tsx with the Lean SDK ref
    Alert.alert("Connect Bank Account", "This will open the Lean SDK to connect your bank account.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Connect",
        onPress: async () => {
          // We'll store a flag to trigger the Lean SDK in App.tsx
          await AsyncStorage.setItem("triggerLeanConnect", "true")
          // This will be picked up by App.tsx to trigger the Lean SDK
        },
      },
    ])
  }

  const handleLogout = async () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        onPress: async () => {
          setIsLoading(true)
          try {
            // Simulate API call
            await new Promise((resolve) => setTimeout(resolve, 1000))
            await AsyncStorage.removeItem("userToken")
            // Force app reload or navigation reset
            // This will be handled by the auth state in App.tsx
          } catch (error) {
            console.error("Logout error:", error)
            Alert.alert("Error", "Failed to logout. Please try again.")
          } finally {
            setIsLoading(false)
          }
        },
      },
    ])
  }

  const renderSettingItem = (
    icon: string,
    title: string,
    description: string,
    action: React.ReactNode,
    onPress?: () => void,
  ) => (
    <TouchableOpacity
      style={[styles.settingItem, isDarkMode && { borderBottomColor: "#333" }]}
      onPress={onPress}
      disabled={!onPress}
    >
      <View style={[styles.settingIcon, isDarkMode && { backgroundColor: "#333" }]}>
        <MaterialIcons name={icon} size={24} color={isDarkMode ? "#3498db" : "#3498db"} />
      </View>
      <View style={styles.settingContent}>
        <Text style={[styles.settingTitle, isDarkMode && { color: "#FFF" }]}>{title}</Text>
        <Text style={[styles.settingDescription, isDarkMode && { color: "#AAA" }]}>{description}</Text>
      </View>
      {action}
    </TouchableOpacity>
  )

  const renderButtonSetting = (title: string, onPress: () => void, buttonText: string, description?: string) => (
    <View style={[styles.settingItem, isDarkMode && { borderBottomColor: "#444" }]}>
      <View style={styles.settingTextContainer}>
        <Text style={[styles.settingTitle, isDarkMode && { color: "#FFF" }]}>{title}</Text>
        {description && <Text style={[styles.settingDescription, isDarkMode && { color: "#AAA" }]}>{description}</Text>}
      </View>
      <TouchableOpacity style={styles.connectButton} onPress={onPress}>
        <Text style={styles.connectButtonText}>{buttonText}</Text>
      </TouchableOpacity>
    </View>
  )

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, isDarkMode && { backgroundColor: "#121212" }]}>
        <ActivityIndicator size="large" color="#3498db" />
        <Text style={[styles.loadingText, isDarkMode && { color: "#AAA" }]}>Logging out...</Text>
      </View>
    )
  }

  return (
    <ScrollView style={[styles.container, isDarkMode && { backgroundColor: "#121212" }]}>
      <View style={styles.header}>
        <Text style={[styles.title, isDarkMode && { color: "#FFF" }]}>Settings</Text>
      </View>

      {/* Account Section */}
      <View style={[styles.section, isDarkMode && { backgroundColor: "#1E1E1E", borderColor: "#333" }]}>
        <Text style={[styles.sectionTitle, isDarkMode && { color: "#FFF" }]}>Account</Text>

        {renderSettingItem(
          "account-circle",
          "Profile",
          "Manage your personal information",
          <MaterialIcons name="chevron-right" size={24} color={isDarkMode ? "#AAA" : "#999"} />,
          () => Alert.alert("Profile", "Profile settings coming soon"),
        )}

        {renderSettingItem(
          "lock",
          "Security",
          "Update password and security settings",
          <MaterialIcons name="chevron-right" size={24} color={isDarkMode ? "#AAA" : "#999"} />,
          () => Alert.alert("Security", "Security settings coming soon"),
        )}
      </View>

      {/* Banking Section */}
      <View style={[styles.section, isDarkMode && { backgroundColor: "#1E1E1E", borderColor: "#333" }]}>
        <Text style={[styles.sectionTitle, isDarkMode && { color: "#FFF" }]}>Banking</Text>

        {renderButtonSetting(
          "Connect Bank Account",
          connectBankAccount,
          "Connect",
          "Link your bank account to track transactions",
        )}

        {customerId && (
          <View style={[styles.settingItem, isDarkMode && { borderBottomColor: "#444" }]}>
            <View style={styles.settingTextContainer}>
              <Text style={[styles.settingTitle, isDarkMode && { color: "#FFF" }]}>Customer ID</Text>
              <Text style={[styles.settingDescription, isDarkMode && { color: "#AAA" }]}>{customerId}</Text>
            </View>
          </View>
        )}
      </View>

      <View style={[styles.section, isDarkMode && { backgroundColor: "#1E1E1E", borderColor: "#333" }]}>
        <Text style={[styles.sectionTitle, isDarkMode && { color: "#DDD" }]}>Preferences</Text>

        {renderSettingItem(
          "dark-mode",
          "Dark Mode",
          "Toggle dark mode on or off",
          <Switch
            value={isDarkMode}
            onValueChange={() => {}} //{toggleTheme}
            trackColor={{ false: "#767577", true: "#81b0ff" }}
            thumbColor={isDarkMode ? "#3498db" : "#f4f3f4"}
          />,
          undefined,
        )}

        {renderSettingItem(
          "notifications",
          "Notifications",
          "Manage your notification preferences",
          <Switch
            value={notificationsEnabled}
            onValueChange={setNotificationsEnabled}
            trackColor={{ false: "#767577", true: "#81b0ff" }}
            thumbColor={notificationsEnabled ? "#3498db" : "#f4f3f4"}
          />,
          undefined,
        )}

        {renderSettingItem(
          "fingerprint",
          "Biometric Authentication",
          "Use fingerprint or face ID to login",
          <Switch
            value={biometricsEnabled}
            onValueChange={setBiometricsEnabled}
            trackColor={{ false: "#767577", true: "#81b0ff" }}
            thumbColor={biometricsEnabled ? "#3498db" : "#f4f3f4"}
          />,
          undefined,
        )}
      </View>

      <View style={[styles.section, isDarkMode && { backgroundColor: "#1E1E1E", borderColor: "#333" }]}>
        <Text style={[styles.sectionTitle, isDarkMode && { color: "#DDD" }]}>Support</Text>

        {renderSettingItem(
          "help",
          "Help Center",
          "Get help and contact support",
          <MaterialIcons name="chevron-right" size={24} color={isDarkMode ? "#AAA" : "#999"} />,
          () => Alert.alert("Help Center", "Help center coming soon"),
        )}

        {renderSettingItem(
          "privacy-tip",
          "Privacy Policy",
          "Read our privacy policy",
          <MaterialIcons name="chevron-right" size={24} color={isDarkMode ? "#AAA" : "#999"} />,
          () => Alert.alert("Privacy Policy", "Privacy policy coming soon"),
        )}

        {renderSettingItem(
          "description",
          "Terms of Service",
          "Read our terms of service",
          <MaterialIcons name="chevron-right" size={24} color={isDarkMode ? "#AAA" : "#999"} />,
          () => Alert.alert("Terms of Service", "Terms of service coming soon"),
        )}
      </View>

      <TouchableOpacity
        style={[styles.logoutButton, isDarkMode && { backgroundColor: "#2C5282" }]}
        onPress={handleLogout}
      >
        <MaterialIcons name="logout" size={20} color="#FFF" />
        <Text style={styles.logoutButtonText}>Logout</Text>
      </TouchableOpacity>

      <View style={styles.versionContainer}>
        <Text style={[styles.versionText, isDarkMode && { color: "#666" }]}>Version 1.0.0</Text>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#666",
  },
  header: {
    padding: 16,
    paddingTop: 60,
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#333",
  },
  section: {
    backgroundColor: "#fff",
    borderRadius: 12,
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: "#eee",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 16,
  },
  settingItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f0f0f0",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: "500",
    color: "#333",
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: 14,
    color: "#666",
  },
  logoutButton: {
    backgroundColor: "#3498db",
    borderRadius: 12,
    marginHorizontal: 16,
    marginVertical: 24,
    paddingVertical: 16,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  logoutButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
  versionContainer: {
    alignItems: "center",
    marginBottom: 40,
  },
  versionText: {
    fontSize: 14,
    color: "#999",
  },
  connectButton: {
    backgroundColor: "#3498db",
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 8,
  },
  connectButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "500",
  },
  settingTextContainer: {
    flex: 1,
  },
})

export default SettingsScreen
