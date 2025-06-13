import AsyncStorage from "@react-native-async-storage/async-storage"

// Storage keys
const ACCOUNTS_CACHE_PREFIX = "accounts_cache_" // Changed to support multiple entities
const TRANSACTIONS_CACHE_PREFIX = "transactions_cache_"
const BALANCES_CACHE_PREFIX = "balances_"
const CACHE_EXPIRY_KEY = "cache_expiry"

// Cache expiry time in milliseconds (default: 24 hours)
const DEFAULT_CACHE_EXPIRY = 24 * 60 * 60 * 1000

export class StorageService {
  /**
   * Save accounts data to cache for multiple entities
   */
  static async saveAccounts(accounts: any[], entityIds: string[] = []): Promise<void> {
    try {
      const cacheData = {
        accounts,
        entityIds,
        timestamp: Date.now(),
      }

      // Create a cache key based on entity IDs
      const cacheKey =
        entityIds.length > 0 ? `${ACCOUNTS_CACHE_PREFIX}${entityIds.sort().join("_")}` : `${ACCOUNTS_CACHE_PREFIX}all`

      await AsyncStorage.setItem(cacheKey, JSON.stringify(cacheData))
    } catch (error) {
      console.error("Error saving accounts to cache:", error)
    }
  }

  /**
   * Get cached accounts data for specific entities
   */
  static async getCachedAccounts(entityIds: string[] = []): Promise<{ accounts: any[]; timestamp: number } | null> {
    try {
      const cacheKey =
        entityIds.length > 0 ? `${ACCOUNTS_CACHE_PREFIX}${entityIds.sort().join("_")}` : `${ACCOUNTS_CACHE_PREFIX}all`

      const cachedData = await AsyncStorage.getItem(cacheKey)
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
   * Cache transactions data (updated to include entity info)
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
        entityId,
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
   * Cache account balances
   */
  static async saveBalances(balances: any[], totalBalance: number, entityIds: string[]): Promise<void> {
    try {
      const cacheKey = `${BALANCES_CACHE_PREFIX}${entityIds.sort().join("_")}`
      const cacheData = {
        balances,
        totalBalance,
        entityIds,
        timestamp: Date.now(),
      }
      await AsyncStorage.setItem(cacheKey, JSON.stringify(cacheData))
      console.log(`Cached ${balances.length} account balances`)
    } catch (error) {
      console.error("Error caching balances:", error)
    }
  }

  /**
   * Get cached account balances
   */
  static async getCachedBalances(entityIds: string[]): Promise<{
    balances: any[]
    totalBalance: number
    entityIds: string[]
    timestamp: number
  } | null> {
    try {
      const cacheKey = `${BALANCES_CACHE_PREFIX}${entityIds.sort().join("_")}`
      const cachedData = await AsyncStorage.getItem(cacheKey)
      if (cachedData) {
        return JSON.parse(cachedData)
      }
      return null
    } catch (error) {
      console.error("Error getting cached balances:", error)
      return null
    }
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
        (key) =>
          key.startsWith(ACCOUNTS_CACHE_PREFIX) ||
          key.startsWith(TRANSACTIONS_CACHE_PREFIX) ||
          key.startsWith(BALANCES_CACHE_PREFIX) ||
          key === CACHE_EXPIRY_KEY,
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
   * Clear balance cache
   */
  static async clearBalanceCache(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys()
      const balanceKeys = keys.filter((key) => key.startsWith(BALANCES_CACHE_PREFIX))
      await AsyncStorage.multiRemove(balanceKeys)
      console.log("Balance cache cleared")
    } catch (error) {
      console.error("Error clearing balance cache:", error)
    }
  }

  /**
   * Clear cache for a specific entity
   */
  static async clearEntityCache(entityId: string): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys()

      // Filter keys that contain this entity ID
      const entityCacheKeys = keys.filter(
        (key) =>
          (key.startsWith(ACCOUNTS_CACHE_PREFIX) || 
           key.startsWith(TRANSACTIONS_CACHE_PREFIX) ||
           key.startsWith(BALANCES_CACHE_PREFIX)) &&
          key.includes(entityId),
      )

      if (entityCacheKeys.length > 0) {
        await AsyncStorage.multiRemove(entityCacheKeys)
        console.log(`Cleared ${entityCacheKeys.length} cache items for entity ${entityId}`)
      }
    } catch (error) {
      console.error("Error clearing entity cache:", error)
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
      const cacheKeys = keys.filter(
        (key) => 
          key.startsWith(ACCOUNTS_CACHE_PREFIX) || 
          key.startsWith(TRANSACTIONS_CACHE_PREFIX) ||
          key.startsWith(BALANCES_CACHE_PREFIX)
      )

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

export default StorageService