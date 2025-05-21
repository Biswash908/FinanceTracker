"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { WebView } from "react-native-webview"
import { View, Button, StyleSheet, SafeAreaView, Text, ActivityIndicator, Alert } from "react-native"
import { APP_TOKEN, CUSTOMER_ID } from "@env"
import { authService } from "../services/auth-service" // ✅ adjust path if needed

interface LeanWebViewProps {
  customerId?: string
  appToken?: string
  onClose: (status: string, message?: string) => void
}

const LeanWebView: React.FC<LeanWebViewProps> = ({ customerId = CUSTOMER_ID, appToken = APP_TOKEN, onClose }) => {
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tokenError, setTokenError] = useState<string | null>(null)

  // Get access token on mount
  useEffect(() => {
    const fetchToken = async () => {
      try {
        console.log("Fetching access token...")
        const token = await authService.getToken()
        console.log("Token received, length:", token?.length || 0)
        setAccessToken(token)
      } catch (err) {
        console.error("Failed to get token:", err)
        setTokenError(`Authentication failed: ${err.message || "Unknown error"}`)
      }
    }

    fetchToken()
  }, [])

  // Injected JS string — dynamically built when accessToken is ready
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
        console.log("Initializing Lean connection with access token");
        
        // Use the Lean Mock Bank for testing
        Lean.connect({
          app_token: "4595889f-d4ab-492d-9e79-eea3298a3a4f",
          customer_id: "de68d0c7-1428-4a3a-b24d-5d5fc71c82ff",
          permissions: ["identity", "accounts", "balance", "transactions"],
          sandbox: true,
          access_token: "eyJraWQiOiI2NGY4OWMxNy1lYjVkLTQ1NjMtODBkZS1iYzZmNDE0NzM2MGQiLCJhbGciOiJSUzI1NiJ9.eyJzdWIiOiI0NTk1ODg5Zi1kNGFiLTQ5MmQtOWU3OS1lZWEzMjk4YTNhNGYiLCJhdWQiOiI0NTk1ODg5Zi1kNGFiLTQ5MmQtOWU3OS1lZWEzMjk4YTNhNGYiLCJuYmYiOjE3NDc4NDExMzYsInNjb3BlIjpbImN1c3RvbWVyLnJlYWQiLCJiZW5lZmljaWFyeS53cml0ZSIsInBheW1lbnQud3JpdGUiLCJwYXltZW50LnJlYWQiLCJkZXN0aW5hdGlvbi5yZWFkIiwiY29ubmVjdC53cml0ZSIsImNvbm5lY3QucmVhZCIsImFwcGxpY2F0aW9uLnJlYWQiLCJiYW5rLnJlYWQiLCJrZXkucmVhZCJdLCJpc3MiOiJodHRwczovL2F1dGguc2FuZGJveC5sZWFudGVjaC5tZSIsImN1c3RvbWVycyI6W3siaWQiOiJkZTY4ZDBjNy0xNDI4LTRhM2EtYjI0ZC01ZDVmYzcxYzgyZmYifV0sImV4cCI6MTc0Nzg0NDczNiwiaWF0IjoxNzQ3ODQxMTM2LCJqdGkiOiJlNTkxMjA5OC05ZmM3LTQ4YmMtYjIzYS01YTJjZGFlNmU4NTIiLCJhcHBsaWNhdGlvbnMiOlt7ImlkIjoiNDU5NTg4OWYtZDRhYi00OTJkLTllNzktZWVhMzI5OGEzYTRmIn1dfQ.tTd5MHoIuh-ExIFRqhV4Z5SyOn5YVsnpT1ymq1UvXKh827TuXij8Qpisa0ch-4ctacgBgJMDmAdRI2SBWYwaDyo9Ylgr5xSWt_3GkZmFpI0AvYsmST-EiSJWe4Vz0FSmlvDj_qEwCl9D6-uyUDyn1UEdNkvw4z2ok17ISYKvlPm7CtugPdc6wysieCFK2xvF2CS3lW0j1LMaC9iP6se0CJCNWUMg9lxUj3N4tMXYQvkLw2os_pt6-S5mlT1DoZfaJOJRdOjr-lwVjmgVOqexRnvBDiqAtn8vn1zb15ZDz0TJimrk6eBFi5LYU8It8ROlAcV6NnEeG7re8yCSIW5KMg",
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
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta http-equiv="Content-Security-Policy" content="
          default-src * 'unsafe-inline' 'unsafe-eval' data: blob:;
          script-src * 'unsafe-inline' 'unsafe-eval';
          style-src * 'unsafe-inline';
          connect-src *;
          img-src * data: blob:;
          frame-src *;">
        <title>Connect Bank Account</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            margin: 0;
            padding: 0;
            height: 100vh;
            background-color: #f5f5f5;
          }
          #loading {
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100%;
            flex-direction: column;
          }
          #loading p {
            margin-top: 20px;
            color: #666;
          }
          #debug {
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            background: rgba(0,0,0,0.7);
            color: white;
            padding: 10px;
            font-size: 12px;
            max-height: 100px;
            overflow-y: auto;
          }
        </style>
      </head>
      <body>
        <div id="loading">
          <p>Loading bank connection...</p>
        </div>
        <div id="debug"></div>
      </body>
    </html>
  `

  const [debugInfo, setDebugInfo] = useState<string>("")

  const handleMessage = (event) => {
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
          onClose("SUCCESS", response.message || "Bank connected successfully")
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
        `Customer ID: ${customerId ? "Set (length: " + customerId.length + ")" : "Not set"}\n` +
        `Access Token: ${accessToken ? "Set (length: " + accessToken.length + ")" : "Not set"}\n\n` +
        `WebView Logs:\n${debugInfo || "No logs yet"}`,
      [{ text: "OK" }],
    )
  }

  // If we have a token error, show it
  if (tokenError) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerText}>Connect Bank Account</Text>
          <Button title="Close" onPress={() => onClose("ERROR", tokenError)} />
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Authentication Error</Text>
          <Text style={styles.errorDescription}>{tokenError}</Text>
          <Button
            title="Retry"
            onPress={() => {
              setTokenError(null)
              authService
                .refreshToken()
                .then((token) => {
                  setAccessToken(token)
                })
                .catch((err) => {
                  setTokenError(`Authentication failed: ${err.message || "Unknown error"}`)
                })
            }}
          />
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerText}>Connect Bank Account</Text>
        <View style={styles.headerButtons}>
          <Button title="Debug" onPress={showDebugInfo} />
          <View style={styles.buttonSpacer} />
          <Button title="Close" onPress={() => onClose("CANCELLED", "User closed the connection")} />
        </View>
      </View>

      {isLoading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3498db" />
          <Text style={styles.loadingText}>{accessToken ? "Loading bank connection..." : "Authenticating..."}</Text>
        </View>
      )}

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Error: {error}</Text>
          <Button title="Try Again" onPress={() => setError(null)} />
        </View>
      )}

      {accessToken && (
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
        />
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "white",
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 999,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
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
  },
  loadingContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.8)",
    zIndex: 1000,
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
})

export default LeanWebView
