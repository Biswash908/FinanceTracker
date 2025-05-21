"use client"

import { useState, useEffect } from "react"
import { NavigationContainer } from "@react-navigation/native"
import { createStackNavigator } from "@react-navigation/stack"
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs"
import { SafeAreaProvider } from "react-native-safe-area-context"
import { StatusBar } from "expo-status-bar"
import { MaterialIcons } from "@expo/vector-icons"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { View, StyleSheet, ActivityIndicator, Alert } from "react-native"

// Import screens
import DashboardScreen from "./src/screens/DashboardScreen"
import TransactionsScreen from "./src/screens/TransactionsScreen"
import SettingsScreen from "./src/screens/SettingsScreen"
import LoginScreen from "./src/screens/LoginScreen"
import OnboardingScreen from "./src/screens/OnboardingScreen"

// Import components
import LeanWebView from "./src/components/LeanWebView"

// Import context
import { ThemeProvider } from "./src/context/ThemeContext"

// Import environment variables
import { APP_TOKEN, CUSTOMER_ID } from "@env"

// Import auth service
import { authService } from "./src/services/auth-service"

// Create navigators
const Stack = createStackNavigator()
const Tab = createBottomTabNavigator()

// Main tab navigator
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

// Main app component
const App = () => {
  const [isLoading, setIsLoading] = useState(true)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [hasOnboarded, setHasOnboarded] = useState(false)
  const [customerId, setCustomerId] = useState(CUSTOMER_ID || null)
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
        const onboardingComplete = await AsyncStorage.getItem("onboardingComplete")
        const storedCustomerId = await AsyncStorage.getItem("customerId")

        if (storedCustomerId) {
          setCustomerId(storedCustomerId)
        } else if (CUSTOMER_ID) {
          await AsyncStorage.setItem("customerId", CUSTOMER_ID)
          setCustomerId(CUSTOMER_ID)
        }

        setIsLoggedIn(userToken !== null)
        setHasOnboarded(onboardingComplete === "true")
      } catch (error) {
        console.error("Error checking login status:", error)
      } finally {
        setIsLoading(false)
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

      // Use the provided CUSTOMER_ID or generate one
      const custId = CUSTOMER_ID || `customer_${userId}_${Date.now()}`
      await AsyncStorage.setItem("customerId", custId)
      setCustomerId(custId)

      setIsLoggedIn(true)
    } catch (error) {
      console.error("Error during login:", error)
    }
  }

  // Handle logout
  const handleLogout = async () => {
    try {
      await AsyncStorage.removeItem("userToken")
      setIsLoggedIn(false)
      // Also clear auth service token
      authService.logout()
    } catch (error) {
      console.error("Error during logout:", error)
    }
  }

  // Complete onboarding
  const completeOnboarding = async () => {
    try {
      await AsyncStorage.setItem("onboardingComplete", "true")
      setHasOnboarded(true)
    } catch (error) {
      console.error("Error completing onboarding:", error)
    }
  }

  // Handle Lean WebView close
  const handleLeanWebViewClose = (status, message) => {
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
      Alert.alert("Cancelled", message || "Bank connection was cancelled")
    }
  }

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3498db" />
      </View>
    )
  }

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <NavigationContainer>
          <StatusBar style="auto" />
          <Stack.Navigator screenOptions={{ headerShown: false }}>
            {!hasOnboarded ? (
              <Stack.Screen name="Onboarding">
                {(props) => <OnboardingScreen {...props} onComplete={completeOnboarding} />}
              </Stack.Screen>
            ) : !isLoggedIn ? (
              <Stack.Screen name="Login">{(props) => <LoginScreen {...props} onLogin={handleLogin} />}</Stack.Screen>
            ) : (
              <Stack.Screen name="Main">
                {(props) => (
                  <>
                    <TabNavigator {...props} />
                    {/* Show Lean WebView when triggered */}
                    {showLeanWeb && (
                      <LeanWebView customerId={customerId} appToken={APP_TOKEN} onClose={handleLeanWebViewClose} />
                    )}
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
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
  },
})

export default App
