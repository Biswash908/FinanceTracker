"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { WebView } from "react-native-webview"
import { View, Button, StyleSheet, Text, ActivityIndicator, Alert, Modal, StatusBar } from "react-native"
import { APP_TOKEN } from "@env"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { leanCustomerService } from "../services/lean-customer-service"
import { leanEntityService } from "../services/lean-entity-service"

interface LeanWebViewProps {
  onClose: (status: string, message?: string, entityId?: string) => void
}

const LeanWebView: React.FC<LeanWebViewProps> = ({ onClose }) => {
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [debugInfo, setDebugInfo] = useState<string>("")

  // State for Lean SDK credentials
  const [appToken, setAppToken] = useState<string>(APP_TOKEN || "")
  const [customerId, setCustomerId] = useState<string | null>(null)
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [initializingCredentials, setInitializingCredentials] = useState(true)

  // Initialize Lean credentials
  useEffect(() => {
    const initializeLeanCredentials = async () => {
      try {
        setInitializingCredentials(true)

        // Get the current user ID from AsyncStorage
        const userToken = await AsyncStorage.getItem("userToken")
        if (!userToken) {
          throw new Error("User not logged in")
        }

        // Extract user ID from token or use the token itself
        const userId = userToken

        console.log("Initializing Lean credentials for user:", userId)

        // Get or create a Lean customer ID for this user
        const leanCustomerId = await leanCustomerService.getOrCreateCustomerId(userId)
        console.log("Got Lean customer ID:", leanCustomerId)
        setCustomerId(leanCustomerId)

        // Get a customer-specific access token
        const customerToken = await leanCustomerService.getCustomerToken(leanCustomerId)
        console.log("Got customer token, length:", customerToken?.length || 0)
        setAccessToken(customerToken)

        console.log("Lean credentials initialized successfully")
      } catch (error) {
        console.error("Error initializing Lean credentials:", error)
        setError(`Failed to initialize Lean: ${error.message}`)
      } finally {
        setInitializingCredentials(false)
      }
    }

    initializeLeanCredentials()
  }, [])

  // Function to fetch entity ID after successful connection
  const fetchEntityId = async (customerId: string, customerToken: string): Promise<string | null> => {
    try {
      console.log("Fetching entity ID for customer:", customerId)

      // Use the correct endpoint for getting customer entities
      const response = await fetch(`https://sandbox.leantech.me/customers/v1/${customerId}/entities`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${customerToken}`,
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error("API Error Response:", errorText)
        throw new Error(`Failed to fetch entities: ${response.status} ${errorText}`)
      }

      const data = await response.json()
      console.log("Entities response:", data)

      // The response is a direct array of entities
      if (Array.isArray(data) && data.length > 0) {
        // Get the most recent entity (usually the last one)
        const entity = data[data.length - 1]
        const entityId = entity.id || entity.entity_id
        console.log("Found entity ID:", entityId)
        return entityId
      } else if (data.payload && data.payload.entities && data.payload.entities.length > 0) {
        // Fallback: check if it's wrapped in payload
        const entity = data.payload.entities[data.payload.entities.length - 1]
        const entityId = entity.id || entity.entity_id
        console.log("Found entity ID (payload structure):", entityId)
        return entityId
      } else if (data.entities && data.entities.length > 0) {
        // Another fallback: check if it's in entities property
        const entity = data.entities[data.entities.length - 1]
        const entityId = entity.id || entity.entity_id
        console.log("Found entity ID (entities structure):", entityId)
        return entityId
      }

      console.warn("No entities found in response:", data)
      return null
    } catch (error) {
      console.error("Error fetching entity ID:", error)

      // Try alternative endpoint if the first one fails
      try {
        console.log("Trying alternative endpoint...")
        const altResponse = await fetch("https://sandbox.leantech.me/data/v1/entities", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${customerToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            customer_id: customerId,
          }),
        })

        if (altResponse.ok) {
          const altData = await altResponse.json()
          console.log("Alternative entities response:", altData)

          if (altData.payload && altData.payload.entities && altData.payload.entities.length > 0) {
            const entity = altData.payload.entities[altData.payload.entities.length - 1]
            const entityId = entity.id || entity.entity_id
            console.log("Found entity ID from alternative endpoint:", entityId)
            return entityId
          }
        }
      } catch (altError) {
        console.error("Alternative endpoint also failed:", altError)
      }

      return null
    }
  }

  // Injected JS string — dynamically built when credentials are ready
  const getInjectedJS = () => `
    console.log("Injecting Lean SDK script...");
    
    // Add console.log listener to capture logs from WebView
    (function() {
      var originalConsoleLog = console.log;
      console.log = function() {
        originalConsoleLog.apply(console, arguments);
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'console.log',
          data: Array.from(arguments).map(arg => typeof arg === 'object' ? JSON.stringify(arg) : arg).join(' ')
        }));
      };
      
      var originalConsoleError = console.error;
      console.error = function() {
        originalConsoleError.apply(console, arguments);
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'console.error',
          data: Array.from(arguments).map(arg => typeof arg === 'object' ? JSON.stringify(arg) : arg).join(' ')
        }));
      };
    })();
    
    var script = document.createElement('script');
    script.src = 'https://cdn.leantech.me/link/loader/prod/ae/latest/lean-link-loader.min.js';
    script.onload = function() {
      console.log("Lean SDK script loaded successfully");
      
      try {
        console.log("Initializing Lean connection with customer token");
        
        Lean.connect({
          app_token: "${appToken}",
          customer_id: "${customerId}",
          permissions: ["identity", "accounts", "balance", "transactions"],
          sandbox: true,
          access_token: "${accessToken}",
          callback: function(response) {
            console.log("Lean callback received:", JSON.stringify(response));
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'lean-response',
              data: response
            }));
          }
        });
      } catch (err) {
        console.error("Error initializing Lean:", err.message);
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'error',
          data: 'Error initializing Lean: ' + err.message
        }));
      }
    };
    
    script.onerror = function(err) {
      console.error("Failed to load Lean SDK:", err);
      window.ReactNativeWebView.postMessage(JSON.stringify({
        type: 'error',
        data: 'Failed to load Lean SDK'
      }));
    };
    
    document.head.appendChild(script);
    true;
  `

  const htmlContent = `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=yes, viewport-fit=cover">
    <meta http-equiv="Content-Security-Policy" content="
      default-src * 'unsafe-inline' 'unsafe-eval' data: blob:;
      script-src * 'unsafe-inline' 'unsafe-eval';
      style-src * 'unsafe-inline';
      connect-src *;
      img-src * data: blob:;
      frame-src *;">
    <title>Connect Bank Account</title>
    <style>
      * {
        box-sizing: border-box;
      }
      html, body {
        margin: 0;
        padding: 0;
        height: 100%;
        width: 100%;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
        background-color: #f5f5f5;
        overflow-x: hidden;
        -webkit-overflow-scrolling: touch;
      }
      body {
        min-height: 100vh;
        min-height: -webkit-fill-available;
        padding-bottom: env(safe-area-inset-bottom);
        padding-top: env(safe-area-inset-top);
      }
      #loading {
        display: flex;
        justify-content: center;
        align-items: center;
        height: 100vh;
        flex-direction: column;
        padding: 20px;
      }
      #loading p {
        margin-top: 20px;
        color: #666;
        text-align: center;
      }
      /* Ensure all interactive elements are accessible */
      button, input, select, textarea, a {
        min-height: 44px;
        touch-action: manipulation;
      }
      /* Fix for iOS safe area */
      @supports (padding: max(0px)) {
        body {
          padding-bottom: max(20px, env(safe-area-inset-bottom));
        }
      }
    </style>
  </head>
  <body>
    <div id="loading">
      <p>Loading bank connection...</p>
      <p style="font-size: 14px; color: #888;">Please wait while we prepare your secure connection...</p>
    </div>
  </body>
