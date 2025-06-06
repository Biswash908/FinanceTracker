"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { View, Text, StyleSheet, TouchableOpacity, Switch, ScrollView, Alert } from "react-native"
import { useTheme } from "../context/ThemeContext"
import { MaterialIcons } from "@expo/vector-icons"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { leanEntityService } from "../services/lean-entity-service"
import LeanWebView from "../components/LeanWebView"
import ConnectedBanksModal from "../components/ConnectedBanksModal"
import { authService } from "../services/auth-service"
import { leanCustomerService } from "../services/lean-customer-service"

const SettingsScreen = () => {
  const { isDarkMode, toggleTheme } = useTheme()
  const [isLoading, setIsLoading] = useState(false)
  const [notificationsEnabled, setNotificationsEnabled] = useState(true)
  const [biometricsEnabled, setBiometricsEnabled] = useState(false)

  // State
  const [currency, setCurrency] = useState("AED")
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [customerId, setCustomerId] = useState(null)
  const [bankConnected, setBankConnected] = useState(false)
  const [entityId, setEntityId] = useState<string | null>(null)
  const [connectedBanksCount, setConnectedBanksCount] = useState(0)

  // State for LeanWebView
  const [showLeanWebView, setShowLeanWebView] = useState(false)

  // State for Connected Banks Modal
  const [showConnectedBanksModal, setShowConnectedBanksModal] = useState(false)

  // Load settings on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const storedCustomerId = await AsyncStorage.getItem("customerId")
        const bankConnectionStatus = await AsyncStorage.getItem("bankConnected")
        const storedEntityId = await leanEntityService.getEntityId()

        if (storedCustomerId) {
          setCustomerId(storedCustomerId)
        }

        // Check if we have a valid entity ID
        if (storedEntityId) {
          setEntityId(storedEntityId)
          setBankConnected(true)
          // Update the bankConnected flag in AsyncStorage if it's not set
          if (bankConnectionStatus !== "true") {
            await AsyncStorage.setItem("bankConnected", "true")
          }
        } else if (bankConnectionStatus === "true") {
          setBankConnected(true)
        } else {
          setBankConnected(false)
        }

        // Load connected banks count
        await loadConnectedBanksCount()
      } catch (error) {
        console.error("Error loading settings:", error)
      }
    }

    loadSettings()
  }, [])

  // Function to load connected banks count
  const loadConnectedBanksCount = async () => {
    try {
      const entities = await leanEntityService.getAllEntities()
      setConnectedBanksCount(entities.length)
      setBankConnected(entities.length > 0)
    } catch (error) {
      console.error("Error loading connected banks count:", error)
    }
  }

  // Connect bank account
  const connectBankAccount = async () => {
    setShowLeanWebView(true)
  }

  // Handle Lean WebView close
  const handleLeanWebViewClose = async (status: string, message?: string, receivedEntityId?: string) => {
    setShowLeanWebView(false)

    if (status === "SUCCESS") {
      // Handle successful connection
      await AsyncStorage.setItem("bankConnected", "true")
      setBankConnected(true)

      if (receivedEntityId) {
        setEntityId(receivedEntityId)
        Alert.alert("Success", message || "Bank account connected successfully! Your data is now available.")
      } else {
        Alert.alert("Success", message || "Bank account connected successfully!")
      }

      // Refresh the settings to show updated status
      const storedEntityId = await leanEntityService.getEntityId()
      if (storedEntityId) {
        setEntityId(storedEntityId)
      }

      // Reload connected banks count
      await loadConnectedBanksCount()
    } else if (status === "ERROR") {
      Alert.alert("Error", message || "Error connecting bank account")
    } else if (status === "CANCELLED") {
      // Handle cancellation - no alert needed for user cancellation
      console.log("Bank connection cancelled by user")
    }
  }

  // Handle Connected Banks Modal close
  const handleConnectedBanksModalClose = () => {
    setShowConnectedBanksModal(false)
  }

  // Handle banks changed (when banks are added/removed)
  const handleBanksChanged = async () => {
    await loadConnectedBanksCount()
  }

  const handleLogout = async () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          setIsLoading(true)
          try {
            console.log("Starting logout process...")

            // Clear all auth-related data
            await AsyncStorage.multiRemove(["userToken", "bankConnected", "customerId"])

            // Clear all Lean-related data
            await leanEntityService.clearEntityData()
            await leanCustomerService.clearCustomerData()
            await authService.logout()

            console.log("All data cleared, logout complete")

            // Force app to restart by reloading
            // This is a workaround to ensure the app navigates back to login
            setTimeout(() => {
              // This will cause the app to re-check authentication
              global.location?.reload?.() || require("react-native").DevSettings?.reload?.()
            }, 100)
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

  // Handle dark mode toggle - FIXED
  const handleDarkModeToggle = () => {
    toggleTheme()
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

        {/* Connect Bank Account */}
        {renderSettingItem(
          "account-balance-wallet",
          "Connect Bank Account",
          "Link a new bank account to track transactions",
          <MaterialIcons name="chevron-right" size={24} color={isDarkMode ? "#AAA" : "#999"} />,
          connectBankAccount,
        )}

        {/* Connected Banks */}
        {connectedBanksCount > 0 &&
          renderSettingItem(
            "account-balance",
            "Connected Banks",
            `${connectedBanksCount} ${connectedBanksCount === 1 ? "bank" : "banks"} connected`,
            <MaterialIcons name="chevron-right" size={24} color={isDarkMode ? "#AAA" : "#999"} />,
            () => setShowConnectedBanksModal(true),
          )}

        {customerId && (
          <View style={[styles.settingItem, isDarkMode && { borderBottomColor: "#444" }]}>
            <View style={[styles.settingIcon, isDarkMode && { backgroundColor: "#333" }]}>
              <MaterialIcons name="fingerprint" size={24} color={isDarkMode ? "#3498db" : "#3498db"} />
            </View>
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
            onValueChange={handleDarkModeToggle}
            trackColor={{ false: "#767577", true: "#81b0ff" }}
            thumbColor={isDarkMode ? "#3498db" : "#f4f3f4"}
            disabled={false}
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

      {/* Lean WebView Modal */}
      {showLeanWebView && <LeanWebView onClose={handleLeanWebViewClose} />}

      {/* Connected Banks Modal */}
      <ConnectedBanksModal
        visible={showConnectedBanksModal}
        onClose={handleConnectedBanksModalClose}
        onBanksChanged={handleBanksChanged}
      />
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
    paddingTop: 30,
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
  settingTextContainer: {
    flex: 1,
  },
})

export default SettingsScreen