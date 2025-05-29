import { leanEntityService } from "./lean-entity-service"
import { StorageService } from "./storage-service"
import { authService } from "./auth-service"

// Constants
const API_BASE_URL = "https://sandbox.leantech.me"
const MAX_RETRY_ATTEMPTS = 3
const RETRY_DELAY_MS = 1000

/**
 * Debug function to log API requests and responses
 */
const logApiCall = (name: string, request: any, response?: any) => {
  console.log(`\n==== API CALL: ${name} ====`)
  console.log("REQUEST:", JSON.stringify(request, null, 2))
  if (response) {
    console.log(
      "RESPONSE:",
      typeof response === "string" ? response.substring(0, 500) : JSON.stringify(response, null, 2),
    )
  }
  console.log("==== END API CALL ====\n")
}

/**
 * Get the current entity ID from storage
 */
async function getStoredEntityId(): Promise<string> {
  const entityId = await leanEntityService.getEntityId()
  if (!entityId) {
    throw new Error("No entity ID found. Please connect your bank account first.")
  }
  return entityId
}

/**
 * Fetches all available accounts for the current entity
 */
export const fetchAccounts = async (): Promise<any[]> => {
  try {
    // Check cache first
    const cachedData = await StorageService.getCachedAccounts()
    if (cachedData && StorageService.isCacheValid(cachedData.timestamp, 3600000)) {
      console.log("Using cached accounts data")
      return cachedData.accounts
    }

    // Get the stored entity ID
    const entityId = await getStoredEntityId()
    console.log(`Fetching accounts for entity: ${entityId}`)

    // Get a valid token from the auth service
    const token = await authService.getToken()

    const requestBody = {
      entity_id: entityId,
    }

    logApiCall("fetchAccounts", requestBody)

    const response = await fetchWithRetry(`${API_BASE_URL}/data/v1/accounts`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        Scope: "api",
      },
      body: JSON.stringify(requestBody),
    })

    const responseText = await response.text()
    logApiCall("fetchAccounts Response", requestBody, responseText)

    let data
    try {
      data = JSON.parse(responseText)
    } catch (e) {
      console.error("Failed to parse JSON:", e)
      throw new Error("Invalid JSON response from server")
    }

    if (data.payload && data.payload.accounts) {
      const accounts =
        data.payload.accounts.map((account) => ({
          ...account,
          id: account.account_id,
        })) || []

      await StorageService.saveAccounts(accounts)
      return accounts
    } else {
      console.error("API Error:", data)
      return []
    }
  } catch (err) {
    console.error("Fetch accounts error:", err)

    const cachedData = await StorageService.getCachedAccounts()
    if (cachedData) {
      console.log("Using expired cached accounts data due to fetch error")
      return cachedData.accounts
    }

    throw err
  }
}

/**
 * Fetches transactions for a single account (original dashboard interface)
 * This maintains compatibility with the original dashboard code
 */
