import { CLIENT_ID, CLIENT_SECRET } from "@env"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { authService } from "./auth-service"

// Storage keys
const LEAN_CUSTOMER_ID_KEY = "lean_customer_id"
const LEAN_CUSTOMER_TOKEN_KEY = "lean_customer_token"
const LEAN_CUSTOMER_TOKEN_EXPIRY_KEY = "lean_customer_token_expiry"

interface CustomerTokenResponse {
  access_token: string
  token_type: string
  expires_in: number
  scope: string
}

class LeanCustomerService {
  /**
   * Get or create a Lean customer ID for the current user
   */
  async getOrCreateCustomerId(userId: string): Promise<string> {
    try {
      // First check if we have a stored customer ID
      const storedCustomerId = await AsyncStorage.getItem(LEAN_CUSTOMER_ID_KEY)
      if (storedCustomerId) {
        console.log("Using stored Lean customer ID:", storedCustomerId)
        return storedCustomerId
      }

      // If not, create a new customer
      console.log("Creating new Lean customer for user:", userId)
      const customerId = await this.createCustomer(userId)

      if (!customerId) {
        throw new Error("Failed to create customer: No customer ID returned")
      }

      // Store the customer ID for future use
      await AsyncStorage.setItem(LEAN_CUSTOMER_ID_KEY, customerId)
      console.log("Stored new customer ID:", customerId)

      return customerId
    } catch (error) {
      console.error("Error getting/creating Lean customer:", error)
      throw new Error(`Failed to get/create Lean customer: ${error.message}`)
    }
  }

  /**
   * Create a new Lean customer using the API token
   */
  private async createCustomer(userId: string): Promise<string> {
    try {
      // Get API bearer token (not customer-scoped)
      const bearerToken = await authService.getToken()

      // Create a unique app_user_id based on the user's ID
      const appUserId = `user_${userId}_${Date.now()}`

      const response = await fetch("https://sandbox.leantech.me/customers/v1", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${bearerToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          app_user_id: appUserId,
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Failed to create customer: ${response.status} ${errorText}`)
      }

      const data = await response.json()
      console.log("Customer created successfully:", data)

      const customerId = data.customer_id || data.id

      if (!customerId) {
        console.error("API response missing customer ID:", data)
        throw new Error("API response missing customer ID")
      }

      return customerId
    } catch (error) {
      console.error("Error creating Lean customer:", error)
      throw error
    }
  }

  /**
   * Get a customer-specific access token for the Lean SDK
   */
  async getCustomerToken(customerId: string): Promise<string> {
    try {
      // Check if we have a valid cached token
      const cachedToken = await AsyncStorage.getItem(LEAN_CUSTOMER_TOKEN_KEY)
      const expiryStr = await AsyncStorage.getItem(LEAN_CUSTOMER_TOKEN_EXPIRY_KEY)

      if (cachedToken && expiryStr) {
        const expiry = Number.parseInt(expiryStr, 10)
        const now = Date.now()

        // If token is still valid (with 5 minute buffer), return it
        if (expiry > now + 5 * 60 * 1000) {
          console.log("Using cached customer token")
          return cachedToken
        }
      }

      // Get a new customer-scoped token
      console.log("Getting new customer token for:", customerId)

      const customerScope = `customer.${customerId}`

      const formData = new URLSearchParams()
      formData.append("client_id", CLIENT_ID)
      formData.append("client_secret", CLIENT_SECRET)
      formData.append("grant_type", "client_credentials")
      formData.append("scope", customerScope)

      const response = await fetch("https://auth.sandbox.leantech.me/oauth2/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: formData.toString(),
      })

      const responseText = await response.text()
      console.log("Customer token response status:", response.status)

      if (!response.ok) {
        throw new Error(`Failed to get customer token: ${response.status} ${responseText}`)
      }

      const data: CustomerTokenResponse = JSON.parse(responseText)

      // Calculate expiry time
      const expiryTime = Date.now() + data.expires_in * 1000

      // Cache the token
      await AsyncStorage.setItem(LEAN_CUSTOMER_TOKEN_KEY, data.access_token)
      await AsyncStorage.setItem(LEAN_CUSTOMER_TOKEN_EXPIRY_KEY, expiryTime.toString())

      console.log("Customer token obtained successfully")
      return data.access_token
    } catch (error) {
      console.error("Error getting customer token:", error)
      throw error
    }
  }

  /**
   * Force refresh the customer token
   */
  async refreshCustomerToken(customerId: string): Promise<string> {
    try {
      // Clear existing token
      await AsyncStorage.multiRemove([LEAN_CUSTOMER_TOKEN_KEY, LEAN_CUSTOMER_TOKEN_EXPIRY_KEY])

      // Get a new token
      return this.getCustomerToken(customerId)
    } catch (error) {
      console.error("Error refreshing customer token:", error)
      throw error
    }
  }

  /**
   * Clear stored customer data
   */
  async clearCustomerData(): Promise<void> {
    await AsyncStorage.multiRemove([LEAN_CUSTOMER_ID_KEY, LEAN_CUSTOMER_TOKEN_KEY, LEAN_CUSTOMER_TOKEN_EXPIRY_KEY])
  }
}

// Export a singleton instance
export const leanCustomerService = new LeanCustomerService()
