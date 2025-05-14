import AsyncStorage from "@react-native-async-storage/async-storage"

// Storage keys
const ACCOUNTS_CACHE_KEY = "accounts_cache"
const TRANSACTIONS_CACHE_PREFIX = "transactions_cache_"
const CACHE_EXPIRY_KEY = "cache_expiry"

// Cache expiry time in milliseconds (default: 24 hours)
const DEFAULT_CACHE_EXPIRY = 24 * 60 * 60 * 1000

export class StorageService {
  /**
   * Save accounts data to cache
   */
  static async saveAccounts(accounts: any[]): Promise<void> {
    try {
      const cacheData = {
        accounts,
        timestamp: Date.now(),
      }
      await AsyncStorage.setItem(ACCOUNTS_CACHE_KEY, JSON.stringify(cacheData))
    } catch (error) {
      console.error("Error saving accounts to cache:", error)
    }
  }

  /**
   * Get cached accounts data
   */
  static async getCachedAccounts(): Promise<{ accounts: any[]; timestamp: number } | null> {
    try {
      const cachedData = await AsyncStorage.getItem(ACCOUNTS_CACHE_KEY)
      if (cachedData) {
        return JSON.parse(cachedData)
      }
      return null
    } catch (error) {
      console.error("Error getting cached accounts:", error)
      return null
    }
  }

  /**
   * Cache transactions data
   */
  static async cacheTransactions(
    entityId: string,
    accountIds: string[],
    startDate: string,
    endDate: string,
    transactions: any[],
  ): Promise<void> {
    try {
      // Create a unique key based on the parameters
      const cacheKey = this.getTransactionsCacheKey(entityId, accountIds, startDate, endDate)

      const cacheData = {
        transactions,
        timestamp: Date.now(),
      }

      await AsyncStorage.setItem(cacheKey, JSON.stringify(cacheData))
    } catch (error) {
      console.error("Error caching transactions:", error)
    }
  }

  /**
   * Get cached transactions data
   */
  static async getCachedTransactions(
    entityId: string,
    accountIds: string[],
    startDate: string,
    endDate: string,
  ): Promise<{ transactions: any[]; timestamp: number } | null> {
    try {
      // Create a unique key based on the parameters
      const cacheKey = this.getTransactionsCacheKey(entityId, accountIds, startDate, endDate)

      const cachedData = await AsyncStorage.getItem(cacheKey)
      if (cachedData) {
        return JSON.parse(cachedData)
      }
      return null
    } catch (error) {
      console.error("Error getting cached transactions:", error)
      return null
    }
  }

  /**
   * Generate a unique cache key for transactions
   */
  private static getTransactionsCacheKey(
    entityId: string,
    accountIds: string[],
    startDate: string,
    endDate: string,
  ): string {
    // Sort account IDs to ensure consistent key regardless of order
    const sortedAccountIds = [...accountIds].sort().join("_")
    return `${TRANSACTIONS_CACHE_PREFIX}${entityId}_${sortedAccountIds}_${startDate}_${endDate}`
  }

  /**
   * Check if cache is still valid based on timestamp
   */
  static isCacheValid(timestamp: number, maxAge: number = DEFAULT_CACHE_EXPIRY): boolean {
    const now = Date.now()
    return now - timestamp < maxAge
  }

  /**
   * Clear all cached data
   */
  static async clearAllCache(): Promise<void> {
    try {
      // Get all keys
      const keys = await AsyncStorage.getAllKeys()

      // Filter cache keys
      const cacheKeys = keys.filter(
        (key) => key === ACCOUNTS_CACHE_KEY || key.startsWith(TRANSACTIONS_CACHE_PREFIX) || key === CACHE_EXPIRY_KEY,
      )

      // Remove all cache keys
      if (cacheKeys.length > 0) {
        await AsyncStorage.multiRemove(cacheKeys)
        console.log(`Cleared ${cacheKeys.length} cache items`)
      }
    } catch (error) {
      console.error("Error clearing cache:", error)
      throw error
    }
  }

  /**
   * Clear only transactions cache
   */
  static async clearTransactionsCache(): Promise<void> {
    try {
      // Get all keys
      const keys = await AsyncStorage.getAllKeys()

      // Filter transaction cache keys
      const transactionCacheKeys = keys.filter((key) => key.startsWith(TRANSACTIONS_CACHE_PREFIX))

      // Remove transaction cache keys
      if (transactionCacheKeys.length > 0) {
        await AsyncStorage.multiRemove(transactionCacheKeys)
        console.log(`Cleared ${transactionCacheKeys.length} transaction cache items`)
      }
    } catch (error) {
      console.error("Error clearing transactions cache:", error)
      throw error
    }
  }

  /**
   * Clear old cached data (older than the expiry time)
   */
  static async clearOldCache(): Promise<void> {
    try {
      // Get all keys
      const keys = await AsyncStorage.getAllKeys()

      // Filter cache keys
      const cacheKeys = keys.filter((key) => key === ACCOUNTS_CACHE_KEY || key.startsWith(TRANSACTIONS_CACHE_PREFIX))

      // Check each cache item
      const keysToRemove = []
      for (const key of cacheKeys) {
        const cachedData = await AsyncStorage.getItem(key)
        if (cachedData) {
          const data = JSON.parse(cachedData)
          if (!this.isCacheValid(data.timestamp)) {
            keysToRemove.push(key)
          }
        }
      }

      // Remove expired cache keys
      if (keysToRemove.length > 0) {
        await AsyncStorage.multiRemove(keysToRemove)
        console.log(`Cleared ${keysToRemove.length} expired cache items`)
      }
    } catch (error) {
      console.error("Error clearing old cache:", error)
    }
  }
}