export const fetchTransactions = async (
  entityIdOrAccountId: string, // This will be ENTITY_ID from the original code
  accountId: string, // This will be ACCOUNT_ID from the original code
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
    // Get the actual entity ID from storage (ignore the passed entityId parameter)
    const entityId = await getStoredEntityId()

    console.log(`API Request - fetchTransactions:
      entityId: ${entityId} (from storage)
      accountId: ${accountId}
      startDate: ${startDate}
      endDate: ${endDate}
      page: ${page}
      pageSize: ${pageSize}
    `)

    // For first page, check cache
    if (page === 1) {
      const cachedData = await StorageService.getCachedTransactions(entityId, [accountId], startDate, endDate)
      if (cachedData && StorageService.isCacheValid(cachedData.timestamp, 3600000)) {
        console.log("Using cached transactions data for single account")
        const paginatedTransactions = cachedData.transactions.slice(0, pageSize)
        return {
          transactions: paginatedTransactions,
          totalCount: cachedData.transactions.length,
          hasMore: cachedData.transactions.length > pageSize,
        }
      }
    }

    const token = await authService.getToken()
    const offset = (page - 1) * pageSize

    const requestBody = {
      entity_id: entityId,
      account_id: accountId,
      from_date: startDate,
      to_date: endDate,
      limit: pageSize,
      offset: offset,
    }

    console.log("Request body:", JSON.stringify(requestBody))
    logApiCall("fetchTransactions", requestBody)

    const response = await fetchWithRetry(`${API_BASE_URL}/data/v1/transactions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        Scope: "api",
      },
      body: JSON.stringify(requestBody),
    })

    const responseText = await response.text()
    logApiCall("fetchTransactions Response", requestBody, responseText)

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

      const transactions = data.payload.transactions.map((transaction, index) => ({
        ...transaction,
        account_id: accountId,
        id:
          transaction.id ||
          `${accountId}-${transaction.transaction_id || ""}-${Math.random().toString(36).substring(2, 10)}`,
      }))

      // Filter transactions by date client-side
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/
      if (dateRegex.test(startDate) && dateRegex.test(endDate)) {
        const startDateObj = new Date(startDate)
        const endDateObj = new Date(endDate)
        startDateObj.setHours(0, 0, 0, 0)
        endDateObj.setHours(23, 59, 59, 999)

        const filteredTransactions = transactions.filter((tx) => {
          const txDate = new Date(tx.timestamp || tx.date || 0)
          return txDate >= startDateObj && txDate <= endDateObj
        })

        console.log(
          `Filtered from ${transactions.length} to ${filteredTransactions.length} transactions based on date range`,
        )

        if (page === 1) {
          await StorageService.cacheTransactions(entityId, [accountId], startDate, endDate, filteredTransactions)
        }

        return {
          transactions: filteredTransactions || [],
          totalCount: filteredTransactions.length,
          hasMore: filteredTransactions.length >= pageSize,
        }
      }

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

    if (page === 1) {
      const entityId = await leanEntityService.getEntityId()
      if (entityId) {
        const cachedData = await StorageService.getCachedTransactions(entityId, [accountId], startDate, endDate)
        if (cachedData) {
          console.log("Using expired cached transactions data due to fetch error")
          const paginatedTransactions = cachedData.transactions.slice(0, pageSize)
          return {
            transactions: paginatedTransactions,
            totalCount: cachedData.transactions.length,
            hasMore: cachedData.transactions.length > pageSize,
          }
        }
      }
    }

    throw err
  }
}

/**
 * Fetches transactions for multiple accounts
 */
export const fetchTransactionsMultiAccount = async (
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
    if (!accountIds || accountIds.length === 0) {
      return {
        transactions: [],
        totalCount: 0,
        hasMore: false,
      }
    }

    // Get the stored entity ID
    const entityId = await getStoredEntityId()

    console.log(`API Request - fetchTransactionsMultiAccount:
      entityId: ${entityId}
      accountIds: ${accountIds.join(", ")}
      startDate: ${startDate}
      endDate: ${endDate}
      page: ${page}
      pageSize: ${pageSize}
    `)

    // For first page, check cache
    if (page === 1) {
      const cachedData = await StorageService.getCachedTransactions(entityId, accountIds, startDate, endDate)
      if (cachedData && StorageService.isCacheValid(cachedData.timestamp, 3600000)) {
        console.log("Using cached transactions data")
        const paginatedTransactions = cachedData.transactions.slice(0, pageSize)
        return {
          transactions: paginatedTransactions,
          totalCount: cachedData.transactions.length,
          hasMore: cachedData.transactions.length > pageSize,
        }
      }
    }

    const token = await authService.getToken()
    const offset = (page - 1) * pageSize
    const allTransactions = []
    let hasMoreResults = false

    // Fetch transactions for each account
    for (let i = 0; i < accountIds.length; i++) {
      const accountId = accountIds[i]

      if (i > 0) {
        await new Promise((resolve) => setTimeout(resolve, 500))
      }

      const requestBody = {
        entity_id: entityId,
        account_id: accountId,
        from_date: startDate,
        to_date: endDate,
        limit: pageSize,
        offset: offset,
      }

      console.log(`Fetching for account ${accountId}`)
      logApiCall(`fetchTransactionsMultiAccount (account ${accountId})`, requestBody)

      try {
        const response = await fetchWithRetry(`${API_BASE_URL}/data/v1/transactions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
            Scope: "api",
          },
          body: JSON.stringify(requestBody),
        })

        const responseText = await response.text()
        logApiCall(`fetchTransactionsMultiAccount Response (account ${accountId})`, requestBody, responseText)

        let data
        try {
          data = JSON.parse(responseText)
        } catch (e) {
          console.warn(`Failed to parse JSON for account ${accountId}:`, e)
          continue
        }

        if (data.payload && Array.isArray(data.payload.transactions)) {
          const accountTransactions = data.payload.transactions.map((transaction, index) => ({
            ...transaction,
            account_id: accountId,
            id:
              transaction.id ||
              `${accountId}-${transaction.transaction_id || ""}-${Math.random().toString(36).substring(2, 10)}`,
          }))

          allTransactions.push(...accountTransactions)

          if (data.payload.transactions.length >= pageSize) {
            hasMoreResults = true
          }
        } else {
          console.warn(`No transactions found for account ${accountId} or invalid format`)
        }
      } catch (error) {
        console.warn(`Error fetching transactions for account ${accountId}:`, error)
      }
    }

    // Sort all transactions by date (newest first)
    allTransactions.sort((a, b) => {
      const dateA = new Date(a.timestamp || a.date || 0)
      const dateB = new Date(b.timestamp || b.date || 0)
      return dateB.getTime() - dateA.getTime()
    })

    // Filter transactions by date client-side
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/
    if (dateRegex.test(startDate) && dateRegex.test(endDate)) {
      const startDateObj = new Date(startDate)
      const endDateObj = new Date(endDate)
      startDateObj.setHours(0, 0, 0, 0)
      endDateObj.setHours(23, 59, 59, 999)

      const filteredTransactions = allTransactions.filter((tx) => {
        const txDate = new Date(tx.timestamp || tx.date || 0)
        return txDate >= startDateObj && txDate <= endDateObj
      })

      console.log(
        `Filtered from ${allTransactions.length} to ${filteredTransactions.length} transactions based on date range`,
      )

      const paginatedTransactions = filteredTransactions.slice(0, pageSize)

      if (page === 1) {
        await StorageService.cacheTransactions(entityId, accountIds, startDate, endDate, filteredTransactions)
      }

      return {
        transactions: paginatedTransactions,
        totalCount: filteredTransactions.length,
        hasMore: filteredTransactions.length > pageSize,
      }
    }

    const paginatedTransactions = allTransactions.slice(0, pageSize)

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

    if (page === 1) {
      const entityId = await leanEntityService.getEntityId()
      if (entityId) {
        const cachedData = await StorageService.getCachedTransactions(entityId, accountIds, startDate, endDate)
        if (cachedData) {
          console.log("Using expired cached transactions data due to fetch error")
          const paginatedTransactions = cachedData.transactions.slice(0, pageSize)
          return {
            transactions: paginatedTransactions,
            totalCount: cachedData.transactions.length,
            hasMore: cachedData.transactions.length > pageSize,
          }
        }
      }
    }

    throw err
  }
}

