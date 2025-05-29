import { CLIENT_ID, CLIENT_SECRET } from "@env"

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
   * Get a valid bearer token for API access (not customer-scoped)
   */
  async getToken(): Promise<string> {
    // If we have a token and it's not expired, return it
    if (this.tokenData && this.tokenData.expiresAt > Date.now()) {
      console.log("Using cached API token")
      return this.tokenData.token
    }

    // Otherwise, fetch a new token
    console.log("Fetching new API token")
    return this.fetchNewToken()
  }

  /**
   * Fetch a new OAuth token for API access (scope: api)
   */
  private async fetchNewToken(): Promise<string> {
    try {
      console.log("Requesting API token from: https://auth.sandbox.leantech.me/oauth2/token")

      const formData = new URLSearchParams()
      formData.append("grant_type", "client_credentials")
      formData.append("client_id", CLIENT_ID)
      formData.append("client_secret", CLIENT_SECRET)
      formData.append("scope", "api")

      const response = await fetch("https://auth.sandbox.leantech.me/oauth2/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: formData.toString(),
      })

      const responseText = await response.text()
      console.log("API Token response status:", response.status)

      if (!response.ok) {
        throw new Error(`Failed to get API token: ${response.status} ${responseText}`)
      }

      const data: TokenResponse = JSON.parse(responseText)

      // Calculate expiration time (subtract 5 minutes for safety margin)
      const expiresAt = Date.now() + (data.expires_in - 300) * 1000

      // Store the token data
      this.tokenData = {
        token: data.access_token,
        expiresAt,
      }

      console.log("API token obtained successfully, expires in", data.expires_in, "seconds")
      return data.access_token
    } catch (error) {
      console.error("Error fetching API token:", error)
      throw new Error(`API authentication failed: ${error.message}`)
    }
  }

  /**
   * Force refresh the token regardless of expiration
   */
  async refreshToken(): Promise<string> {
    this.tokenData = null
    return this.getToken()
  }

  /**
   * Check if user is currently authenticated
   */
  isAuthenticated(): boolean {
    return this.tokenData !== null && this.tokenData.expiresAt > Date.now()
  }

  /**
   * Clear authentication data (logout)
   */
  logout(): void {
    this.tokenData = null
  }

  /**
   * Validate if we have a valid token or can get one
   */
  async validateToken(): Promise<boolean> {
    try {
      await this.getToken()
      return true
    } catch (error) {
      console.error("Token validation failed:", error)
      return false
    }
  }
}

// Export a singleton instance
export const authService = new AuthService()
