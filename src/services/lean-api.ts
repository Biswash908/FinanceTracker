import { leanEntityService } from "./lean-entity-service"
import { StorageService } from "./storage-service"
import { authService } from "./auth-service"
import { leanDisconnectService } from "./lean-disconnect-service"

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
 * Get all stored entity IDs
 */
async function getAllEntityIds(): Promise<string[]> {
  const entityIds = await leanEntityService.getAllEntityIds()
  if (entityIds.length === 0) {
    throw new Error("No entity IDs found. Please connect your bank account first.")
  }
  return entityIds
}

/**
 * Get the primary entity ID for backward compatibility
 */
async function getStoredEntityId(): Promise<string> {
  const entityId = await leanEntityService.getEntityId()
  if (!entityId) {
    throw new Error("No entity ID found. Please connect your bank account first.")
  }
  return entityId
}

/**
 * Fetches all available accounts from all connected entities
 */
export const fetchAccounts = async (): Promise<any[]> => {
  try {
    // Get all entity IDs
    const entityIds = await getAllEntityIds()

    // Check cache first
    const cachedData = await StorageService.getCachedAccounts(entityIds)
    if (cachedData && StorageService.isCacheValid(cachedData.timestamp, 3600000)) {
      console.log("Using cached accounts data")
      return cachedData.accounts
    }

    console.log(`Fetching accounts for ${entityIds.length} entities:`, entityIds)

    // Get a valid token from the auth service
    const token = await authService.getToken()
    const allAccounts = []

    // Fetch accounts from each entity
    for (const entityId of entityIds) {
      try {
        const requestBody = {
          entity_id: entityId,
        }

        logApiCall(`fetchAccounts (entity ${entityId})`, requestBody)

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
        logApiCall(`fetchAccounts Response (entity ${entityId})`, requestBody, responseText)

        let data
        try {
          data = JSON.parse(responseText)
        } catch (e) {
          console.error(`Failed to parse JSON for entity ${entityId}:`, e)
          continue
        }

        if (data.payload && data.payload.accounts) {
          // Get entity info for bank name and user name
          const entities = await leanEntityService.getAllEntities()
          const entityInfo = entities.find((e) => e.entityId === entityId)

          const accounts = data.payload.accounts.map((account) => ({
            ...account,
            id: account.account_id,
            entityId: entityId,
            bankName: entityInfo?.bankName || "Unknown Bank",
            userName: entityInfo?.userName || "Unknown User",
          }))

          allAccounts.push(...accounts)
        } else {
          console.warn(`No accounts found for entity ${entityId}`)
        }
      } catch (error) {
        console.error(`Error fetching accounts for entity ${entityId}:`, error)
        // Continue with other entities
      }
    }

    // Cache the combined accounts
    await StorageService.saveAccounts(allAccounts, entityIds)
    console.log(`Fetched ${allAccounts.length} total accounts from ${entityIds.length} entities`)

    return allAccounts
  } catch (err) {
    console.error("Fetch accounts error:", err)

    // Try to get cached data even if expired
    const entityIds = await leanEntityService.getAllEntityIds()
    const cachedData = await StorageService.getCachedAccounts(entityIds)
    if (cachedData) {
      console.log("Using expired cached accounts data due to fetch error")
      return cachedData.accounts
    }

    throw err
  }
}

