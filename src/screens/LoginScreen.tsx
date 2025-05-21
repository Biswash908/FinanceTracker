"use client"

import type React from "react"
import { useState } from "react"
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from "react-native"
import { useTheme } from "../context/ThemeContext"
import { MaterialIcons } from "@expo/vector-icons"

interface LoginScreenProps {
  onLogin: (token: string, userId: string) => void
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin }) => {
  const { isDarkMode } = useTheme()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  // Mock login function - replace with actual API call in production
  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Please enter both email and password")
      return
    }

    setIsLoading(true)

    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1500))

      // For demo purposes, accept any email/password
      // In production, validate credentials with your backend
      const mockToken = "mock-auth-token-12345"
      const mockUserId = "user_" + Math.floor(Math.random() * 10000)

      onLogin(mockToken, mockUserId)
    } catch (error) {
      Alert.alert("Login Failed", "Invalid email or password")
      console.error("Login error:", error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={[styles.container, isDarkMode && { backgroundColor: "#121212" }]}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.logoContainer}>
          <Image
            source={{ uri: "https://placeholder.com/wp-content/uploads/2018/10/placeholder.png" }}
            style={styles.logo}
          />
          <Text style={[styles.appName, isDarkMode && { color: "#FFF" }]}>The Meso Tracker</Text>
        </View>

        <View style={styles.formContainer}>
          <Text style={[styles.welcomeText, isDarkMode && { color: "#FFF" }]}>Welcome Back</Text>
          <Text style={[styles.subtitle, isDarkMode && { color: "#AAA" }]}>Sign in to continue to your account</Text>

          <View style={[styles.inputContainer, isDarkMode && { backgroundColor: "#2A2A2A", borderColor: "#444" }]}>
            <MaterialIcons name="email" size={20} color={isDarkMode ? "#AAA" : "#666"} />
            <TextInput
              style={[styles.input, isDarkMode && { color: "#FFF" }]}
              placeholder="Email Address"
              placeholderTextColor={isDarkMode ? "#888" : "#999"}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View style={[styles.inputContainer, isDarkMode && { backgroundColor: "#2A2A2A", borderColor: "#444" }]}>
            <MaterialIcons name="lock" size={20} color={isDarkMode ? "#AAA" : "#666"} />
            <TextInput
              style={[styles.input, isDarkMode && { color: "#FFF" }]}
              placeholder="Password"
              placeholderTextColor={isDarkMode ? "#888" : "#999"}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
              <MaterialIcons
                name={showPassword ? "visibility" : "visibility-off"}
                size={20}
                color={isDarkMode ? "#AAA" : "#666"}
              />
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.forgotPassword}>
            <Text style={[styles.forgotPasswordText, isDarkMode && { color: "#3498db" }]}>Forgot Password?</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.loginButton, isLoading && { opacity: 0.7 }]}
            onPress={handleLogin}
            disabled={isLoading}
          >
            {isLoading ? (
              <Text style={styles.loginButtonText}>Signing in...</Text>
            ) : (
              <Text style={styles.loginButtonText}>Sign In</Text>
            )}
          </TouchableOpacity>

          <View style={styles.orContainer}>
            <View style={[styles.orLine, isDarkMode && { backgroundColor: "#444" }]} />
            <Text style={[styles.orText, isDarkMode && { color: "#AAA" }]}>OR</Text>
            <View style={[styles.orLine, isDarkMode && { backgroundColor: "#444" }]} />
          </View>

          <TouchableOpacity style={[styles.demoButton, isDarkMode && { backgroundColor: "#2C5282" }]}>
            <Text style={styles.demoButtonText}>Continue with Demo Account</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.signupContainer}>
          <Text style={[styles.signupText, isDarkMode && { color: "#AAA" }]}>Don't have an account? </Text>
          <TouchableOpacity>
            <Text style={styles.signupLink}>Sign Up</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 20,
  },
  logoContainer: {
    alignItems: "center",
    marginBottom: 40,
  },
  logo: {
    width: 80,
    height: 80,
    borderRadius: 20,
  },
  appName: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
    marginTop: 10,
  },
  formContainer: {
    width: "100%",
  },
  welcomeText: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
    marginBottom: 30,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#eee",
    height: 56,
  },
  input: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
    color: "#333",
  },
  eyeIcon: {
    padding: 4,
  },
  forgotPassword: {
    alignSelf: "flex-end",
    marginBottom: 24,
  },
  forgotPasswordText: {
    color: "#3498db",
    fontSize: 14,
  },
  loginButton: {
    backgroundColor: "#3498db",
    borderRadius: 12,
    height: 56,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  loginButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  orContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 20,
  },
  orLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#e0e0e0",
  },
  orText: {
    paddingHorizontal: 10,
    color: "#666",
    fontSize: 14,
  },
  demoButton: {
    backgroundColor: "#3498db",
    borderRadius: 12,
    height: 56,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
    opacity: 0.8,
  },
  demoButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  signupContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 20,
  },
  signupText: {
    fontSize: 14,
    color: "#666",
  },
  signupLink: {
    fontSize: 14,
    color: "#3498db",
    fontWeight: "600",
  },
})

export default LoginScreen
