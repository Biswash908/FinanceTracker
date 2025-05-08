import { authService } from "./auth-service"
import { StorageService } from "./storage-service"

// Constants
const API_BASE_URL = "https://sandbox.leantech.me"
const MAX_RETRY_ATTEMPTS = 3
const RETRY_DELAY_MS = 1000 // Start with 1 second delay

/**
 * Fetches all available accounts for an entity with caching
 *
 * @param entityId The entity ID
 * @returns Promise with accounts data
 */
export const fetchAccounts = async (entityId: string): Promise<any[]> => {
  try {
    // Check cache first
    const cachedData = await StorageService.getCachedAccounts()
    if (cachedData && StorageService.isCacheValid(cachedData.timestamp, 3600000)) {
      // 1 hour cache
      console.log("Using cached accounts data")
      return cachedData.accounts
    }

    console.log(`Fetching accounts for entity: ${entityId}`)

    // Get a valid token from the auth service
    const token = await authService.getToken()

    // Use the accounts API endpoint
    const url = `${API_BASE_URL}/data/v1/accounts`

    const response = await fetchWithRetry(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        Scope: "api",
      },
      body: JSON.stringify({
        entity_id: entityId,
      }),
    })

    // Get response as text first for debugging
    const responseText = await response.text()
    console.log("Accounts response text preview:", responseText.substring(0, 200) + "...")

    let data
    try {
      data = JSON.parse(responseText)
    } catch (e) {
      console.error("Failed to parse JSON:", e)
      throw new Error("Invalid JSON response from server")
    }

    if (data.payload && data.payload.accounts) {
      // Make sure we're returning the accounts with the correct ID field
      const accounts =
        data.payload.accounts.map((account) => ({
          ...account,
          id: account.account_id, // Ensure each account has an 'id' property that matches account_id
        })) || []

      // Cache the accounts data
      await StorageService.saveAccounts(accounts)

      return accounts
    } else {
      console.error("API Error:", data)
      return []
    }
  } catch (err) {
    console.error("Fetch accounts error:", err)

    // If we have cached data, return it even if it's expired
    const cachedData = await StorageService.getCachedAccounts()
    if (cachedData) {
      console.log("Using expired cached accounts data due to fetch error")
      return cachedData.accounts
    }

    throw err
  }
}

/**
 * Fetches transactions for multiple accounts with pagination support and caching
 *
 * @param entityId The entity ID
 * @param accountIds Array of account IDs to fetch transactions for
 * @param startDate Start date in YYYY-MM-DD format
 * @param endDate End date in YYYY-MM-DD format
 * @param page Page number (1-based)
 * @param pageSize Number of transactions per page
 * @returns Promise with transaction data
 */