/**
 * Fetches transactions for a single account (backward compatibility)
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
    // Find the correct entity ID for this account
    const allAccounts = await fetchAccounts()
    const account = allAccounts.find((acc) => acc.id === accountId)

    if (!account) {
      console.error(`Account ${accountId} not found in available accounts`)
      return {
        transactions: [],
        totalCount: 0,
        hasMore: false,
      }
    }

    const entityId = account.entityId
    if (!entityId) {
      console.error(`No entity ID found for account ${accountId}`)
      return {
        transactions: [],
        totalCount: 0,
        hasMore: false,
      }
    }

    console.log(`API Request - fetchTransactions:
      accountId: ${accountId}
      entityId: ${entityId} (from account mapping)
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
      insights: true, // Enable Lean's categorization
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
        entity_id: entityId,
        id:
          transaction.id ||
          `${entityId}-${accountId}-${transaction.transaction_id || ""}-${Math.random().toString(36).substring(2, 10)}`,
        // Add Lean's categorization data
        lean_category: transaction.category || null,
        lean_category_confidence: transaction.category_confidence || null,
        lean_description: transaction.cleansed_description || transaction.description,
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
      // Try to get cached data for any entity that has this account
      const allAccounts = await fetchAccounts()
      const account = allAccounts.find((acc) => acc.id === accountId)
      if (account && account.entityId) {
        const cachedData = await StorageService.getCachedTransactions(account.entityId, [accountId], startDate, endDate)
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
 * Fetches transactions for multiple accounts across all entities
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

    // Get all accounts to map them to entities
    const allAccounts = await fetchAccounts()

    console.log(`API Request - fetchTransactionsMultiAccount:
      accountIds: ${accountIds.join(", ")}
      startDate: ${startDate}
      endDate: ${endDate}
      page: ${page}
      pageSize: ${pageSize}
    `)

    // Create a map of entity ID to account IDs
    const entityAccountMap = new Map<string, string[]>()

    for (const accountId of accountIds) {
      const account = allAccounts.find((acc) => acc.id === accountId)
      if (account && account.entityId) {
        if (!entityAccountMap.has(account.entityId)) {
          entityAccountMap.set(account.entityId, [])
        }
        entityAccountMap.get(account.entityId)!.push(accountId)
      } else {
        console.warn(`Account ${accountId} not found or missing entity ID`)
      }
    }

    console.log("Entity-Account mapping:", Object.fromEntries(entityAccountMap))

    // For first page, check cache (use a combined cache key)
    if (page === 1 && entityAccountMap.size > 0) {
      const firstEntityId = Array.from(entityAccountMap.keys())[0]
      const cachedData = await StorageService.getCachedTransactions(firstEntityId, accountIds, startDate, endDate)
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

    // Fetch transactions for each entity's accounts
    for (const [entityId, entityAccountIds] of entityAccountMap) {
      for (let i = 0; i < entityAccountIds.length; i++) {
        const accountId = entityAccountIds[i]

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
          insights: true, // Enable Lean's categorization
        }

        console.log(`Fetching for entity ${entityId}, account ${accountId}`)
        logApiCall(`fetchTransactionsMultiAccount (entity ${entityId}, account ${accountId})`, requestBody)

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
          logApiCall(
            `fetchTransactionsMultiAccount Response (entity ${entityId}, account ${accountId})`,
            requestBody,
            responseText,
          )

          let data
          try {
            data = JSON.parse(responseText)
          } catch (e) {
            console.warn(`Failed to parse JSON for entity ${entityId}, account ${accountId}:`, e)
            continue
          }

          if (data.payload && Array.isArray(data.payload.transactions)) {
            const accountTransactions = data.payload.transactions.map((transaction, index) => ({
              ...transaction,
              account_id: accountId,
              entity_id: entityId,
              id:
                transaction.id ||
                `${entityId}-${accountId}-${transaction.transaction_id || ""}-${Math.random().toString(36).substring(2, 10)}`,
              // Add Lean's categorization data
              lean_category: transaction.category || null,
              lean_category_confidence: transaction.category_confidence || null,
              lean_description: transaction.cleansed_description || transaction.description,
            }))

            allTransactions.push(...accountTransactions)

            if (data.payload.transactions.length >= pageSize) {
              hasMoreResults = true
            }
          } else {
            console.warn(`No transactions found for entity ${entityId}, account ${accountId}`)
          }
        } catch (error) {
          console.warn(`Error fetching transactions for entity ${entityId}, account ${accountId}:`, error)
        }
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

      if (page === 1 && entityAccountMap.size > 0) {
        const firstEntityId = Array.from(entityAccountMap.keys())[0]
        await StorageService.cacheTransactions(firstEntityId, accountIds, startDate, endDate, filteredTransactions)
      }

      return {
        transactions: paginatedTransactions,
        totalCount: filteredTransactions.length,
        hasMore: filteredTransactions.length > pageSize,
      }
    }

    const paginatedTransactions = allTransactions.slice(0, pageSize)

    if (page === 1 && entityAccountMap.size > 0) {
      const firstEntityId = Array.from(entityAccountMap.keys())[0]
      await StorageService.cacheTransactions(firstEntityId, accountIds, startDate, endDate, allTransactions)
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
      // Try to get cached data
      const allAccounts = await fetchAccounts()
      const firstAccount = allAccounts.find((acc) => accountIds.includes(acc.id))
      if (firstAccount && firstAccount.entityId) {
        const cachedData = await StorageService.getCachedTransactions(
          firstAccount.entityId,
          accountIds,
          startDate,
          endDate,
        )
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
 * Fetches account balances for all connected accounts
 */
