import { CLIENT_ID, CLIENT_SECRET, AUTH_URL } from "@env"

interface TokenResponse {
  access_token: string
  token_type: string
  expires_in: number
  scope: string
  jti: string
}

interface TokenData {
  token: string
  expiresAt: number
}

class AuthService {
  private tokenData: TokenData | null = null

  /**
   * Get a valid bearer token, refreshing if necessary
   */
  async getToken(): Promise<string> {
    // If we have a token and it's not expired, return it
    if (this.tokenData && this.tokenData.expiresAt > Date.now()) {
      console.log("Using cached token")
      return this.tokenData.token
    }

    // Otherwise, fetch a new token
    console.log("Fetching new token")
    return this.fetchNewToken()
  }

  /**
   * Fetch a new OAuth token from the server
   */
  private async fetchNewToken(): Promise<string> {
    try {
      console.log("Requesting token from:", AUTH_URL)

      // Create form data for token request
      const formData = new URLSearchParams()
      formData.append("grant_type", "client_credentials")
      formData.append("client_id", CLIENT_ID)
      formData.append("client_secret", CLIENT_SECRET)

      // Try without specifying a scope - many OAuth servers will default to all allowed scopes
      // Don't add any scope parameter

      console.log("Request body:", formData.toString())

      // Make the request
      const response = await fetch(AUTH_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: formData.toString(),
      })

      // Log the full response for debugging
      const responseText = await response.text()
      console.log("Response status:", response.status)
      console.log("Response body:", responseText)

      if (!response.ok) {
        // If the first attempt fails, try with a specific scope
        if (response.status === 400 && responseText.includes("invalid_scope")) {
          console.log("Retrying with specific scope...")
          return this.retryWithScope()
        }

        console.error("Token request failed:", response.status, responseText)
        throw new Error(`Failed to get token: ${response.status} ${responseText}`)
      }

      // Parse the response
      let data: TokenResponse
      try {
        data = JSON.parse(responseText)
      } catch (e) {
        throw new Error(`Failed to parse token response: ${e.message}`)
      }

      // Calculate expiration time (subtract 5 minutes for safety margin)
      const expiresAt = Date.now() + (data.expires_in - 300) * 1000

      // Store the token data
      this.tokenData = {
        token: data.access_token,
        expiresAt,
      }

      console.log("Token obtained successfully, expires in", data.expires_in, "seconds")
      return data.access_token
    } catch (error) {
      console.error("Error fetching token:", error)
      throw new Error(`Authentication failed: ${error.message}`)
    }
  }

  /**
   * Retry token request with a specific scope
   */
  private async retryWithScope(): Promise<string> {
    try {
      // Try with a specific scope
      const formData = new URLSearchParams()
      formData.append("grant_type", "client_credentials")
      formData.append("client_id", CLIENT_ID)
      formData.append("client_secret", CLIENT_SECRET)
      formData.append("scope", "api")

      console.log("Retry request body:", formData.toString())

      const response = await fetch(AUTH_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: formData.toString(),
      })

      const responseText = await response.text()
      console.log("Retry response status:", response.status)
      console.log("Retry response body:", responseText)

      if (!response.ok) {
        console.error("Retry token request failed:", response.status, responseText)
        throw new Error(`Failed to get token: ${response.status} ${responseText}`)
      }

      const data = JSON.parse(responseText)

      // Calculate expiration time (subtract 5 minutes for safety margin)
      const expiresAt = Date.now() + (data.expires_in - 300) * 1000

      // Store the token data
      this.tokenData = {
        token: data.access_token,
        expiresAt,
      }

      console.log("Token obtained successfully on retry, expires in", data.expires_in, "seconds")
      return data.access_token
    } catch (error) {
      console.error("Error in retry:", error)
      throw error
    }
  }

  /**
   * Force refresh the token regardless of expiration
   */
  async refreshToken(): Promise<string> {
    this.tokenData = null
    return this.getToken()
  }
}

// Export a singleton instance
export const authService = new AuthService()
