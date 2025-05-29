import AsyncStorage from "@react-native-async-storage/async-storage"

// Storage keys
const LEAN_ENTITY_ID_KEY = "lean_entity_id"
const LEAN_IDENTITY_KEY = "lean_identity"
const LEAN_IDENTITY_EXPIRY_KEY = "lean_identity_expiry"

// Cache expiry time for identity data (24 hours)
const IDENTITY_CACHE_EXPIRY = 24 * 60 * 60 * 1000

interface IdentityData {
  full_name?: string
  email?: string
  phone_number?: string
  date_of_birth?: string
  address?: any
  [key: string]: any
}

class LeanEntityService {
  /**
   * Store the entity ID from Lean SDK response
   */
  async storeEntityId(entityId: string): Promise<void> {
    try {
      await AsyncStorage.setItem(LEAN_ENTITY_ID_KEY, entityId)
      console.log("Stored entity ID:", entityId)
    } catch (error) {
      console.error("Error storing entity ID:", error)
      throw error
    }
  }

  /**
   * Get the stored entity ID
   */
  async getEntityId(): Promise<string | null> {
    try {
      const entityId = await AsyncStorage.getItem(LEAN_ENTITY_ID_KEY)
      return entityId
    } catch (error) {
      console.error("Error getting entity ID:", error)
      return null
    }
  }

  /**
   * Check if we have a valid entity ID
   */
  async hasValidEntityId(): Promise<boolean> {
    const entityId = await this.getEntityId()
    return entityId !== null && entityId.length > 0
  }

  /**
   * Fetch identity data for the entity using customer-scoped token
   */
  async fetchIdentity(entityId: string, customerToken: string): Promise<IdentityData | null> {
    try {
      // Check cache first
      const cachedIdentity = await this.getCachedIdentity()
      if (cachedIdentity) {
        console.log("Using cached identity data")
        return cachedIdentity
      }

      console.log("Fetching identity for entity:", entityId)

      const response = await fetch("https://sandbox.leantech.me/data/v1/identity", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${customerToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          entity_id: entityId,
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Failed to fetch identity: ${response.status} ${errorText}`)
      }

      const data = await response.json()
      console.log("Identity data received:", data)

      if (data.payload) {
        // Cache the identity data
        await this.cacheIdentity(data.payload)
        return data.payload
      }

      return null
    } catch (error) {
      console.error("Error fetching identity:", error)
      throw error
    }
  }

  /**
   * Fetch accounts for the entity using customer-scoped token
   */
  async fetchAccounts(entityId: string, customerToken: string): Promise<any[]> {
    try {
      console.log("Fetching accounts for entity:", entityId)

      const response = await fetch("https://sandbox.leantech.me/data/v1/accounts", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${customerToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          entity_id: entityId,
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Failed to fetch accounts: ${response.status} ${errorText}`)
      }

      const data = await response.json()
      console.log("Accounts data received:", data)

      if (data.payload && data.payload.accounts) {
        const accounts = data.payload.accounts.map((account: any) => ({
          ...account,
          id: account.account_id || account.id,
        }))
        return accounts
      }

      return []
    } catch (error) {
      console.error("Error fetching accounts:", error)
      throw error
    }
  }

  /**
   * Fetch transactions for a specific account using customer-scoped token
   */
  async fetchTransactions(
    entityId: string,
    accountId: string,
    customerToken: string,
    fromDate?: string,
    toDate?: string,
    limit = 50,
    offset = 0,
  ): Promise<any> {
    try {
      console.log("Fetching transactions for entity:", entityId, "account:", accountId)

      const requestBody: any = {
        entity_id: entityId,
        account_id: accountId,
        limit,
        offset,
      }

      if (fromDate) requestBody.from_date = fromDate
      if (toDate) requestBody.to_date = toDate

      const response = await fetch("https://sandbox.leantech.me/data/v1/transactions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${customerToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Failed to fetch transactions: ${response.status} ${errorText}`)
      }

      const data = await response.json()
      console.log("Transactions data received:", data)

      if (data.payload && data.payload.transactions) {
        const transactions = data.payload.transactions.map((transaction: any, index: number) => ({
          ...transaction,
          account_id: accountId,
          id:
            transaction.id ||
            `${accountId}-${transaction.transaction_id || index}-${Math.random().toString(36).substring(2, 10)}`,
        }))

        return {
          transactions,
          totalCount: data.payload.total_count || transactions.length,
          hasMore: transactions.length >= limit,
        }
      }

      return {
        transactions: [],
        totalCount: 0,
        hasMore: false,
      }
    } catch (error) {
      console.error("Error fetching transactions:", error)
      throw error
    }
  }

  /**
   * Cache identity data
   */
  private async cacheIdentity(identity: IdentityData): Promise<void> {
    try {
      const cacheData = {
        identity,
        timestamp: Date.now(),
      }
      await AsyncStorage.setItem(LEAN_IDENTITY_KEY, JSON.stringify(cacheData))
      await AsyncStorage.setItem(LEAN_IDENTITY_EXPIRY_KEY, (Date.now() + IDENTITY_CACHE_EXPIRY).toString())
    } catch (error) {
      console.error("Error caching identity:", error)
    }
  }

  /**
   * Get cached identity data
   */
  private async getCachedIdentity(): Promise<IdentityData | null> {
    try {
      const cachedData = await AsyncStorage.getItem(LEAN_IDENTITY_KEY)
      const expiryStr = await AsyncStorage.getItem(LEAN_IDENTITY_EXPIRY_KEY)

      if (cachedData && expiryStr) {
        const expiry = Number.parseInt(expiryStr, 10)
        if (Date.now() < expiry) {
          const data = JSON.parse(cachedData)
          return data.identity
        }
      }

      return null
    } catch (error) {
      console.error("Error getting cached identity:", error)
      return null
    }
  }

  /**
   * Clear all entity data
   */
  async clearEntityData(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([LEAN_ENTITY_ID_KEY, LEAN_IDENTITY_KEY, LEAN_IDENTITY_EXPIRY_KEY])
      console.log("Cleared all entity data")
    } catch (error) {
      console.error("Error clearing entity data:", error)
    }
  }
}

// Export a singleton instance
export const leanEntityService = new LeanEntityService()