export const fetchAccountBalances = async (): Promise<{
  balances: any[]
  totalBalance: number
}> => {
  try {
    // Get all entity IDs
    const entityIds = await getAllEntityIds()

    // Check cache first
    const cachedData = await StorageService.getCachedBalances(entityIds)
    if (cachedData && StorageService.isCacheValid(cachedData.timestamp, 1800000)) {
      // 30 minutes cache
      console.log("Using cached balance data")
      return {
        balances: cachedData.balances,
        totalBalance: cachedData.totalBalance,
      }
    }

    console.log(`Fetching balances for ${entityIds.length} entities:`, entityIds)

    // Get a valid token from the auth service
    const token = await authService.getToken()
    const allBalances = []
    let totalBalance = 0

    // Fetch balances from each entity
    for (const entityId of entityIds) {
      try {
        const requestBody = {
          entity_id: entityId,
        }

        logApiCall(`fetchAccountBalances (entity ${entityId})`, requestBody)

        const response = await fetchWithRetry(`${API_BASE_URL}/data/v1/balance`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
            Scope: "api",
          },
          body: JSON.stringify(requestBody),
        })

        const responseText = await response.text()
        logApiCall(`fetchAccountBalances Response (entity ${entityId})`, requestBody, responseText)

        let data
        try {
          data = JSON.parse(responseText)
        } catch (e) {
          console.error(`Failed to parse JSON for entity ${entityId}:`, e)
          continue
        }

        if (data.payload && data.payload.accounts) {
          // Get entity info for bank name and user name
          const entities = await leanEntityService.getAllEntities()
          const entityInfo = entities.find((e) => e.entityId === entityId)

          const balances = data.payload.accounts.map((account) => ({
            ...account,
            entityId: entityId,
            bankName: entityInfo?.bankName || "Unknown Bank",
            userName: entityInfo?.userName || "Unknown User",
            balance: Number.parseFloat(account.balance || 0),
          }))

          allBalances.push(...balances)

          // Add to total balance
          balances.forEach((account) => {
            totalBalance += account.balance
          })
        } else {
          console.warn(`No balance data found for entity ${entityId}`)
        }
      } catch (error) {
        console.error(`Error fetching balances for entity ${entityId}:`, error)
        // Continue with other entities
      }
    }

    // Cache the combined balances
    await StorageService.saveBalances(allBalances, totalBalance, entityIds)
    console.log(`Fetched balances for ${allBalances.length} accounts, total balance: ${totalBalance}`)

    return {
      balances: allBalances,
      totalBalance,
    }
  } catch (err) {
    console.error("Fetch balances error:", err)

    // Try to get cached data even if expired
    const entityIds = await leanEntityService.getAllEntityIds()
    const cachedData = await StorageService.getCachedBalances(entityIds)
    if (cachedData) {
      console.log("Using expired cached balance data due to fetch error")
      return {
        balances: cachedData.balances,
        totalBalance: cachedData.totalBalance,
      }
    }

    throw err
  }
}

/**
 * Remove a bank connection (entity) - Updated to use disconnect service
 */
export const removeBankConnection = async (entityId: string): Promise<{ success: boolean; message: string }> => {
  try {
    console.log("Removing bank connection for entity:", entityId)

    // Use the disconnect service to properly disconnect from Lean's servers
    const result = await leanDisconnectService.disconnectEntity(entityId)

    return result
  } catch (error) {
    console.error("Error removing bank connection:", error)
    return {
      success: false,
      message: `Failed to disconnect bank: ${error.message}`,
    }
  }
}

/**
 * Disconnect all banks for the current customer
 */
export const disconnectAllBanks = async (): Promise<{ success: boolean; message: string }> => {
  try {
    console.log("Disconnecting all banks")

    // Get customer ID from storage
    const AsyncStorage = require("@react-native-async-storage/async-storage").default
    const customerId = (await AsyncStorage.getItem("lean_customer_id")) || (await AsyncStorage.getItem("customerId"))

    if (!customerId) {
      return {
        success: false,
        message: "No customer ID found",
      }
    }

    // Use the disconnect service to disconnect all entities
    const result = await leanDisconnectService.disconnectAllEntities(customerId)

    return result
  } catch (error) {
    console.error("Error disconnecting all banks:", error)
    return {
      success: false,
      message: `Failed to disconnect all banks: ${error.message}`,
    }
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
