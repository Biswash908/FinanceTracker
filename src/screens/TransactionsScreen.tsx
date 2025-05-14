"use client"

import { useState, useEffect, useCallback, useRef, useMemo } from "react"
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  ScrollView,
  SafeAreaView,
  Dimensions,
  RefreshControl,
  LogBox,
  Alert,
  Animated,
  type LayoutChangeEvent,
} from "react-native"
import { ENTITY_ID } from "@env"
import { MaterialIcons } from "@expo/vector-icons"

// Components
import TransactionCard from "../components/TransactionCard"
import DateRangePicker from "../components/DateRangePicker"
import FinancialSummary from "../components/FinancialSummary"
import AccountSelector from "../components/AccountSelector"
import TransactionFilters from "../components/TransactionFilters"
import CustomScrollbar from "../components/CustomScrollbar"

// Services and Utils
import {
  fetchTransactions,
  fetchTransactionsMultiAccount,
  fetchAccounts,
  clearAllCache,
  clearTransactionsCache,
} from "../services/lean-api"
import { categorizeTransaction, calculateFinancials } from "../utils/categorizer"
import { StorageService } from "../services/storage-service"
import { exportTransactionsToExcel } from "../utils/excel-export"
import { useTheme } from "../context/ThemeContext"
import React from "react"

// Import the date utility functions
import { formatDateToString, getFirstDayOfMonth, getCurrentDate } from "../utils/date-utils"

// Suppress the warning about nested scrollviews
LogBox.ignoreLogs(["VirtualizedLists should never be nested"])

const screenHeight = Dimensions.get("window").height
const screenWidth = Dimensions.get("window").width

const REQUEST_DELAY = 300 // Milliseconds to wait between requests
const MAX_CONCURRENT_REQUESTS = 1 // Maximum number of concurrent requests per account
// 1. Increase the TRANSACTIONS_PER_PAGE constant to ensure we get all transactions
// Using a smaller page size but making sure we load all pages
const TRANSACTIONS_PER_PAGE = 50
// Increase this for multi-account fetches to load more transactions at once
const MULTI_ACCOUNT_TRANSACTIONS_PER_PAGE = 100
// Maximum number of retries for loading transactions
const MAX_LOAD_RETRIES = 3
// Maximum number of empty responses before giving up
const MAX_EMPTY_RESPONSES = 2

