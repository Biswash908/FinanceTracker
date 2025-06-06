import AsyncStorage from "@react-native-async-storage/async-storage"

// Storage keys
const LEAN_ENTITIES_KEY = "lean_entities" // Changed from single entity to multiple
const LEAN_IDENTITY_PREFIX = "lean_identity_"
const LEAN_IDENTITY_EXPIRY_PREFIX = "lean_identity_expiry_"

// Cache expiry time for identity data (24 hours)
const IDENTITY_CACHE_EXPIRY = 24 * 60 * 60 * 1000

interface IdentityData {
  full_name?: string
  email_address?: string
  mobile_number?: string
  birth_date?: string
  address?: string
  national_identity_number?: string
  gender?: string
  [key: string]: any
}

interface EntityInfo {
  entityId: string
  bankName?: string
  userName?: string
  connectedAt: number
  accounts?: any[]
  identityData?: IdentityData
}

class LeanEntityService {
  /**
   * Store a new entity ID from Lean SDK response
   */
  async storeEntityId(entityId: string, bankName?: string, userName?: string): Promise<void> {
    try {
      const entities = await this.getAllEntities()

      // Check if entity already exists
      const existingIndex = entities.findIndex((e) => e.entityId === entityId)

      const entityInfo: EntityInfo = {
        entityId,
        bankName: bankName || "Unknown Bank",
        userName: userName || "Unknown User",
        connectedAt: Date.now(),
      }

      if (existingIndex >= 0) {
        // Update existing entity
        entities[existingIndex] = { ...entities[existingIndex], ...entityInfo }
      } else {
        // Add new entity
        entities.push(entityInfo)
      }

      await AsyncStorage.setItem(LEAN_ENTITIES_KEY, JSON.stringify(entities))
      console.log("Stored entity:", entityInfo)
    } catch (error) {
      console.error("Error storing entity ID:", error)
      throw error
    }
  }

  /**
   * Store identity data for an entity
   */
  async storeIdentityData(entityId: string, identityData: IdentityData): Promise<void> {
    try {
      const entities = await this.getAllEntities()
      const entityIndex = entities.findIndex((e) => e.entityId === entityId)

      if (entityIndex >= 0) {
        // Update the entity with identity data
        entities[entityIndex].identityData = identityData

        // Also update the userName if we have full_name
        if (identityData.full_name) {
          entities[entityIndex].userName = identityData.full_name
        }

        await AsyncStorage.setItem(LEAN_ENTITIES_KEY, JSON.stringify(entities))
        console.log("Stored identity data for entity:", entityId, identityData)
      }

      // Also cache the identity data separately
      await this.cacheIdentity(entityId, identityData)
    } catch (error) {
      console.error("Error storing identity data:", error)
    }
  }

  /**
   * Get identity data for an entity
   */
  async getIdentityData(entityId: string): Promise<IdentityData | null> {
    try {
      // First try to get from entity info
      const entities = await this.getAllEntities()
      const entity = entities.find((e) => e.entityId === entityId)

      if (entity && entity.identityData) {
        return entity.identityData
      }

      // Fallback to cached identity
      return await this.getCachedIdentity(entityId)
    } catch (error) {
      console.error("Error getting identity data:", error)
      return null
    }
  }

  /**
   * Get all stored entities
   */
  async getAllEntities(): Promise<EntityInfo[]> {
    try {
      const entitiesData = await AsyncStorage.getItem(LEAN_ENTITIES_KEY)
      if (entitiesData) {
        return JSON.parse(entitiesData)
      }
      return []
    } catch (error) {
      console.error("Error getting entities:", error)
      return []
    }
  }

  /**
   * Get the primary (first) entity ID for backward compatibility
   */
  async getEntityId(): Promise<string | null> {
    try {
      const entities = await this.getAllEntities()
      return entities.length > 0 ? entities[0].entityId : null
    } catch (error) {
      console.error("Error getting primary entity ID:", error)
      return null
    }
  }

  /**
   * Get all entity IDs
   */
  async getAllEntityIds(): Promise<string[]> {
    try {
      const entities = await this.getAllEntities()
      return entities.map((e) => e.entityId)
    } catch (error) {
      console.error("Error getting all entity IDs:", error)
      return []
    }
  }

  /**
   * Remove a specific entity
   */
  async removeEntity(entityId: string): Promise<void> {
    try {
      const entities = await this.getAllEntities()
      const filteredEntities = entities.filter((e) => e.entityId !== entityId)

      await AsyncStorage.setItem(LEAN_ENTITIES_KEY, JSON.stringify(filteredEntities))

      // Also clear cached identity for this entity
      await AsyncStorage.removeItem(`${LEAN_IDENTITY_PREFIX}${entityId}`)
      await AsyncStorage.removeItem(`${LEAN_IDENTITY_EXPIRY_PREFIX}${entityId}`)

      console.log("Removed entity:", entityId)
    } catch (error) {
      console.error("Error removing entity:", error)
      throw error
    }
  }