</html>
`

  const handleMessage = async (event) => {
    try {
      const message = JSON.parse(event.nativeEvent.data)

      if (message.type === "console.log" || message.type === "console.error") {
        console.log(`WebView ${message.type}:`, message.data)
        setDebugInfo((prev) => prev + "\n" + message.data)
      } else if (message.type === "error") {
        console.error("WebView error:", message.data)
        setError(message.data)
      } else if (message.type === "lean-response") {
        const response = message.data
        console.log("Lean SDK response:", response)

        if (response.status === "SUCCESS") {
          console.log("Bank connection successful, fetching entity ID...")

          try {
            // Fetch the entity ID after successful connection
            const entityId = await fetchEntityId(customerId, accessToken)

            if (entityId) {
              console.log("Successfully retrieved entity ID:", entityId)

              // Store the entity ID for future use
              await leanEntityService.storeEntityId(entityId)

              // Try to fetch and cache identity data
              try {
                await leanEntityService.fetchIdentity(entityId, accessToken)
                console.log("Identity data fetched and cached successfully")
              } catch (identityError) {
                console.warn("Could not fetch identity data:", identityError)
                // Don't fail the connection for this
              }

              onClose("SUCCESS", response.message || "Bank connected successfully", entityId)
            } else {
              console.warn("Could not retrieve entity ID after connection")
              // Still consider it a success, but without entity ID
              onClose("SUCCESS", response.message || "Bank connected successfully, but could not retrieve entity ID")
            }
          } catch (error) {
            console.error("Error fetching entity ID:", error)
            // Still consider the connection successful
            onClose("SUCCESS", response.message || "Bank connected successfully, but could not retrieve entity ID")
          }
        } else if (response.status === "ERROR") {
          onClose("ERROR", response.message || "Error connecting to bank")
        } else if (response.status === "CANCELLED") {
          onClose("CANCELLED", response.message || "Bank connection cancelled")
        }
      } else {
        // Try to parse as a direct Lean response
        const response = message
        if (response.status) {
          if (response.status === "SUCCESS") {
            onClose("SUCCESS", response.message || "Bank connected successfully")
          } else if (response.status === "ERROR") {
            onClose("ERROR", response.message || "Error connecting to bank")
          } else if (response.status === "CANCELLED") {
            onClose("CANCELLED", response.message || "Bank connection cancelled")
          }
        }
      }
    } catch (error) {
      console.error("Error parsing WebView message:", error)
    }
  }

  const showDebugInfo = () => {
    Alert.alert(
      "Debug Information",
      `App Token: ${appToken ? "Set (length: " + appToken.length + ")" : "Not set"}\n` +
        `Customer ID: ${customerId ? customerId : "Not set"}\n` +
        `Access Token: ${accessToken ? "Set (length: " + accessToken.length + ")" : "Not set"}\n\n` +
        `WebView Logs:\n${debugInfo || "No logs yet"}`,
      [{ text: "OK" }],
    )
  }

  const handleClose = () => {
    onClose("CANCELLED", "User closed the connection")
  }

  return (
    <Modal animationType="slide" presentationStyle="fullScreen" visible={true} onRequestClose={handleClose}>
      <StatusBar barStyle="dark-content" backgroundColor="white" />
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerText}>Connect Bank Account</Text>
          <View style={styles.headerButtons}>
            <Button title="Debug" onPress={showDebugInfo} />
            <View style={styles.buttonSpacer} />
            <Button title="Close" onPress={handleClose} />
          </View>
        </View>

        {/* Content */}
        {initializingCredentials ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#3498db" />
            <Text style={styles.loadingText}>Initializing bank connection...</Text>
          </View>
        ) : error && !customerId ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>Error</Text>
            <Text style={styles.errorDescription}>{error}</Text>
            <Button
              title="Retry"
              onPress={() => {
                setError(null)
                setInitializingCredentials(true)
                // Re-trigger the useEffect
                setCustomerId(null)
                setAccessToken(null)
              }}
            />
          </View>
        ) : (
          <>
            {isLoading && (
              <View style={styles.loadingOverlay}>
                <ActivityIndicator size="large" color="#3498db" />
                <Text style={styles.loadingText}>Loading bank connection...</Text>
              </View>
            )}

            {error && customerId && (
              <View style={styles.errorBanner}>
                <Text style={styles.errorBannerText}>Error: {error}</Text>
                <Button title="Try Again" onPress={() => setError(null)} />
              </View>
            )}

            {customerId && accessToken && (
              <WebView
                source={{ html: htmlContent }}
                originWhitelist={["*"]}
                javaScriptEnabled={true}
                domStorageEnabled={true}
                startInLoadingState={true}
                injectedJavaScript={getInjectedJS()}
                onMessage={handleMessage}
                onLoadStart={() => setIsLoading(true)}
                onLoadEnd={() => setIsLoading(false)}
                onError={({ nativeEvent }) => {
                  setError(nativeEvent.description || "Failed to load")
                  setIsLoading(false)
                  console.error("WebView error:", nativeEvent)
                }}
                style={styles.webView}
                allowsInlineMediaPlayback={true}
                mediaPlaybackRequiresUserAction={false}
                mixedContentMode="always"
                scalesPageToFit={false}
                scrollEnabled={true}
                bounces={true}
                showsVerticalScrollIndicator={true}
                showsHorizontalScrollIndicator={false}
                automaticallyAdjustContentInsets={true}
                contentInsetAdjustmentBehavior="automatic"
                keyboardDisplayRequiresUserAction={false}
                allowsBackForwardNavigationGestures={false}
                decelerationRate={0.998}
                overScrollMode="always"
                nestedScrollEnabled={true}
              />
            )}
          </>
        )}
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "white",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    backgroundColor: "white",
    paddingTop: 50, // Account for status bar
  },
  headerText: {
    fontSize: 18,
    fontWeight: "bold",
  },
  headerButtons: {
    flexDirection: "row",
    alignItems: "center",
  },
  buttonSpacer: {
    width: 10,
  },
  webView: {
    flex: 1,
    backgroundColor: "transparent",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "white",
  },
  loadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    zIndex: 999,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: "#666",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    color: "red",
    marginBottom: 10,
    textAlign: "center",
    fontWeight: "bold",
  },
  errorDescription: {
    fontSize: 16,
    color: "#666",
    marginBottom: 20,
    textAlign: "center",
  },
  errorBanner: {
    backgroundColor: "#ffebee",
    padding: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  errorBannerText: {
    color: "#c62828",
    fontSize: 14,
    flex: 1,
  },
})

export default LeanWebView
