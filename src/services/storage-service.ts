import AsyncStorage from "@react-native-async-storage/async-storage"

// Keys for AsyncStorage
const KEYS = {
  TRANSACTIONS: "transactions",
  ACCOUNTS: "accounts",
  LAST_SYNC: "lastSync",
  TRANSACTION_CACHE: "transactionCache",
}

/**
 * Storage service for caching transactions and other data
 */
export class StorageService {
  /**
   * Save transactions to AsyncStorage with a specific cache key based on parameters
   */
  static async cacheTransactions(
    entityId: string,
    accountIds: string[],
    startDate: string,
    endDate: string,
    transactions: any[],
  ): Promise<void> {
    try {
      // Create a cache key based on the query parameters
      const cacheKey = this.generateCacheKey(entityId, accountIds, startDate, endDate)

      // Store the transactions with metadata
      const cacheData = {
        transactions,
        timestamp: Date.now(),
        params: { entityId, accountIds, startDate, endDate },
      }

      await AsyncStorage.setItem(`${KEYS.TRANSACTION_CACHE}:${cacheKey}`, JSON.stringify(cacheData))

      console.log(`Cached ${transactions.length} transactions with key: ${cacheKey}`)

      // Update the list of cache keys for management
      await this.updateCacheKeysList(cacheKey)
    } catch (error) {
      console.error("Error caching transactions:", error)
    }
  }

  /**
   * Get cached transactions if available
   */
  static async getCachedTransactions(
    entityId: string,
    accountIds: string[],
    startDate: string,
    endDate: string,
  ): Promise<{ transactions: any[]; timestamp: number } | null> {
    try {
      const cacheKey = this.generateCacheKey(entityId, accountIds, startDate, endDate)
      const cachedData = await AsyncStorage.getItem(`${KEYS.TRANSACTION_CACHE}:${cacheKey}`)

      if (cachedData) {
        const data = JSON.parse(cachedData)
        console.log(`Retrieved ${data.transactions.length} cached transactions from key: ${cacheKey}`)
        return {
          transactions: data.transactions,
          timestamp: data.timestamp,
        }
      }

      return null
    } catch (error) {
      console.error("Error retrieving cached transactions:", error)
      return null
    }
  }

  /**
   * Check if cache is valid (not expired)
   */
  static isCacheValid(timestamp: number, maxAgeMs = 3600000): boolean {
    // Default: 1 hour
    return Date.now() - timestamp < maxAgeMs
  }

  /**
   * Save accounts to AsyncStorage
   */
  static async saveAccounts(accounts: any[]): Promise<void> {
    try {
      await AsyncStorage.setItem(
        KEYS.ACCOUNTS,
        JSON.stringify({
          accounts,
          timestamp: Date.now(),
        }),
      )
      console.log(`Saved ${accounts.length} accounts to storage`)
    } catch (error) {
      console.error("Error saving accounts:", error)
    }
  }

  /**
   * Get cached accounts if available
   */
  static async getCachedAccounts(): Promise<{ accounts: any[]; timestamp: number } | null> {
    try {
      const cachedData = await AsyncStorage.getItem(KEYS.ACCOUNTS)

      if (cachedData) {
        const data = JSON.parse(cachedData)
        console.log(`Retrieved ${data.accounts.length} cached accounts`)
        return {
          accounts: data.accounts,
          timestamp: data.timestamp,
        }
      }

      return null
    } catch (error) {
      console.error("Error retrieving cached accounts:", error)
      return null
    }
  }

  /**
   * Clear all cached data
   */
  static async clearAllCache(): Promise<void> {
    try {
      // Get all cache keys
      const allKeys = await AsyncStorage.getAllKeys()
      const cacheKeys = allKeys.filter((key) => key.startsWith(KEYS.TRANSACTION_CACHE))

      // Remove all cache items
      if (cacheKeys.length > 0) {
        await AsyncStorage.multiRemove(cacheKeys)
      }

      // Clear the cache keys list
      await AsyncStorage.removeItem("cacheKeysList")

      console.log(`Cleared ${cacheKeys.length} cache items`)
    } catch (error) {
      console.error("Error clearing cache:", error)
    }
  }

  /**
   * Clear old cache entries (older than maxAgeMs)
   */
  static async clearOldCache(maxAgeMs = 86400000): Promise<void> {
    // Default: 24 hours
    try {
      // Get the list of cache keys
      const cacheKeysListStr = await AsyncStorage.getItem("cacheKeysList")
      if (!cacheKeysListStr) return

      const cacheKeysList = JSON.parse(cacheKeysListStr)
      const keysToRemove = []
      const currentTime = Date.now()

      // Check each cache entry
      for (const cacheKey of cacheKeysList) {
        const cacheItemKey = `${KEYS.TRANSACTION_CACHE}:${cacheKey}`
        const cachedData = await AsyncStorage.getItem(cacheItemKey)

        if (cachedData) {
          const data = JSON.parse(cachedData)
          if (currentTime - data.timestamp > maxAgeMs) {
            keysToRemove.push(cacheItemKey)
          }
        } else {
          // If the item doesn't exist, add it to removal list
          keysToRemove.push(cacheItemKey)
        }
      }

      // Remove old cache entries
      if (keysToRemove.length > 0) {
        await AsyncStorage.multiRemove(keysToRemove)
        console.log(`Removed ${keysToRemove.length} old cache entries`)

        // Update the cache keys list
        const updatedKeysList = cacheKeysList.filter(
          (key) => !keysToRemove.includes(`${KEYS.TRANSACTION_CACHE}:${key}`),
        )
        await AsyncStorage.setItem("cacheKeysList", JSON.stringify(updatedKeysList))
      }
    } catch (error) {
      console.error("Error clearing old cache:", error)
    }
  }

  /**
   * Generate a cache key based on query parameters
   */
  private static generateCacheKey(entityId: string, accountIds: string[], startDate: string, endDate: string): string {
    // Sort account IDs to ensure consistent keys regardless of order
    const sortedAccountIds = [...accountIds].sort()
    return `${entityId}_${sortedAccountIds.join("-")}_${startDate}_${endDate}`
  }

  /**
   * Update the list of cache keys for management
   */
  private static async updateCacheKeysList(newKey: string): Promise<void> {
    try {
      const cacheKeysListStr = await AsyncStorage.getItem("cacheKeysList")
      const cacheKeysList = cacheKeysListStr ? JSON.parse(cacheKeysListStr) : []

      // Add the new key if it doesn't exist
      if (!cacheKeysList.includes(newKey)) {
        cacheKeysList.push(newKey)
        await AsyncStorage.setItem("cacheKeysList", JSON.stringify(cacheKeysList))
      }
    } catch (error) {
      console.error("Error updating cache keys list:", error)
    }
  }
}