  /**
   * Update entity with additional information (like accounts)
   */
  async updateEntityInfo(entityId: string, updates: Partial<EntityInfo>): Promise<void> {
    try {
      const entities = await this.getAllEntities()
      const entityIndex = entities.findIndex((e) => e.entityId === entityId)

      if (entityIndex >= 0) {
        entities[entityIndex] = { ...entities[entityIndex], ...updates }
        await AsyncStorage.setItem(LEAN_ENTITIES_KEY, JSON.stringify(entities))
        console.log("Updated entity info:", entityId, updates)
      }
    } catch (error) {
      console.error("Error updating entity info:", error)
    }
  }

  /**
   * Check if we have any valid entity IDs
   */
  async hasValidEntityId(): Promise<boolean> {
    const entities = await this.getAllEntities()
    return entities.length > 0
  }

  /**
   * Fetch identity data for a specific entity
   */
  async fetchIdentity(entityId: string, customerToken: string): Promise<IdentityData | null> {
    try {
      // Check cache first
      const cachedIdentity = await this.getCachedIdentity(entityId)
      if (cachedIdentity) {
        console.log("Using cached identity data for entity:", entityId)
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
      console.log("Identity data received for entity:", entityId, data)

      // Check for the correct response structure with status: "OK" and payload
      if (data.status === "OK" && data.payload) {
        // Cache the identity data from the payload
        await this.cacheIdentity(entityId, data.payload)
        await this.storeIdentityData(entityId, data.payload)
        return data.payload
      } else {
        console.warn("Unexpected identity response structure:", data)
        return null
      }
    } catch (error) {
      console.error("Error fetching identity for entity:", entityId, error)
      throw error
    }
  }

  /**
   * Fetch accounts for a specific entity
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
      console.log("Accounts data received for entity:", entityId, data)

      if (data.payload && data.payload.accounts) {
        const accounts = data.payload.accounts.map((account: any) => ({
          ...account,
          id: account.account_id || account.id,
          entityId: entityId, // Add entity ID to each account
        }))

        // Update entity info with accounts
        await this.updateEntityInfo(entityId, { accounts })

        return accounts
      }

      return []
    } catch (error) {
      console.error("Error fetching accounts for entity:", entityId, error)
      throw error
    }
  }

  /**
   * Fetch transactions for a specific account and entity
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
      console.log("Transactions data received for entity:", entityId, "account:", accountId)

      if (data.payload && data.payload.transactions) {
        const transactions = data.payload.transactions.map((transaction: any, index: number) => ({
          ...transaction,
          account_id: accountId,
          entity_id: entityId, // Add entity ID to each transaction
          id:
            transaction.id ||
            `${entityId}-${accountId}-${transaction.transaction_id || index}-${Math.random().toString(36).substring(2, 10)}`,
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
      console.error("Error fetching transactions for entity:", entityId, "account:", accountId, error)
      throw error
    }
  }

  /**
   * Cache identity data for a specific entity
   */
  private async cacheIdentity(entityId: string, identity: IdentityData): Promise<void> {
    try {
      const cacheData = {
        identity,
        timestamp: Date.now(),
      }
      await AsyncStorage.setItem(`${LEAN_IDENTITY_PREFIX}${entityId}`, JSON.stringify(cacheData))
      await AsyncStorage.setItem(
        `${LEAN_IDENTITY_EXPIRY_PREFIX}${entityId}`,
        (Date.now() + IDENTITY_CACHE_EXPIRY).toString(),
      )
    } catch (error) {
      console.error("Error caching identity for entity:", entityId, error)
    }
  }

  /**
   * Get cached identity data for a specific entity
   */
  private async getCachedIdentity(entityId: string): Promise<IdentityData | null> {
    try {
      const cachedData = await AsyncStorage.getItem(`${LEAN_IDENTITY_PREFIX}${entityId}`)
      const expiryStr = await AsyncStorage.getItem(`${LEAN_IDENTITY_EXPIRY_PREFIX}${entityId}`)

      if (cachedData && expiryStr) {
        const expiry = Number.parseInt(expiryStr, 10)
        if (Date.now() < expiry) {
          const data = JSON.parse(cachedData)
          return data.identity
        }
      }

      return null
    } catch (error) {
      console.error("Error getting cached identity for entity:", entityId, error)
      return null
    }
  }

  /**
   * Clear all entity data
   */
  async clearEntityData(): Promise<void> {
    try {
      const entities = await this.getAllEntities()
      const keysToRemove = [LEAN_ENTITIES_KEY]

      // Add all identity cache keys
      for (const entity of entities) {
        keysToRemove.push(`${LEAN_IDENTITY_PREFIX}${entity.entityId}`)
        keysToRemove.push(`${LEAN_IDENTITY_EXPIRY_PREFIX}${entity.entityId}`)
      }

      await AsyncStorage.multiRemove(keysToRemove)
      console.log("Cleared all entity data")
    } catch (error) {
      console.error("Error clearing entity data:", error)
    }
  }
}

// Export a singleton instance
export const leanEntityService = new LeanEntityService()