/**
 * Fetch with retry and exponential backoff
 */
async function fetchWithRetry(url: string, options: RequestInit, attempt = 1): Promise<Response> {
  try {
    const response = await fetch(url, options)

    if (response.status === 429 && attempt < MAX_RETRY_ATTEMPTS) {
      const delay = RETRY_DELAY_MS * Math.pow(2, attempt - 1)
      console.log(`Rate limited (429). Retrying in ${delay}ms (attempt ${attempt} of ${MAX_RETRY_ATTEMPTS})`)
      await new Promise((resolve) => setTimeout(resolve, delay))
      return fetchWithRetry(url, options, attempt + 1)
    }

    if (response.status === 401 && attempt === 1) {
      console.log("Token expired, refreshing...")
      const newToken = await authService.refreshToken()
      const newOptions = {
        ...options,
        headers: {
          ...options.headers,
          Authorization: `Bearer ${newToken}`,
        },
      }
      return fetchWithRetry(url, newOptions, attempt + 1)
    }

    return response
  } catch (error) {
    if (attempt < MAX_RETRY_ATTEMPTS) {
      const delay = RETRY_DELAY_MS * Math.pow(2, attempt - 1)
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
  console.log("Clearing all cache data")
  await StorageService.clearAllCache()
}

/**
 * Clear transactions cache only
 */
export const clearTransactionsCache = async (): Promise<void> => {
  console.log("Clearing transactions cache data")
  await StorageService.clearTransactionsCache()
}

/**
 * Clear old cached data
 */
export const clearOldCache = async (): Promise<void> => {
  await StorageService.clearOldCache()
}