const TransactionsScreen = () => {
  const { isDarkMode } = useTheme()

  // State
  const [transactions, setTransactions] = useState([])
  const [accounts, setAccounts] = useState([])
  const [selectedAccounts, setSelectedAccounts] = useState([])
  const [loading, setLoading] = useState(true)
  const [accountsLoading, setAccountsLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState(null)
  const [startDate, setStartDate] = useState(getFirstDayOfMonth())
  const [endDate, setEndDate] = useState(getCurrentDate())
  const [searchQuery, setSearchQuery] = useState("")
  // Update to use array for multiple category selection
  const [selectedCategory, setSelectedCategory] = useState<string[]>(["All"])
  const [selectedType, setSelectedType] = useState("All")
  const [sortBy, setSortBy] = useState<"date" | "amount" | "category">("date")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")
  const [currentPage, setCurrentPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [totalCount, setTotalCount] = useState(0)
  const [isCacheClearing, setIsCacheClearing] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  // Add a flag to track if a load attempt failed
  const [loadAttemptFailed, setLoadAttemptFailed] = useState(false)
  // Add state for content height tracking
  const [contentHeight, setContentHeight] = useState(0)
  const [containerHeight, setContainerHeight] = useState(0)
  const [flatListScrollEnabled, setFlatListScrollEnabled] = useState(true)
  const [activeRequests, setActiveRequests] = useState<Record<string, boolean>>({})
  // Track loading state for each account
  const [accountLoadingState, setAccountLoadingState] = useState<
    Record<
      string,
      {
        page: number
        hasMore: boolean
        loading: boolean
        emptyResponseCount: number
        retryCount: number
        expectedTotal: number
        loadedCount: number
      }
    >
  >({})
  const [scrollPosition, setScrollPosition] = useState(0)
  const SCROLL_THRESHOLD = 200 // Show up button after scrolling this far
  // Add state to track transaction counts for debugging
  const [transactionCounts, setTransactionCounts] = useState<Record<string, number>>({})

  // Refs
  const mainScrollViewRef = useRef(null)
  const transactionListRef = useRef(null)
  const scrollY = useRef(new Animated.Value(0)).current
  // Add a ref to track if we're currently loading all transactions
  const loadingAllTransactionsRef = useRef(false)

  // Filter transactions based on search query, category, type, and account
  const filteredTransactions = useMemo(() => {
  return Array.isArray(transactions)
    ? transactions.filter((transaction) => {
        // Skip invalid transactions
        if (!transaction) return false

        // Add date filtering
        const txDate = new Date(transaction.timestamp || transaction.date || 0)
        const startDateObj = new Date(startDate)
        const endDateObj = new Date(endDate)
        // Set time to beginning/end of day for proper comparison
        startDateObj.setHours(0, 0, 0, 0)
        endDateObj.setHours(23, 59, 59, 999)

        // Check if transaction date is within the selected range
        const isInDateRange = txDate >= startDateObj && txDate <= endDateObj
        if (!isInDateRange) return false

        // Filter by search query
        const matchesQuery =
          searchQuery === "" ||
          transaction.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (transaction.amount && transaction.amount.toString().includes(searchQuery.toLowerCase())) ||
          (transaction.account_name && transaction.account_name.toLowerCase().includes(searchQuery.toLowerCase()))

        // Check for pending status
        const isPending = transaction.pending === true
        
        // Filter by category - use the actual category regardless of pending status
        const amount = transaction.amount ? Number.parseFloat(transaction.amount) : 0
        const isIncome = amount > 0
        const category = isIncome ? "income" : categorizeTransaction(transaction.description, false)

        // Check if "All" is selected or if the transaction category is in the selected categories
        const matchesCategory =
          selectedCategory.includes("All") || selectedCategory.some((c) => c.toLowerCase() === category.toLowerCase())

        // Filter by transaction type - now including pending as a separate type
        const matchesType =
          selectedType === "All" ||
          (selectedType === "Income" && isIncome && !isPending) ||
          (selectedType === "Expense" && !isIncome && !isPending) ||
          (selectedType === "Pending" && isPending)

        return matchesQuery && matchesCategory && matchesType
      })
    : []
}, [transactions, searchQuery, selectedCategory, selectedType, startDate, endDate])

  // Sort the filtered transactions
  const sortedTransactions = useMemo(() => {
    if (!filteredTransactions.length) return []

    return [...filteredTransactions].sort((a, b) => {
      const getVal = (tx: any) => {
        if (sortBy === "date") return new Date(tx.timestamp || tx.date || 0).getTime()
        if (sortBy === "amount") return Math.abs(Number(tx.amount || 0))
        if (sortBy === "category") {
          // Change this to sort by description alphabetically instead of by category
          return tx.description ? tx.description.toLowerCase() : ""
        }
        return 0
      }

      const valA = getVal(a)
      const valB = getVal(b)

      if (valA < valB) return sortOrder === "asc" ? -1 : 1
      if (valA > valB) return sortOrder === "asc" ? 1 : -1
      return 0
    })
  }, [filteredTransactions, sortBy, sortOrder])

  // Calculate financial summary with useMemo
  const financialSummary = useMemo(() => {
    console.log(`Calculating financial summary for ${filteredTransactions.length} transactions`)
    return calculateFinancials(filteredTransactions)
  }, [filteredTransactions])

  // Load accounts on initial render
  useEffect(() => {
    // Clear old cache on app start
    StorageService.clearOldCache()
    loadAccounts()
  }, [])

  // Reset scrollY when loading new data
  useEffect(() => {
    // Reset scroll position when loading new data
    scrollY.setValue(0)
    setScrollPosition(0)
  }, [selectedAccounts, startDate, endDate])

  // Load transactions when accounts, dates, or page changes
  useEffect(() => {
    if (selectedAccounts.length > 0) {
      console.log(`Date range changed: ${startDate} to ${endDate}, reloading transactions...`)
      // Reset the loadAttemptFailed flag when we're explicitly loading new data
      setLoadAttemptFailed(false)

      // Initialize account loading state
      const initialLoadingState: Record<
        string,
        {
          page: number
          hasMore: boolean
          loading: boolean
          emptyResponseCount: number
          retryCount: number
          expectedTotal: number
          loadedCount: number
        }
      > = {}

      selectedAccounts.forEach((accountId) => {
        initialLoadingState[accountId] = {
          page: 1,
          hasMore: true,
          loading: false,
          emptyResponseCount: 0,
          retryCount: 0,
          expectedTotal: 0,
          loadedCount: 0,
        }
      })

      setAccountLoadingState(initialLoadingState)
      loadTransactions(true)
    }
  }, [selectedAccounts, startDate, endDate])

  // Add useEffect to trigger refresh when filters change
  useEffect(() => {
    // Refresh transactions when category or type filters change
    if (selectedAccounts.length > 0 && !loading && !refreshing) {
      console.log("Filters changed, refreshing transactions...")
      loadTransactions(true)
    }
  }, [selectedCategory, selectedType])

  // Add useEffect to log transaction counts for debugging
  useEffect(() => {
    // Group transactions by account_id and count them
    const counts: Record<string, number> = {}

    transactions.forEach((tx) => {
      if (tx.account_id) {
        counts[tx.account_id] = (counts[tx.account_id] || 0) + 1
      }
    })

    // Update the transaction counts state
    setTransactionCounts(counts)

    // Log the counts
    console.log("Transaction counts by account:", counts)

    // Check if we need to load more transactions
    const accountsNeedingMore = Object.entries(accountLoadingState).filter(([accountId, state]) => {
      const currentCount = counts[accountId] || 0
      const expectedCount = state.expectedTotal

      // If we have an expected count and we haven't reached it yet
      return expectedCount > 0 && currentCount < expectedCount && state.hasMore && !state.loading
    })

    if (accountsNeedingMore.length > 0 && !loadingAllTransactionsRef.current) {
      console.log(
        "Some accounts need more transactions:",
        accountsNeedingMore.map(([id]) => id),
      )
      // Load more transactions for these accounts
      accountsNeedingMore.forEach(([accountId, state]) => {
        loadTransactionsForAccount(accountId, state.page, false)
      })
    }
  }, [transactions])

  // Handle date range change
  const handleDateRangeChange = useCallback(
    (newStartDate, newEndDate) => {
      console.log(`Date range changed: ${newStartDate} to ${newEndDate}`)
      console.log(`Types: startDate=${typeof newStartDate}, endDate=${typeof newEndDate}`)

      // Ensure we're working with string dates in YYYY-MM-DD format
      let formattedStartDate = newStartDate
      let formattedEndDate = newEndDate

      // If we received Date objects instead of strings, format them
      if (newStartDate instanceof Date) {
        formattedStartDate = formatDateToString(newStartDate)
      }

      if (newEndDate instanceof Date) {
        formattedEndDate = formatDateToString(newEndDate)
      }

      console.log(`Formatted dates: ${formattedStartDate} to ${formattedEndDate}`)

      // Validate that we have proper date strings in YYYY-MM-DD format
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/
      if (!dateRegex.test(formattedStartDate) || !dateRegex.test(formattedEndDate)) {
        console.error("Invalid date format. Expected YYYY-MM-DD")
        return
      }

      // Force clear transactions cache when dates change
      if (startDate !== formattedStartDate || endDate !== formattedEndDate) {
        console.log("Date range changed, clearing transactions cache")
        clearTransactionsCache().catch((err) => console.error("Error clearing transactions cache:", err))
      }

      setStartDate(formattedStartDate)
      setEndDate(formattedEndDate)
      // The useEffect will trigger a reload
    },
    [startDate, endDate],
  )

  // Load accounts function
  const loadAccounts = async () => {
    try {
      setAccountsLoading(true)
      setError(null)

      console.log("Loading accounts...")
      const accountsData = await fetchAccounts(ENTITY_ID)

      console.log(`Loaded ${accountsData.length} accounts`)
      setAccounts(accountsData)

      // Select first account by default instead of all accounts
      if (accountsData.length > 0) {
        const firstAccountId = accountsData[0].id
        console.log("Selecting first account ID:", firstAccountId)
        setSelectedAccounts([firstAccountId])
      }
    } catch (err) {
      console.error("Error loading accounts:", err)
      setError(`Failed to load accounts: ${err.message}`)
    } finally {
      setAccountsLoading(false)
    }
  }

  // Improved function to load transactions for a single account
  const loadTransactionsForAccount = async (accountId: string, page: number, reset = false) => {
  // Check if there's already an active request for this account
  if (activeRequests[accountId]) {
    console.log(`Skipping request for account ${accountId} - request already in progress`)
    return { success: false, hasMore: true, skipped: true }
  }

  // Declare emptyResponseCount and currentLoadedCount
  const emptyResponseCount = 0
  const currentLoadedCount = 0

  try {
    console.log(`Loading transactions for account ${accountId}, page ${page}`)

    // Mark this account as having an active request
    setActiveRequests(prev => ({
      ...prev,
      [accountId]: true
    }))

    // Update loading state for this account
    setAccountLoadingState((prev) => ({
      ...prev,
      [accountId]: {
        ...prev[accountId],
        loading: true,
        retryCount: prev[accountId]?.retryCount || 0,
      },
    }))

    // Add a small delay before making the request to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, REQUEST_DELAY))

    const result = await fetchTransactions(ENTITY_ID, accountId, startDate, endDate, page, TRANSACTIONS_PER_PAGE)

    // Ensure transactions is always an array
    const newTransactions = result.transactions || []
    console.log(`Received ${newTransactions.length} transactions for account ${accountId}, page ${page}`)

    // If this is the first page and we have a total count, store it
    let expectedTotal = 0
    if (page === 1 && result.total) {
      expectedTotal = result.total
      console.log(`Expected total transactions for account ${accountId}: ${expectedTotal}`)
    } else {
      // Use the previously stored expected total
      expectedTotal = accountLoadingState[accountId]?.expectedTotal || 0
    }

    // Add account information to each transaction
    const account = accounts.find((acc) => acc.id === accountId)
    const enhancedTransactions = newTransactions.map((transaction) => ({
      ...transaction,
      account_name: account ? account.name : "Unknown Account",
      account_type: account ? account.type : "Unknown",
      // Ensure each transaction has a truly unique ID
      id:
        transaction.id ||
        `${transaction.account_id}-${transaction.transaction_id || ""}-${Math.random().toString(36).substring(2, 10)}`,
    }))

    // Update transactions state
    if (reset) {
      // If resetting, replace all transactions for this account
      setTransactions((prev) => {
        // Filter out transactions from this account
        const otherAccountTransactions = prev.filter((t) => t.account_id !== accountId)
        return [...otherAccountTransactions, ...enhancedTransactions]
      })
    } else {
      // If not resetting, append new transactions
      setTransactions((prev) => {
        // Filter out duplicates
        const existingIds = new Set(prev.map((t) => t.id))
        const uniqueNewTransactions = enhancedTransactions.filter((t) => !existingIds.has(t.id))
        return [...prev, ...uniqueNewTransactions]
      })
    }

      // Update account loading state
      // Consider there might be more transactions even if we received fewer than the page size
      // This ensures we keep trying to load more until we get an empty response
      const hasMoreData =
      newTransactions.length > 0 && (newTransactions.length === TRANSACTIONS_PER_PAGE || result.hasMore)
    setAccountLoadingState((prev) => ({
      ...prev,
      [accountId]: {
        page: hasMoreData ? page + 1 : page,
        hasMore: hasMoreData,
        loading: false,
        emptyResponseCount,
        retryCount: 0, // Reset retry count on success
        expectedTotal,
        loadedCount: currentLoadedCount,
      },
    }))

    // If we have more data and haven't reached the expected total, load the next page after a delay
    if (hasMoreData && (expectedTotal === 0 || currentLoadedCount < expectedTotal) && newTransactions.length > 0) {
      console.log(
        `Continuing to load more for account ${accountId}, current: ${currentLoadedCount}, expected: ${expectedTotal}`,
      )
      // Increased delay to prevent overwhelming the API
      setTimeout(() => {
        loadTransactionsForAccount(accountId, page + 1, false)
      }, REQUEST_DELAY * 2)
    }

    return { success: true, hasMore: hasMoreData }
  } catch (err) {
    console.error(`Error loading transactions for account ${accountId}:`, err)
    
    // Check for duplicate request error
    const isDuplicateRequestError = 
      err?.message?.includes("DUPLICATED_REQUEST") || 
      (typeof err === 'object' && err?.status === "DUPLICATED_REQUEST")
    
    // Increment retry count
    const retryCount = (accountLoadingState[accountId]?.retryCount || 0) + 1

    // Determine if we should retry - always retry for duplicate request errors with increasing delay
    const shouldRetry = retryCount < MAX_LOAD_RETRIES || isDuplicateRequestError

    // Calculate retry delay - use exponential backoff for duplicate request errors
    const retryDelay = isDuplicateRequestError 
      ? Math.min(1000 * Math.pow(2, retryCount), 10000) // Exponential backoff with max 10 seconds
      : 1000 * retryCount

    // Update account loading state on error
    setAccountLoadingState((prev) => ({
      ...prev,
      [accountId]: {
        ...prev[accountId],
        loading: false,
        hasMore: shouldRetry, // Only mark as having more if we're going to retry
        retryCount,
      },
    }))

      // Retry after a delay if we haven't exceeded the retry limit
     if (shouldRetry) {
      console.log(`Retrying load for account ${accountId}, attempt ${retryCount} in ${retryDelay}ms`)
      setTimeout(() => {
        loadTransactionsForAccount(accountId, page, false)
      }, retryDelay)
    }

    return { success: false, hasMore: shouldRetry }
  } finally {
    // Mark this account as no longer having an active request
    // Use a small delay to prevent immediate re-requests
    setTimeout(() => {
      setActiveRequests(prev => ({
        ...prev,
        [accountId]: false
      }))
    }, REQUEST_DELAY)
  }
}

  // Load transactions function - modified to handle multiple accounts better
  const loadTransactions = async (reset = false) => {
    try {
      // Set the loading all transactions flag
      loadingAllTransactionsRef.current = true

      // If no accounts selected, don't try to load transactions
      if (selectedAccounts.length === 0) {
        setTransactions([])
        setTotalCount(0)
        setHasMore(false)
        return
      }

      // If resetting, show loading indicator and reset page
      if (reset) {
        setLoading(true)
        setCurrentPage(1)
        setTransactions([])
        // Reset the loadAttemptFailed flag when explicitly resetting
        setLoadAttemptFailed(false)
        // Reset scroll position
        scrollY.setValue(0)
        setScrollPosition(0)
      }

      setError(null)

      console.log(`Loading transactions for ${selectedAccounts.length} accounts`)
      console.log(`Date range: ${startDate} to ${endDate}`)

      // If only one account is selected, use the original approach
      if (selectedAccounts.length === 1) {
        const accountId = selectedAccounts[0]
        const page = reset ? 1 : accountLoadingState[accountId]?.page || 1

        await loadTransactionsForAccount(accountId, page, reset)
      } else {
        // For multiple accounts, we'll load them sequentially to avoid duplicate request errors
        // If resetting, clear all transactions first
        if (reset) {
          setTransactions([])
        }

        // Load first page of transactions for each account sequentially
        for (const accountId of selectedAccounts) {
          const page = reset ? 1 : accountLoadingState[accountId]?.page || 1
          await loadTransactionsForAccount(accountId, page, false)
          // Add a delay between accounts to avoid overwhelming the API
          await new Promise(resolve => setTimeout(resolve, REQUEST_DELAY * 2))
        }
      }

      // Check if any account has more transactions to load
      const anyAccountHasMore = Object.values(accountLoadingState).some((state) => state.hasMore)
      setHasMore(anyAccountHasMore)

      // Update total count (approximate)
      setTotalCount(transactions.length)
    } catch (err) {
      console.error("Error loading transactions:", err)
      setError(err.message)
      // Mark as failed attempt on error
      setLoadAttemptFailed(true)
      setHasMore(false)
    } finally {
      setLoading(false)
      setRefreshing(false)
      setLoadingMore(false)
      // Clear the loading all transactions flag
      loadingAllTransactionsRef.current = false
    }
  }

  // Handle pull-to-refresh
  const onRefresh = useCallback(() => {
    setRefreshing(true)
    // Reset the loadAttemptFailed flag when user explicitly refreshes
    setLoadAttemptFailed(false)
    // Reset scroll position
    scrollY.setValue(0)
    setScrollPosition(0)
    loadTransactions(true)
  }, [selectedAccounts, startDate, endDate])

  // Handle load more - modified to load more for each account that has more transactions
  const handleLoadMore = useCallback(() => {
  // Only load more if:
  // 1. We're not already loading
  // 2. There's potentially more data
  // 3. We haven't had a failed load attempt
  if (!loadingMore && hasMore && !loadAttemptFailed) {
    console.log("Loading more transactions...")
    setLoadingMore(true)

    // For single account, use the original approach
    if (selectedAccounts.length === 1) {
      loadTransactions(false)
    } else {
      // For multiple accounts, load more sequentially for each account that has more transactions
      (async () => {
        const accountsToLoad = selectedAccounts
          .filter((accountId) => accountLoadingState[accountId]?.hasMore && !accountLoadingState[accountId]?.loading && !activeRequests[accountId])
        
        for (const accountId of accountsToLoad) {
          await loadTransactionsForAccount(accountId, accountLoadingState[accountId].page, false)
          // Add a delay between accounts to avoid overwhelming the API
          await new Promise(resolve => setTimeout(resolve, REQUEST_DELAY * 2))
        }
        
        setLoadingMore(false)
      })()
    }
  } else {
    console.log(
      `Not loading more: loadingMore=${loadingMore}, hasMore=${hasMore}, loadAttemptFailed=${loadAttemptFailed}`,
    )
  }
}, [loadingMore, hasMore, loadAttemptFailed, selectedAccounts, accountLoadingState, activeRequests])

  // Handle account selection change
  const handleAccountsChange = useCallback((accountIds) => {
    console.log("Selected account IDs:", accountIds)
    setSelectedAccounts(accountIds)
    // The useEffect will trigger a reload
  }, [])

  // Handle cache clearing
  const handleClearCache = useCallback(async () => {
    try {
      setIsCacheClearing(true)
      await clearAllCache()
      Alert.alert("Success", "Cache cleared successfully")
      // Reload data
      await loadAccounts()
      // Reset the loadAttemptFailed flag when clearing cache
      setLoadAttemptFailed(false)
      await loadTransactions(true)
    } catch (error) {
      console.error("Error clearing cache:", error)
      Alert.alert("Error", "Failed to clear cache: " + error.message)
    } finally {
      setIsCacheClearing(false)
    }
  }, [])

  // Handle export to Excel
  const handleExportToExcel = useCallback(async () => {
    try {
      setIsExporting(true)

      // Check if we have transactions to export
      if (!sortedTransactions || sortedTransactions.length === 0) {
        Alert.alert("No Data", "There are no transactions to export.")
        return
      }

      // Generate filename with date range
      const fileName = `Transactions_${startDate}_to_${endDate}`

      console.log("Starting export process...")

      // Export the transactions
      await exportTransactionsToExcel(sortedTransactions, fileName)

      console.log("Export completed successfully")
      Alert.alert(
        "Export Successful",
        "Your transactions have been exported as a CSV file. You can open it with any spreadsheet application.",
      )
    } catch (error) {
      console.error("Error exporting to Excel:", error)
      Alert.alert(
        "Export Failed",
        `Failed to export transactions: ${error.message}\n\nIf you're using Expo Go, try installing the app directly for full functionality.`,
      )
    } finally {
      setIsExporting(false)
    }
  }, [sortedTransactions, startDate, endDate])

  // Optimize the renderTransactionItem function with React.memo
  const MemoizedTransactionCard = React.memo(TransactionCard)

  // Replace the renderTransactionItem function with this optimized version
  const renderTransactionItem = useCallback(({ item }) => {
  if (!item) {
    console.warn("Invalid transaction item:", item)
    return null
  }

  const amount = item.amount ? Number.parseFloat(item.amount) : 0
  // Check for pending status
  const isPending = item.pending === true
  
  // Determine the category based on amount and description, regardless of pending status
  const category = amount > 0 ? "income" : categorizeTransaction(item.description, false)

  return (
    <MemoizedTransactionCard
      transaction={item}
      category={category}
      isPending={isPending}
      onPress={() => console.log("Transaction pressed:", item.id)}
    />
  )
}, [])

  // Handle content size change
  const handleContentSizeChange = (w: number, h: number) => {
    setContentHeight(h)
  }

  // Handle layout change
  const handleLayout = (event: LayoutChangeEvent) => {
    setContainerHeight(event.nativeEvent.layout.height)
  }

  // Add a function to scroll to top
  const scrollToTop = () => {
    if (transactionListRef.current) {
      transactionListRef.current.scrollToOffset({ offset: 0, animated: true })
    }
  }

  // Add a function to scroll to bottom
  const scrollToBottom = () => {
    if (transactionListRef.current && contentHeight > 0) {
      transactionListRef.current.scrollToOffset({
        offset: contentHeight - containerHeight,
        animated: true,
      })
    }
  }

  // Safe fallback for scrollbar rendering
  const showCustomScrollbar = contentHeight > containerHeight && containerHeight > 0

  // Handle transaction box layout
  const handleTransactionBoxLayout = (event: LayoutChangeEvent) => {
    const { height, width } = event.nativeEvent.layout
    console.log("Transaction Box Layout: ", { height, width })
  }

  // Function to force load all transactions
  const forceLoadAllTransactions = useCallback(() => {
    Alert.alert(
      "Force Load All Transactions",
      "This will attempt to load all transactions for the selected accounts, which may take some time.",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Load All",
          onPress: () => {
            // Clear any existing transactions
            setTransactions([])

            // Reset account loading state
            const initialLoadingState: Record<
              string,
              {
                page: number
                hasMore: boolean
                loading: boolean
                emptyResponseCount: number
                retryCount: number
                expectedTotal: number
                loadedCount: number
              }
            > = {}

            selectedAccounts.forEach((accountId) => {
              initialLoadingState[accountId] = {
                page: 1,
                hasMore: true,
                loading: false,
                emptyResponseCount: 0,
                retryCount: 0,
                expectedTotal: 0,
                loadedCount: 0,
              }
            })

            setAccountLoadingState(initialLoadingState)

            // Load transactions with reset=true
            loadTransactions(true)
          },
        },
      ],
    )
  }, [selectedAccounts])

  return (
    <SafeAreaView style={[styles.safeArea, isDarkMode && { backgroundColor: "#121212" }]}>
      <ScrollView
        ref={mainScrollViewRef}
        style={[styles.container, isDarkMode && { backgroundColor: "#121212" }]}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={true}
        nestedScrollEnabled={true}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#3498db"]}
            progressViewOffset={10}
            tintColor={isDarkMode ? "#3498db" : "#3498db"}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, isDarkMode && { color: "#FFF" }]}>Transactions</Text>
          <TouchableOpacity
            style={[
              styles.headerButton,
              isCacheClearing && styles.disabledButton,
              isDarkMode && { backgroundColor: "#333" },
            ]}
            onPress={handleClearCache}
            disabled={isCacheClearing}
          >
            <MaterialIcons name="delete-sweep" size={16} color={isDarkMode ? "#FF6B6B" : "#e74c3c"} />
            <Text style={[styles.headerButtonText, { color: isDarkMode ? "#FF6B6B" : "#e74c3c" }]}>
              {isCacheClearing ? "Clearing..." : "Clear Cache"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Account Selector */}
        {accountsLoading ? (
          <View
            style={[styles.loadingAccountsContainer, isDarkMode && { backgroundColor: "#2A2A2A", borderColor: "#444" }]}
          >
            <ActivityIndicator size="small" color="#3498db" />
            <Text style={[styles.loadingAccountsText, isDarkMode && { color: "#CCC" }]}>Loading accounts...</Text>
          </View>
        ) : (
          <AccountSelector
            accounts={accounts}
            selectedAccounts={selectedAccounts}
            onAccountsChange={handleAccountsChange}
          />
        )}

        {/* Date Range Picker */}
        <DateRangePicker startDate={startDate} endDate={endDate} onDateRangeChange={handleDateRangeChange} />

        {/* Search */}
        <View style={styles.searchContainer}>
          <TextInput
            style={[
              styles.searchInput,
              isDarkMode && { backgroundColor: "#2A2A2A", color: "#FFF", borderColor: "#444" },
            ]}
            placeholder="Search by description, amount or account..."
            placeholderTextColor={isDarkMode ? "#888" : "#999"}
            value={searchQuery}
            onChangeText={setSearchQuery}
            clearButtonMode="while-editing"
          />
        </View>

        {/* Filters and Sorting */}
        <TransactionFilters
          selectedCategory={selectedCategory}
          setSelectedCategory={setSelectedCategory}
          selectedType={selectedType}
          setSelectedType={setSelectedType}
          sortOption={sortBy}
          setSortOption={setSortBy}
          sortDirection={sortOrder}
          setSortDirection={setSortOrder}
        />

        {/* Results Count */}
        <View style={styles.resultsCountContainer}>
          <Text style={[styles.resultsCount, isDarkMode && { color: "#AAA" }]}>
            {sortedTransactions.length} {sortedTransactions.length === 1 ? "transaction" : "transactions"} found
          </Text>
          <Text style={[styles.sortInfo, isDarkMode && { color: "#AAA" }]}>
            Sorted by: {sortBy.charAt(0).toUpperCase() + sortBy.slice(1)} {sortOrder === "asc" ? "↑" : "↓"}
          </Text>
        </View>

        {/* Financial Summary */}
        <FinancialSummary
          income={financialSummary.income}
          expenses={financialSummary.expenses}
          balance={financialSummary.balance}
          categoryTotals={financialSummary.categoryTotals}
          pendingAmount={financialSummary.pendingAmount}
        />

        {/* Error */}
        {error && (
          <View style={[styles.errorContainer, isDarkMode && { backgroundColor: "#3A1212" }]}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={() => loadTransactions(true)}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Transaction Box Header */}
        <View style={styles.transactionBoxContainer}>
          <View style={styles.transactionHeaderRow}>
            <View>
              <Text style={[styles.transactionBoxTitle, isDarkMode && { color: "#FFF" }]}>Transaction History</Text>
              <Text style={[styles.transactionSubtitle, isDarkMode && { color: "#AAA" }]}>
                Showing {sortedTransactions.length} transactions
              </Text>
            </View>
            <TouchableOpacity
              style={[
                styles.exportButton,
                isExporting && styles.disabledButton,
                isDarkMode && { backgroundColor: "#2C5282" },
              ]}
              onPress={handleExportToExcel}
              disabled={isExporting || sortedTransactions.length === 0}
            >
              <MaterialIcons name="file-download" size={16} color="#FFF" />
              <Text style={styles.exportButtonText}>{isExporting ? "Exporting..." : "Export"}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Transaction Box */}
        <View
          style={[styles.transactionBox, isDarkMode && { backgroundColor: "#2A2A2A", borderColor: "#444" }]}
          onLayout={handleTransactionBoxLayout}
        >
          {loading && !refreshing && !loadingMore ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#3498db" />
              <Text style={[styles.loadingText, isDarkMode && { color: "#AAA" }]}>Loading transactions...</Text>
            </View>
          ) : selectedAccounts.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={[styles.emptyText, isDarkMode && { color: "#AAA" }]}>
                Please select at least one account to view transactions.
              </Text>
            </View>
          ) : sortedTransactions.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={[styles.emptyText, isDarkMode && { color: "#AAA" }]}>
                No transactions found for the selected filters.
              </Text>
            </View>
          ) : (
            <View style={styles.flatListContainer} onLayout={handleLayout}>
              {/* Update the FlatList to include a RefreshControl for pull-to-refresh */}
              <Animated.FlatList
                ref={transactionListRef}
                data={sortedTransactions}
                keyExtractor={(item) => item?.id || `transaction-${Math.random().toString(36).substring(2, 15)}`}
                renderItem={renderTransactionItem}
                contentContainerStyle={styles.transactionListContent}
                nestedScrollEnabled={true}
                scrollEnabled={flatListScrollEnabled}
                initialNumToRender={20}
                maxToRenderPerBatch={20}
                windowSize={10}
                removeClippedSubviews={true}
                onEndReached={handleLoadMore}
                onEndReachedThreshold={0.5}
                updateCellsBatchingPeriod={50}
                showsVerticalScrollIndicator={false}
                refreshControl={
                  <RefreshControl
                    refreshing={refreshing}
                    onRefresh={onRefresh}
                    colors={["#3498db"]}
                    progressViewOffset={10}
                    tintColor={isDarkMode ? "#3498db" : "#3498db"}
                  />
                }
                onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
                  useNativeDriver: false,
                  listener: (event) => {
                    const offsetY = event.nativeEvent.contentOffset.y
                    setScrollPosition(offsetY)
                  },
                })}
                scrollEventThrottle={16}
                onContentSizeChange={handleContentSizeChange}
                getItemLayout={(data, index) => ({
                  length: 100, // Approximate height of each transaction card
                  offset: 100 * index,
                  index,
                })}
                ListFooterComponent={
                  loadingMore ? (
                    <View style={styles.loadingMoreContainer}>
                      <ActivityIndicator size="small" color="#3498db" />
                      <Text style={[styles.loadingMoreText, isDarkMode && { color: "#AAA" }]}>Loading more...</Text>
                    </View>
                  ) : hasMore && !loadAttemptFailed ? (
                    <TouchableOpacity
                      style={[styles.loadMoreButton, isDarkMode && { backgroundColor: "#2C5282" }]}
                      onPress={handleLoadMore}
                    >
                      <Text style={styles.loadMoreButtonText}>Load More Transactions</Text>
                    </TouchableOpacity>
                  ) : (
                    <Text style={[styles.endOfListText, isDarkMode && { color: "#AAA" }]}>
                      {loadAttemptFailed ? "Pull down to refresh for more transactions" : "End of transactions"}
                    </Text>
                  )
                }
              />

              {/* Custom Scrollbar - only show if content is taller than container */}
              {showCustomScrollbar && (
                <CustomScrollbar
                  scrollViewRef={transactionListRef}
                  contentHeight={contentHeight}
                  containerHeight={containerHeight}
                  scrollY={scrollY}
                  isDarkMode={isDarkMode}
                  setScrollEnabled={setFlatListScrollEnabled}
                />
              )}

              {/* Scroll buttons */}
              {contentHeight > containerHeight && (
                <>
                  {scrollPosition > SCROLL_THRESHOLD && (
                    <TouchableOpacity style={styles.scrollToTopButton} onPress={scrollToTop}>
                      <MaterialIcons name="arrow-upward" size={24} color="#FFF" />
                    </TouchableOpacity>
                  )}
                  {/* Hide scroll down button when at the bottom */}
                  {scrollPosition + containerHeight < contentHeight - 20 && (
                    <TouchableOpacity style={styles.scrollToBottomButton} onPress={scrollToBottom}>
                      <MaterialIcons name="arrow-downward" size={24} color="#FFF" />
                    </TouchableOpacity>
                  )}
                </>
              )}
            </View>
          )}
        </View>

        {/* Bottom padding */}
        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  header: {
    marginBottom: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#333",
  },
  headerButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f0f0f0",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
  },
  headerButtonText: {
    fontSize: 12,
    color: "#3498db",
    marginLeft: 4,
  },
  disabledButton: {
    opacity: 0.5,
  },
  loadingAccountsContainer: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: "#eee",
  },
  loadingAccountsText: {
    marginLeft: 10,
    color: "#666",
  },
  searchContainer: {
    marginVertical: 16,
  },
  searchInput: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: "#eee",
  },
  resultsCountContainer: {
    marginBottom: 16,
  },
  resultsCount: {
    fontSize: 14,
    color: "#666",
    fontStyle: "italic",
  },
  sortInfo: {
    fontSize: 14,
    color: "#666",
    marginTop: 4,
  },
  transactionCountsContainer: {
    marginTop: 8,
    padding: 8,
    backgroundColor: "rgba(0,0,0,0.05)",
    borderRadius: 8,
  },
  transactionCountText: {
    fontSize: 12,
    color: "#666",
    marginBottom: 2,
  },
  forceLoadButton: {
    marginTop: 8,
    backgroundColor: "#3498db",
    padding: 6,
    borderRadius: 4,
    alignItems: "center",
  },
  forceLoadButtonText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "500",
  },
  transactionBoxContainer: {
    marginTop: 16,
    marginBottom: 8,
  },
  transactionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  transactionBoxTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
  },
  transactionSubtitle: {
    fontSize: 12,
    color: "#666",
    marginTop: 4,
  },
  exportButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#3498db",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  exportButtonText: {
    fontSize: 14,
    color: "#fff",
    marginLeft: 4,
    fontWeight: "500",
  },
  transactionBox: {
    height: screenHeight * 0.75,
    backgroundColor: "#fff",
    borderRadius: 12,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: "#eee",
  },
  flatListContainer: {
    flex: 1,
    position: "relative",
  },
  transactionListContent: {
    padding: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#666",
  },
  loadingMoreContainer: {
    padding: 16,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
  loadingMoreText: {
    marginLeft: 8,
    color: "#666",
  },
  errorContainer: {
    padding: 16,
    backgroundColor: "#ffebee",
    borderRadius: 12,
    marginBottom: 16,
    alignItems: "center",
  },
  errorText: {
    color: "#c62828",
    fontSize: 15,
    marginBottom: 10,
  },
  retryButton: {
    backgroundColor: "#c62828",
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
  },
  retryButtonText: {
    color: "#fff",
    fontWeight: "500",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  emptyText: {
    textAlign: "center",
    fontSize: 16,
    color: "#666",
    lineHeight: 24,
  },
  loadMoreButton: {
    backgroundColor: "#3498db",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    margin: 16,
  },
  loadMoreButtonText: {
    color: "#fff",
    fontWeight: "500",
  },
  endOfListText: {
    textAlign: "center",
    padding: 16,
    color: "#666",
  },
  scrollToTopButton: {
    position: "absolute",
    bottom: 74, // Position above the down button
    right: 20,
    backgroundColor: "#3498db",
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  scrollToBottomButton: {
    position: "absolute",
    bottom: 20,
    right: 20,
    backgroundColor: "#3498db",
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
})

export default TransactionsScreen