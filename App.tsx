"use client"

import React, { useState, useEffect } from "react"
import { SafeAreaView, StyleSheet, StatusBar, View, Text, ActivityIndicator, TouchableOpacity } from "react-native"
import { NavigationContainer } from "@react-navigation/native"
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs"
import { Feather } from "@expo/vector-icons"

// Screens
import DashboardScreen from "./src/screens/DashboardScreen"
import TransactionsScreen from "./src/screens/TransactionsScreen"
import SettingsScreen from "./src/screens/SettingsScreen"

// Context and Services
import { ThemeProvider, useTheme } from "./src/context/ThemeContext"
import { authService } from "./src/services/auth-service"

// Create bottom tab navigator
const Tab = createBottomTabNavigator()

// Error Boundary Component
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error("App Error:", error, errorInfo)
    // Here you could send the error to your error reporting service
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.errorContainer}>
          <Feather name="alert-triangle" size={50} color="#e74c3c" />
          <Text style={styles.errorTitle}>Something went wrong</Text>
          <Text style={styles.errorMessage}>{this.state.error?.message || "An unexpected error occurred"}</Text>
          <TouchableOpacity style={styles.errorButton} onPress={() => this.setState({ hasError: false })}>
            <Text style={styles.errorButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      )
    }

    return this.props.children
  }
}

// Main Navigation Component
const AppNavigator = () => {
  const { theme } = useTheme()

  return (
    <NavigationContainer>
      <StatusBar
        barStyle={theme === "dark" ? "light-content" : "dark-content"}
        backgroundColor={theme === "dark" ? "#121212" : "#ffffff"}
      />
      <Tab.Navigator
        screenOptions={({ route }) => ({
          tabBarIcon: ({ focused, color, size }) => {
            let iconName

            if (route.name === "Dashboard") {
              iconName = "home"
            } else if (route.name === "Transactions") {
              iconName = "list"
            } else if (route.name === "Settings") {
              iconName = "settings"
            }

            return <Feather name={iconName} size={size} color={color} />
          },
          tabBarActiveTintColor: "#3498db",
          tabBarInactiveTintColor: theme === "dark" ? "#999" : "#666",
          headerShown: false,
          tabBarStyle: {
            backgroundColor: theme === "dark" ? "#121212" : "#fff",
            borderTopWidth: 1,
            borderTopColor: theme === "dark" ? "#333" : "#eee",
            paddingTop: 5,
            paddingBottom: 5,
            height: 60,
          },
          tabBarLabelStyle: {
            fontSize: 12,
            fontWeight: "500",
            paddingBottom: 5,
          },
        })}
      >
        <Tab.Screen name="Dashboard" component={DashboardScreen} />
        <Tab.Screen name="Transactions" component={TransactionsScreen} />
        <Tab.Screen name="Settings" component={SettingsScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  )
}

// Main App Component
export default function App() {
  const [isLoading, setIsLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  // Check authentication status on app load
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const isValid = await authService.validateToken()
        setIsAuthenticated(isValid)
      } catch (error) {
        console.error("Auth check failed:", error)
        setIsAuthenticated(false)
      } finally {
        // Simulate a splash screen delay
        setTimeout(() => {
          setIsLoading(false)
        }, 1500)
      }
    }

    checkAuth()
  }, [])

  // Show splash screen while loading
  if (isLoading) {
    return (
      <View style={styles.splashContainer}>
        <Text style={styles.splashTitle}>Finance Tracker</Text>
        <ActivityIndicator size="large" color="#3498db" style={styles.splashLoader} />
      </View>
    )
  }

  return (
    <ErrorBoundary>
      <ThemeProvider>
        <SafeAreaView style={styles.container}>
          <AppNavigator />
        </SafeAreaView>
      </ThemeProvider>
    </ErrorBoundary>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
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
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#f5f5f5",
  },
  errorTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#333",
    marginTop: 20,
    marginBottom: 10,
  },
  errorMessage: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginBottom: 20,
  },
  errorButton: {
    backgroundColor: "#3498db",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  errorButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "500",
  },
})
