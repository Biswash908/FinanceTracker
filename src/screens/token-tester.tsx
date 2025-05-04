"use client"

import { useState } from "react"
import { View, Text, StyleSheet, TouchableOpacity } from "react-native"
import { authService } from "../services/auth-service"

/**
 * A simple component to test the auth service independently
 */
const TokenTester = () => {
  const [token, setToken] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [scopeToTry, setScopeToTry] = useState("")

  const testAuth = async () => {
    setLoading(true)
    setError(null)
    try {
      const token = await authService.getToken()
      setToken(token.substring(0, 20) + "...")
      console.log("Token obtained successfully")
    } catch (err) {
      setError(err.message)
      console.error("Auth error:", err)
    } finally {
      setLoading(false)
    }
  }

  // Function to test with a specific scope
  const testWithScope = async () => {
    if (!scopeToTry) {
      setError("Please enter a scope to try")
      return
    }

    setLoading(true)
    setError(null)
    try {
      // Create form data for token request
      const formData = new URLSearchParams()
      formData.append("grant_type", "client_credentials")
      formData.append("client_id", "4595889f-d4ab-492d-9e79-eea3298a3a4f")
      formData.append("client_secret", "34353935383839662d643461622d3439")
      formData.append("scope", scopeToTry)

      console.log("Testing with scope:", scopeToTry)
      console.log("Request body:", formData.toString())

      const response = await fetch("https://auth.sandbox.leantech.me/oauth2/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: formData.toString(),
      })

      const responseText = await response.text()
      console.log("Response status:", response.status)
      console.log("Response body:", responseText)

      if (!response.ok) {
        setError(`Failed with status ${response.status}: ${responseText}`)
        return
      }

      const data = JSON.parse(responseText)
      setToken(data.access_token.substring(0, 20) + "...")
      console.log("Token obtained successfully with scope:", scopeToTry)
    } catch (err) {
      setError(err.message)
      console.error("Auth error:", err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Auth Token Tester</Text>

      <TouchableOpacity style={styles.button} onPress={testAuth} disabled={loading}>
        <Text style={styles.buttonText}>{loading ? "Getting token..." : "Test Default Auth"}</Text>
      </TouchableOpacity>

      <View style={styles.scopeContainer}>
        <Text style={styles.label}>Try these scopes:</Text>
        {["api", "customer.read", "data.read", "bank.read", "payment.read"].map((scope) => (
          <TouchableOpacity
            key={scope}
            style={styles.scopeButton}
            onPress={() => {
              setScopeToTry(scope)
              // Immediately test with this scope
              setTimeout(() => {
                testWithScope()
              }, 100)
            }}
          >
            <Text style={styles.scopeButtonText}>{scope}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {token && (
        <View style={styles.resultContainer}>
          <Text style={styles.resultText}>Token: {token}</Text>
        </View>
      )}

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Error: {error}</Text>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#f5f5f5",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
    color: "#333",
  },
  button: {
    backgroundColor: "#3498db",
    paddingVertical: 12,
    borderRadius: 6,
    alignItems: "center",
    marginBottom: 20,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "500",
    fontSize: 16,
  },
  scopeContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    marginBottom: 10,
    color: "#333",
  },
  scopeButton: {
    backgroundColor: "#34495e",
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 6,
    marginBottom: 8,
    alignItems: "center",
  },
  scopeButtonText: {
    color: "#fff",
  },
  resultContainer: {
    backgroundColor: "#e6ffe6",
    padding: 15,
    borderRadius: 6,
    marginBottom: 20,
  },
  resultText: {
    color: "#006600",
  },
  errorContainer: {
    backgroundColor: "#ffebee",
    padding: 15,
    borderRadius: 6,
  },
  errorText: {
    color: "#c62828",
  },
})

export default TokenTester