export const fetchTransactionsMultiAccount = async (
  entityId: string,
  accountIds: string[],
  startDate: string,
  endDate: string,
  page = 1,
  pageSize = 50,
): Promise<{
  transactions: any[]
  totalCount: number
  hasMore: boolean
}> => {
  try {
    // If no account IDs provided, return empty result
    if (!accountIds || accountIds.length === 0) {
      return {
        transactions: [],
        totalCount: 0,
        hasMore: false,
      }
    }

    // For first page, check cache
    if (page === 1) {
      const cachedData = await StorageService.getCachedTransactions(entityId, accountIds, startDate, endDate)
      if (cachedData && StorageService.isCacheValid(cachedData.timestamp, 3600000)) {
        // 1 hour cache
        console.log("Using cached transactions data")

        // Apply pagination to cached data
        const paginatedTransactions = cachedData.transactions.slice(0, pageSize)

        return {
          transactions: paginatedTransactions,
          totalCount: cachedData.transactions.length,
          hasMore: cachedData.transactions.length > pageSize,
        }
      }
    }

    // Get a valid token from the auth service
    const token = await authService.getToken()

    // Calculate pagination parameters
    const offset = (page - 1) * pageSize

    // Use the correct API URL
    const url = `${API_BASE_URL}/data/v1/transactions`

    console.log(`Fetching transactions for ${accountIds.length} accounts: page ${page}, size ${pageSize}`)
    console.log(`Date range: ${startDate} to ${endDate}`)

    // Fetch transactions for each account and combine them
    const allTransactions = []
    let hasMoreResults = false

    // Use a queue system to avoid rate limiting
    for (let i = 0; i < accountIds.length; i++) {
      const accountId = accountIds[i]

      // Add a small delay between requests to avoid rate limiting
      if (i > 0) {
        await new Promise((resolve) => setTimeout(resolve, 500))
      }

      // Create the request body with pagination parameters
      const requestBody = {
        entity_id: entityId,
        account_id: accountId,
        from_date: startDate,
        to_date: endDate,
        limit: pageSize,
        offset: offset,
      }

      console.log(`Fetching for account ${accountId}, ID type: ${typeof accountId}`)

      try {
        const response = await fetchWithRetry(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
            Scope: "api",
          },
          body: JSON.stringify(requestBody),
        })

        const responseText = await response.text()

        let data
        try {
          data = JSON.parse(responseText)
        } catch (e) {
          console.warn(`Failed to parse JSON for account ${accountId}:`, e)
          continue // Skip this account and try the next one
        }

        if (data.payload && Array.isArray(data.payload.transactions)) {
          // Add account_id and a unique ID to each transaction
          const accountTransactions = data.payload.transactions.map((transaction, index) => ({
            ...transaction,
            account_id: accountId,
            // Ensure each transaction has a unique ID by combining account_id and transaction_id
            id:
              transaction.id ||
              `${accountId}-${transaction.transaction_id || ""}-${Math.random().toString(36).substring(2, 10)}`,
          }))

          allTransactions.push(...accountTransactions)

          // If any account has more results, set hasMore to true
          if (data.payload.transactions.length >= pageSize) {
            hasMoreResults = true
          }
        } else {
          console.warn(`No transactions found for account ${accountId} or invalid format`)
        }
      } catch (error) {
        console.warn(`Error fetching transactions for account ${accountId}:`, error)
        // Continue with other accounts even if one fails
      }
    }

    // Sort all transactions by date (newest first)
    allTransactions.sort((a, b) => {
      const dateA = new Date(a.timestamp || a.date || 0)
      const dateB = new Date(b.timestamp || b.date || 0)
      return dateB.getTime() - dateA.getTime()
    })

    // Apply pagination to the combined results
    const paginatedTransactions = allTransactions.slice(0, pageSize)

    // Cache the full results for first page
    if (page === 1) {
      await StorageService.cacheTransactions(entityId, accountIds, startDate, endDate, allTransactions)
    }

    console.log(`Returning ${paginatedTransactions.length} transactions, hasMore: ${hasMoreResults}`)

    return {
      transactions: paginatedTransactions,
      totalCount: allTransactions.length,
      hasMore: hasMoreResults,
    }
  } catch (err) {
    console.error("Fetch transactions error:", err)

    // If we have cached data, return it even if it's expired
    if (page === 1) {
      const cachedData = await StorageService.getCachedTransactions(entityId, accountIds, startDate, endDate)
      if (cachedData) {
        console.log("Using expired cached transactions data due to fetch error")

        // Apply pagination to cached data
        const paginatedTransactions = cachedData.transactions.slice(0, pageSize)

        return {
          transactions: paginatedTransactions,
          totalCount: cachedData.transactions.length,
          hasMore: cachedData.transactions.length > pageSize,
        }
      }
    }

    throw err
  }
}

/**
 * Fetches transactions with pagination support (single account)
 *
 * @param entityId The entity ID
 * @param accountId The account ID
 * @param startDate Start date in YYYY-MM-DD format
 * @param endDate End date in YYYY-MM-DD format
 * @param page Page number (1-based)
 * @param pageSize Number of transactions per page
 * @returns Promise with transaction data
 */
