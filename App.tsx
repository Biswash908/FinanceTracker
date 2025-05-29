"use client"

import { useState, useEffect } from "react"
import { SafeAreaProvider } from "react-native-safe-area-context"
import { NavigationContainer } from "@react-navigation/native"
import { createStackNavigator } from "@react-navigation/stack"
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs"
import { MaterialIcons } from "@expo/vector-icons"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { View, StyleSheet, ActivityIndicator, Alert, Text } from "react-native"

// Screens
import DashboardScreen from "./src/screens/DashboardScreen"
import TransactionsScreen from "./src/screens/TransactionsScreen"
import SettingsScreen from "./src/screens/SettingsScreen"
import LoginScreen from "./src/screens/LoginScreen"

// Components
import LeanWebView from "./src/components/LeanWebView"

// Context and Services
import { ThemeProvider } from "./src/context/ThemeContext"
import { authService } from "./src/services/auth-service"
import { leanCustomerService } from "./src/services/lean-customer-service"
import { leanEntityService } from "./src/services/lean-entity-service"

// Create navigators
const Stack = createStackNavigator()
const Tab = createBottomTabNavigator()

// Main Tab Navigator
const TabNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName

          if (route.name === "Dashboard") {
            iconName = "dashboard"
          } else if (route.name === "Transactions") {
            iconName = "receipt-long"
          } else if (route.name === "Settings") {
            iconName = "settings"
          }

          return <MaterialIcons name={iconName} size={size} color={color} />
        },
        tabBarActiveTintColor: "#3498db",
        tabBarInactiveTintColor: "gray",
        headerShown: false,
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Transactions" component={TransactionsScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  )
}

// Main App Component
const App = () => {
  const [isLoading, setIsLoading] = useState(true)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [customerId, setCustomerId] = useState(null)
  const [showLeanWeb, setShowLeanWeb] = useState(false)
  const [authInitialized, setAuthInitialized] = useState(false)

  // Initialize auth service
  useEffect(() => {
    const initAuth = async () => {
      try {
        // Validate token on startup
        await authService.validateToken()
        setAuthInitialized(true)
      } catch (error) {
        console.error("Error initializing auth service:", error)
        // Continue anyway, the auth service will try to get a token when needed
        setAuthInitialized(true)
      }
    }

    initAuth()
  }, [])

  // Check login status on app start
  useEffect(() => {
    const checkLoginStatus = async () => {
      try {
        const userToken = await AsyncStorage.getItem("userToken")
        const storedCustomerId = await AsyncStorage.getItem("customerId")

        if (storedCustomerId) {
          setCustomerId(storedCustomerId)
        }

        setIsLoggedIn(userToken !== null)
      } catch (error) {
        console.error("Error checking login status:", error)
      } finally {
        // Add splash screen delay
        setTimeout(() => {
          setIsLoading(false)
        }, 1500)
      }
    }

    if (authInitialized) {
      checkLoginStatus()
    }
  }, [authInitialized])

  // Check for Lean SDK trigger
  useEffect(() => {
    if (!isLoggedIn) return

    const checkLeanTrigger = async () => {
      try {
        const triggerLeanConnect = await AsyncStorage.getItem("triggerLeanConnect")

        if (triggerLeanConnect === "true" && customerId) {
          // Clear the trigger flag
          await AsyncStorage.removeItem("triggerLeanConnect")

          // Show the Lean WebView
          setShowLeanWeb(true)
        }
      } catch (error) {
        console.error("Error checking Lean trigger:", error)
      }
    }

    checkLeanTrigger()

    // Set up an interval to check for the trigger
    const intervalId = setInterval(checkLeanTrigger, 2000)

    return () => clearInterval(intervalId)
  }, [isLoggedIn, customerId])

  // Handle login
  const handleLogin = async (token, userId) => {
    try {
      await AsyncStorage.setItem("userToken", token)

      // Generate a customer ID if needed
      const custId = `customer_${userId}_${Date.now()}`
      await AsyncStorage.setItem("customerId", custId)
      setCustomerId(custId)

      setIsLoggedIn(true)
    } catch (error) {
      console.error("Error during login:", error)
    }
  }

  // Handle logout - Fixed to properly update state
  const handleLogout = async () => {
    try {
      console.log("Logging out...")

      // Clear all auth-related data
      await AsyncStorage.removeItem("userToken")

      // Clear all Lean-related data
      await authService.logout()
      await leanCustomerService.clearCustomerData()
      await leanEntityService.clearEntityData()

      // Update state AFTER async operations complete
      setIsLoggedIn(false)

      console.log("Logout complete, isLoggedIn set to false")
    } catch (error) {
      console.error("Error during logout:", error)
      Alert.alert("Logout Error", "Failed to log out properly. Please try again.")
    }
  }

  // Handle Lean WebView close
  const handleLeanWebViewClose = (status, message, entityId) => {
    setShowLeanWeb(false)

    if (status === "SUCCESS") {
      // Handle successful connection
      AsyncStorage.setItem("bankConnected", "true")
      Alert.alert("Success", message || "Bank account connected successfully!")
    } else if (status === "ERROR") {
      // Handle error
      Alert.alert("Error", message || "Error connecting bank account")
    } else if (status === "CANCELLED") {
      // Handle cancellation
      console.log("Bank connection was cancelled")
    }
  }

  if (isLoading) {
    return (
      <View style={styles.splashContainer}>
        <Text style={styles.splashTitle}>Finance Tracker</Text>
        <ActivityIndicator size="large" color="#ffffff" style={styles.splashLoader} />
      </View>
    )
  }

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <NavigationContainer>
          <Stack.Navigator screenOptions={{ headerShown: false }}>
            {!isLoggedIn ? (
              <Stack.Screen name="Login">{(props) => <LoginScreen {...props} onLogin={handleLogin} />}</Stack.Screen>
            ) : (
              <Stack.Screen name="Main">
                {(props) => (
                  <>
                    <TabNavigator {...props} />
                    {/* Show Lean WebView when triggered */}
                    {showLeanWeb && <LeanWebView onClose={handleLeanWebViewClose} />}
                  </>
                )}
              </Stack.Screen>
            )}
          </Stack.Navigator>
        </NavigationContainer>
      </ThemeProvider>
    </SafeAreaProvider>
  )
}

const styles = StyleSheet.create({
  splashContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#3498db",
  },
  splashTitle: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 20,
  },
  splashLoader: {
    marginTop: 20,
  },
})

export default App
