"use client"

import type React from "react"
import { useEffect, useState, useRef } from "react"
import { WebView } from "react-native-webview"
import { View, Button, StyleSheet, Text, ActivityIndicator, Alert, Modal, StatusBar, Platform } from "react-native"
import { APP_TOKEN } from "@env"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { leanCustomerService } from "../services/lean-customer-service"
import { leanEntityService } from "../services/lean-entity-service"
import { fetchAccounts } from "../services/lean-api"
import { authService } from "../services/auth-service"

interface LeanWebViewProps {
  onClose: (status: string, message?: string, entityId?: string) => void
}

const LeanWebView: React.FC<LeanWebViewProps> = ({ onClose }) => {
  // Removed isLoading state, as Lean SDK will manage its own loading UI
  const [error, setError] = useState<string | null>(null)
  const [debugInfo, setDebugInfo] = useState<string>("")
  const webViewRef = useRef(null)

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
        // No setIsLoading(true) here, as we're removing the overlay
        setError(null) // Clear any previous errors

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

  // Removed the fallback timeout useEffect, as there's no overlay to dismiss

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

  // Function to fetch identity data and get real name using the app token
  const fetchIdentityAndGetName = async (entityId: string): Promise<{ bankName: string; userName: string }> => {
    try {
      console.log("Fetching identity data for entity:", entityId)

      // Get the app token for the identity API call
      const appToken = await authService.getToken()

      // Fetch identity data using the identity endpoint with app token
      const response = await fetch("https://sandbox.leantech.me/data/v1/identity", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${appToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          entity_id: entityId,
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.warn(`Failed to fetch identity: ${response.status} ${errorText}`)
        return { bankName: "Demo Bank", userName: "Demo User" }
      }

      const data = await response.json()
      console.log("Identity data received:", JSON.stringify(data, null, 2))

      let userName = "Demo User"
      let bankName = "Demo Bank"

      // Check if we have the expected response structure
      if (data.status === "OK" && data.payload) {
        const payload = data.payload

        // Extract real name from identity data - prioritize full_name
        if (payload.full_name) {
          userName = payload.full_name
          console.log("Using full_name:", userName)
        } else if (payload.first_name && payload.last_name) {
          userName = `${payload.first_name} ${payload.last_name}`
          console.log("Using first_name + last_name:", userName)
        } else if (payload.first_name) {
          userName = payload.first_name
          console.log("Using first_name only:", userName)
        }

        // Try to get bank name from identity data if available
        if (payload.bank_name) {
          bankName = payload.bank_name
        } else if (payload.institution_name) {
          bankName = payload.institution_name
        } else {
          // Default bank name for sandbox
          bankName = "Lean Mock Bank"
        }

        console.log("Extracted identity info:", { userName, bankName })

        // Store the identity data in the entity service for future use
        await leanEntityService.storeIdentityData(entityId, payload)
      } else {
        console.warn("Unexpected identity response structure:", data)
      }

      return { bankName, userName }
    } catch (error) {
      console.error("Error fetching identity data:", error)
      return { bankName: "Demo Bank", userName: "Demo User" }
    }
  }

  // Function to create detailed success message
  const createSuccessMessage = async (entityId: string, userName: string, bankName: string): Promise<string> => {
    try {
      console.log("Creating detailed success message for entity:", entityId)

      // Fetch accounts to get account information
      const accounts = await fetchAccounts()

      if (accounts && accounts.length > 0) {
        // Filter accounts for this entity
        const entityAccounts = accounts.filter((account) => account.entityId === entityId)

        // Get account names/numbers
        const accountNames = entityAccounts
          .map(
            (account) => account.name || account.account_name || `Account ${account.account_id?.slice(-4) || "XXXX"}`,
          )
          .slice(0, 3) // Limit to first 3 accounts for readability

        let message = `Welcome ${userName}!\n\nConnection to ${bankName} successful!`

        if (accountNames.length > 0) {
          if (accountNames.length === 1) {
            message += `\n\nAccount connected: ${accountNames[0]}`
          } else if (accountNames.length <= 3) {
            message += `\n\nAccounts connected: ${accountNames.join(", ")}`
          } else {
            message += `\n\nAccounts connected: ${accountNames.slice(0, 2).join(", ")} and ${entityAccounts.length - 2} more`
          }
        }

        message += `\n\nYour financial data is now available in the app.`
        return message
      } else {
        return `Welcome ${userName}!\n\nBank connection successful! Your financial data is now available in the app.`
      }
    } catch (error) {
      console.error("Error creating detailed success message:", error)
      return `Welcome ${userName}!\n\nBank connection successful! Your financial data is now available in the app.`
    }
  }

  // Injected JS string — dynamically built when credentials are ready
  const getInjectedJS = () => `
    console.log("Injecting Lean SDK script...");
    
    // iOS-specific detection
    if (window.webkit && window.webkit.messageHandlers) {
      console.log("iOS WebKit detected");
    }
    
    // Add console.log listener to capture logs from WebView
    (function() {
      var originalConsoleLog = console.log;
      console.log = function() {
        originalConsoleLog.apply(console, arguments);
        if (window.ReactNativeWebView) {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'console.log',
            data: Array.from(arguments).map(arg => typeof arg === 'object' ? JSON.stringify(arg) : arg).join(' ')
          }));
        }
      };
      
      var originalConsoleError = console.error;
      console.error = function() {
        originalConsoleError.apply(console, arguments);
        if (window.ReactNativeWebView) {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'console.error',
            data: Array.from(arguments).map(arg => typeof arg === 'object' ? JSON.stringify(arg) : arg).join(' ')
          }));
        }
      };
    })();
    
    // iOS-specific initialization function
    function initializeLean() {
      console.log("Attempting to initialize Lean SDK...");
      var script = document.createElement('script');
      script.src = 'https://cdn.leantech.me/link/loader/prod/ae/latest/lean-link-loader.min.js';
      script.onload = function() {
        console.log("Lean SDK script loaded successfully");
        
        try {
          console.log("Initializing Lean connection with customer token");
          
          // Add delay for iOS WebView
          setTimeout(function() {
            if (typeof Lean !== 'undefined') {
              console.log("Lean object found, connecting...");
              Lean.connect({
                app_token: "${appToken}",
                customer_id: "${customerId}",
                permissions: ["identity", "accounts", "balance", "transactions"],
                sandbox: true,
                access_token: "${accessToken}",
                callback: function(response) {
                  console.log("Lean callback received:", JSON.stringify(response));
                  if (window.ReactNativeWebView) {
                    window.ReactNativeWebView.postMessage(JSON.stringify({
                      type: 'lean-response',
                      data: response
                    }));
                  }
                }
              });
              // Post message immediately after Lean.connect is called
              if (window.ReactNativeWebView) {
                window.ReactNativeWebView.postMessage(JSON.stringify({
                  type: 'lean-connect-attempted',
                  data: 'Lean.connect was called.'
                }));
              }
            } else {
              console.error("Lean SDK not available after load.");
              if (window.ReactNativeWebView) {
                window.ReactNativeWebView.postMessage(JSON.stringify({
                  type: 'error',
                  data: 'Lean SDK not available after load.'
                }));
              }
            }
          }, ${Platform.OS === "ios" ? 3000 : 100}); // Increased delay for iOS to 3 seconds
        } catch (err) {
          console.error("Error initializing Lean:", err.message);
          if (window.ReactNativeWebView) {
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'error',
              data: 'Error initializing Lean: ' + err.message
            }));
          }
        }
      };
      
      script.onerror = function(err) {
        console.error("Failed to load Lean SDK script:", err);
        if (window.ReactNativeWebView) {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'error',
            data: 'Failed to load Lean SDK script'
          }));
        }
      };
      
      document.head.appendChild(script);
    }
    
    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initializeLean);
    } else {
      initializeLean();
    }
    true;
  `

  const htmlContent = `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
    <meta name="format-detection" content="telephone=no">
    <meta name="msapplication-tap-highlight" content="no">
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
        -webkit-tap-highlight-color: transparent;
        -webkit-touch-callout: none;
        -webkit-user-select: none;
        user-select: none;
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
        -webkit-text-size-adjust: 100%;
        -ms-text-size-adjust: 100%;
      }
      body {
        min-height: 100vh;
        min-height: -webkit-fill-available;
        padding: 0;
        margin: 0;
        position: relative;
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
        -webkit-appearance: none;
        -webkit-tap-highlight-color: transparent;
      }
      /* iOS specific fixes */
      input, textarea, select {
        -webkit-appearance: none;
        -webkit-border-radius: 0;
        border-radius: 0;
      }
    </style>
  </head>
  <body>
    <div id="loading">
      <p>Loading bank connection...</p>
      <p style="font-size: 14px; color: #888;">Please wait while we prepare your secure connection...</p>
    </div>
    <script>
      // iOS WebView ready check
      document.addEventListener('DOMContentLoaded', function() {
        console.log('DOM Content Loaded - iOS WebView Ready');
        if (window.ReactNativeWebView) {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'dom-ready',
            data: 'DOM is ready for iOS'
          }));
        }
      });
    </script>
  </body>
</html>`

  const handleMessage = async (event) => {
    try {
      const message = JSON.parse(event.nativeEvent.data)

      if (message.type === "console.log" || message.type === "console.error") {
        console.log(`WebView ${message.type}:`, message.data)
        setDebugInfo((prev) => prev + "\n" + message.data)
      } else if (message.type === "dom-ready") {
        console.log("WebView DOM Ready:", message.data)
      } else if (message.type === "lean-connect-attempted") {
        console.log("Lean.connect attempted:", message.data)
        // No setIsLoading(false) here, as we're removing the overlay
      } else if (message.type === "error") {
        console.error("WebView error:", message.data)
        setError(message.data)
        // No setIsLoading(false) here, as we're removing the overlay
      } else if (message.type === "lean-response") {
        const response = message.data
        console.log("Lean SDK response:", response)
        // No setIsLoading(false) here, as we're removing the overlay

        if (response.status === "SUCCESS") {
          console.log("Bank connection successful, fetching entity ID...")
          try {
            // Fetch the entity ID after successful connection
            const entityId = await fetchEntityId(customerId, accessToken)

            if (entityId) {
              console.log("Successfully retrieved entity ID:", entityId)

              // Fetch identity data to get real name using the app token
              const { bankName, userName } = await fetchIdentityAndGetName(entityId)

              // Store the entity ID with real identity information
              await leanEntityService.storeEntityId(entityId, bankName, userName)

              // Create detailed success message with the real user name
              const detailedMessage = await createSuccessMessage(entityId, userName, bankName)

              onClose("SUCCESS", detailedMessage, entityId)
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
          // No setIsLoading(false) here, as we're removing the overlay
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
      // No setIsLoading(false) here, as we're removing the overlay
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
            {/* Removed isLoading overlay */}
            {error && customerId && (
              <View style={styles.errorBanner}>
                <Text style={styles.errorBannerText}>Error: {error}</Text>
                <Button title="Try Again" onPress={() => setError(null)} />
              </View>
            )}
            {customerId && accessToken && (
              <WebView
                ref={webViewRef}
                source={{ html: htmlContent }}
                originWhitelist={["*"]}
                javaScriptEnabled={true}
                domStorageEnabled={true}
                startInLoadingState={Platform.OS === "android"} // Keep for Android if needed
                injectedJavaScript={getInjectedJS()}
                injectedJavaScriptBeforeContentLoaded={`
    window.isReactNativeWebView = true;
    true;
  `}
                onMessage={handleMessage}
                onLoadStart={() => {
                  /* No setIsLoading(true) here */
                }}
                onLoadEnd={() => {
                  console.log("WebView onLoadEnd fired (initial HTML loaded).")
                }}
                onError={({ nativeEvent }) => {
                  setError(nativeEvent.description || "Failed to load")
                  console.error("WebView error:", nativeEvent)
                }}
                style={styles.webView}
                allowsInlineMediaPlayback={true}
                mediaPlaybackRequiresUserAction={false}
                mixedContentMode="always"
                scalesPageToFit={Platform.OS === "ios"}
                scrollEnabled={true}
                bounces={Platform.OS === "android"}
                showsVerticalScrollIndicator={Platform.OS === "android"}
                showsHorizontalScrollIndicator={false}
                automaticallyAdjustContentInsets={Platform.OS === "android"}
                contentInsetAdjustmentBehavior={Platform.OS === "ios" ? "never" : undefined}
                keyboardDisplayRequiresUserAction={false}
                allowsBackForwardNavigationGestures={false}
                decelerationRate={Platform.OS === "ios" ? "normal" : 0.998}
                overScrollMode={Platform.OS === "android" ? "always" : undefined}
                nestedScrollEnabled={Platform.OS === "android"}
                allowsFullscreenVideo={true}
                allowsProtectedMedia={true}
                dataDetectorTypes={Platform.OS === "ios" ? "none" : undefined}
                hideKeyboardAccessoryView={true}
                suppressMenuItems={Platform.OS === "ios" ? ["copy", "paste", "select", "selectAll"] : undefined}
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
  // Removed loadingOverlay style
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