export const fetchTransactions = async (
  entityId: string,
  accountId: string,
  startDate: string,
  endDate: string,
  page = 1,
  pageSize = 50,
): Promise<{
  transactions: any[]
  totalCount: number
  hasMore: boolean
}> => {
  try {
    // For first page, check cache
    if (page === 1) {
      const cachedData = await StorageService.getCachedTransactions(entityId, [accountId], startDate, endDate)
      if (cachedData && StorageService.isCacheValid(cachedData.timestamp, 3600000)) {
        // 1 hour cache
        console.log("Using cached transactions data for single account")

        // Apply pagination to cached data
        const paginatedTransactions = cachedData.transactions.slice(0, pageSize)

        return {
          transactions: paginatedTransactions,
          totalCount: cachedData.transactions.length,
          hasMore: cachedData.transactions.length > pageSize,
        }
      }
    }

    // Get a valid token from the auth service
    const token = await authService.getToken()

    // Calculate pagination parameters
    const offset = (page - 1) * pageSize

    // Use the correct API URL
    const url = `${API_BASE_URL}/data/v1/transactions`

    console.log(`Fetching transactions: page ${page}, size ${pageSize}, from ${startDate} to ${endDate}`)

    // Create the request body with pagination parameters
    const requestBody = {
      entity_id: entityId,
      account_id: accountId,
      from_date: startDate,
      to_date: endDate,
      limit: pageSize,
      offset: offset,
    }

    console.log("Request body:", JSON.stringify(requestBody))

    const response = await fetchWithRetry(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        Scope: "api",
      },
      body: JSON.stringify(requestBody),
    })

    // Get response as text first for debugging
    const responseText = await response.text()
    console.log("Response text preview:", responseText.substring(0, 200) + "...")

    let data
    try {
      data = JSON.parse(responseText)
    } catch (e) {
      console.error("Failed to parse JSON:", e)
      throw new Error("Invalid JSON response from server")
    }

    if (data.payload && Array.isArray(data.payload.transactions)) {
      const totalCount = data.payload.total_count || data.payload.transactions.length
      const hasMore = data.payload.transactions.length >= pageSize

      // Add unique IDs to each transaction
      const transactions = data.payload.transactions.map((transaction, index) => ({
        ...transaction,
        account_id: accountId,
        id:
          transaction.id ||
          `${accountId}-${transaction.transaction_id || ""}-${Math.random().toString(36).substring(2, 10)}`,
      }))

      // Cache the results for first page
      if (page === 1) {
        await StorageService.cacheTransactions(entityId, [accountId], startDate, endDate, transactions)
      }

      console.log(`Returning ${transactions.length} transactions, hasMore: ${hasMore}`)

      return {
        transactions: transactions || [],
        totalCount,
        hasMore,
      }
    } else {
      console.error("API Error or no transactions:", data)
      return {
        transactions: [],
        totalCount: 0,
        hasMore: false,
      }
    }
  } catch (err) {
    console.error("Fetch error:", err)

    // If we have cached data, return it even if it's expired
    if (page === 1) {
      const cachedData = await StorageService.getCachedTransactions(entityId, [accountId], startDate, endDate)
      if (cachedData) {
        console.log("Using expired cached transactions data due to fetch error")

        // Apply pagination to cached data
        const paginatedTransactions = cachedData.transactions.slice(0, pageSize)

        return {
          transactions: paginatedTransactions,
          totalCount: cachedData.transactions.length,
          hasMore: cachedData.transactions.length > pageSize,
        }
      }
    }

    throw err
  }
}

/**
 * Fetch with retry and exponential backoff
 *
 * @param url The URL to fetch
 * @param options Fetch options
 * @param attempt Current attempt number
 * @returns Promise with response
 */
async function fetchWithRetry(url: string, options: RequestInit, attempt = 1): Promise<Response> {
  try {
    const response = await fetch(url, options)

    // If we get a 429 (Too Many Requests), retry with exponential backoff
    if (response.status === 429 && attempt < MAX_RETRY_ATTEMPTS) {
      const delay = RETRY_DELAY_MS * Math.pow(2, attempt - 1) // Exponential backoff
      console.log(`Rate limited (429). Retrying in ${delay}ms (attempt ${attempt} of ${MAX_RETRY_ATTEMPTS})`)

      await new Promise((resolve) => setTimeout(resolve, delay))
      return fetchWithRetry(url, options, attempt + 1)
    }

    // If we get a 401 Unauthorized, try refreshing the token once
    if (response.status === 401 && attempt === 1) {
      console.log("Token expired, refreshing...")
      const newToken = await authService.refreshToken()

      // Update the Authorization header with the new token
      const newOptions = {
        ...options,
        headers: {
          ...options.headers,
          Authorization: `Bearer ${newToken}`,
        },
      }

      // Retry with the new token
      return fetchWithRetry(url, newOptions, attempt + 1)
    }

    return response
  } catch (error) {
    // For network errors, retry if we haven't exceeded max attempts
    if (attempt < MAX_RETRY_ATTEMPTS) {
      const delay = RETRY_DELAY_MS * Math.pow(2, attempt - 1) // Exponential backoff
      console.log(`Network error. Retrying in ${delay}ms (attempt ${attempt} of ${MAX_RETRY_ATTEMPTS})`)

      await new Promise((resolve) => setTimeout(resolve, delay))
      return fetchWithRetry(url, options, attempt + 1)
    }

    throw error
  }
}

/**
 * Clear all cached data
 */
export const clearAllCache = async (): Promise<void> => {
  await StorageService.clearAllCache()
}

/**
 * Clear old cached data
 */
export const clearOldCache = async (): Promise<void> => {
  await StorageService.clearOldCache()
}
