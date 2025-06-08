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
import { useFocusEffect } from "@react-navigation/native"
import * as FileSystem from "expo-file-system"
import * as Sharing from "expo-sharing"

// Components
import TransactionCard from "../components/TransactionCard"
import DateRangePicker from "../components/DateRangePicker"
import FinancialSummary from "../components/FinancialSummary"
import AccountSelector from "../components/AccountSelector"
import TransactionFilters from "../components/TransactionFilters"
import CustomScrollbar from "../components/CustomScrollbar"
import TransactionDetailModal from "../components/TransactionDetailModal"

// Services and Utils
import { fetchTransactions, fetchAccounts, clearAllCache, clearTransactionsCache } from "../services/lean-api"
import { categorizeTransaction, calculateFinancials } from "../utils/categorizer"
import { StorageService } from "../services/storage-service"
import { AccountPersistenceService } from "../services/account-persistence"
import { useTheme } from "../context/ThemeContext"
import { leanEntityService } from "../services/lean-entity-service"

// Import the date utility functions
import { formatDateToString, getFirstDayOfMonth, getCurrentDate } from "../utils/date-utils"

// Suppress the warning about nested scrollviews
LogBox.ignoreLogs(["VirtualizedLists should never be nested"])

const screenHeight = Dimensions.get("window").height
const screenWidth = Dimensions.get("window").width

// Constants
const TRANSACTIONS_PER_PAGE = 50
// Increase this for multi-account fetches to load more transactions at once
const MULTI_ACCOUNT_TRANSACTIONS_PER_PAGE = 100
// Maximum number of pages to load per account (to prevent infinite loops)
const MAX_PAGES_PER_ACCOUNT = 20

// Sort options for transaction history
const transactionSortOptions = [
  { key: "date_desc", label: "Date (Newest First)", sortBy: "date", direction: "desc" },
  { key: "date_asc", label: "Date (Oldest First)", sortBy: "date", direction: "asc" },
  { key: "amount_desc", label: "Amount (High to Low)", sortBy: "amount", direction: "desc" },
  { key: "amount_asc", label: "Amount (Low to High)", sortBy: "amount", direction: "asc" },
  { key: "alpha_asc", label: "Alphabetical (A-Z)", sortBy: "category", direction: "asc" },
  { key: "alpha_desc", label: "Alphabetical (Z-A)", sortBy: "category", direction: "desc" },
]

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
  const [isSearchVisible, setIsSearchVisible] = useState(false)
  // Update to use array for multiple category selection
  const [selectedCategory, setSelectedCategory] = useState<string[]>(["All"])
  const [selectedType, setSelectedType] = useState<string[]>(["All"])
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
  // Track loading state for each account
  const [accountLoadingState, setAccountLoadingState] = useState<
    Record<string, { page: number; hasMore: boolean; loading: boolean; totalLoaded: number }>
  >({})
  const [scrollPosition, setScrollPosition] = useState(0)
  const SCROLL_THRESHOLD = 200 // Show up button after scrolling this far
  // Add a flag to track if we're currently loading all pages
  const [loadingAllPages, setLoadingAllPages] = useState(false)
  // Add a state to track the last refresh timestamp
  const [lastRefreshTime, setLastRefreshTime] = useState<Date | null>(null)
  // Add entity ID state
  const [entityId, setEntityId] = useState<string | null>(null)
  // Add state for transaction history sort dropdown
  const [transactionSortDropdownVisible, setTransactionSortDropdownVisible] = useState(false)
  // Transaction detail modal state
  const [selectedTransaction, setSelectedTransaction] = useState(null)
  const [transactionDetailVisible, setTransactionDetailVisible] = useState(false)

  // Refs
  const mainScrollViewRef = useRef(null)
  const transactionListRef = useRef(null)
  const scrollY = useRef(new Animated.Value(0)).current
  const isLoadingAllPagesRef = useRef(false)
  const searchInputRef = useRef(null)
  const searchWidthAnim = useRef(new Animated.Value(0)).current

  // Check for entity ID when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      checkBankConnection()
    }, []),
  )

  const checkBankConnection = async () => {
    try {
      console.log("Checking bank connection...")
      const storedEntityId = await leanEntityService.getEntityId()

      if (storedEntityId) {
        console.log("Found entity ID:", storedEntityId)
        setEntityId(storedEntityId)
        setError(null)

        // Load accounts when we have entity ID
        if (!accounts.length || accounts.length === 0) {
          loadAccounts(storedEntityId)
        }
      } else {
        console.log("No entity ID found")
        setEntityId(null)
        setAccounts([])
        setSelectedAccounts([])
        setTransactions([])
        setError("No bank account connected. Please connect your bank account in Settings.")
      }
    } catch (err) {
      console.error("Error checking bank connection:", err)
      setError("Error checking bank connection status.")
    }
  }

  // Set up periodic checking for entity ID (for when user connects bank)
  useEffect(() => {
    const interval = setInterval(() => {
      checkBankConnection()
    }, 3000)

    return () => clearInterval(interval)
  }, [accounts.length])

  // Toggle search visibility
  const toggleSearch = () => {
    if (isSearchVisible) {
      // Hide search
      Animated.timing(searchWidthAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: false,
      }).start(() => {
        setIsSearchVisible(false)
        setSearchQuery("")
      })
    } else {
      // Show search
      setIsSearchVisible(true)
      Animated.timing(searchWidthAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: false,
      }).start(() => {
        searchInputRef.current?.focus()
      })
    }
  }

  // FIXED: Filter transactions based on search query, category, type, and account
  const filteredTransactions = useMemo(() => {
    return Array.isArray(transactions)
      ? transactions.filter((transaction) => {
          // Skip invalid transactions
          if (!transaction || !transaction.description) return false

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
            (transaction.lean_description &&
              transaction.lean_description.toLowerCase().includes(searchQuery.toLowerCase())) ||
            (transaction.amount && transaction.amount.toString().includes(searchQuery)) ||
            (transaction.account_name && transaction.account_name.toLowerCase().includes(searchQuery.toLowerCase()))

          // Check for pending status
          const isPending = transaction.pending === true

          // Get transaction amount and determine if it's income
          const amount = transaction.amount ? Number.parseFloat(transaction.amount) : 0
          const isIncome = amount > 0

          // Get the category for this transaction
          const transactionCategory = categorizeTransaction(transaction, isPending)

          // FIXED: Category filtering logic
          let matchesCategory = false
          if (selectedCategory.includes("All")) {
            matchesCategory = true
          } else {
            // Check if the transaction's category matches any selected category
            matchesCategory = selectedCategory.some((selectedCat) => {
              // Handle special case for income category
              if (selectedCat.toLowerCase() === "income") {
                return isIncome && transactionCategory.toLowerCase() === "income"
              }
              // For other categories, match the transaction category
              return transactionCategory.toLowerCase() === selectedCat.toLowerCase()
            })
          }

          // FIXED: Transaction type filtering - now properly handles both inflow and expense for categories
          let matchesType = false
          if (selectedType.includes("All")) {
            matchesType = true
          } else {
            // Check each selected type
            for (const type of selectedType) {
              if (type === "Pending" && isPending) {
                matchesType = true
                break
              } else if (type === "Inflow" && !isPending && isIncome) {
                matchesType = true
                break
              } else if (type === "Expense" && !isPending && !isIncome) {
                matchesType = true
                break
              }
            }
          }

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
    // Make sure we're passing an array to calculateFinancials
    return calculateFinancials(Array.isArray(filteredTransactions) ? filteredTransactions : [])
  }, [filteredTransactions])

  // Load accounts on initial render
  useEffect(() => {
    // Clear old cache on app start
    StorageService.clearOldCache()
    checkBankConnection()
  }, [])

  // Load transactions when accounts, dates, or page changes
  useEffect(() => {
    if (selectedAccounts.length > 0 && entityId) {
      console.log(`Date range changed: ${startDate} to ${endDate}, reloading transactions...`)
      // Reset the loadAttemptFailed flag when we're explicitly loading new data
      setLoadAttemptFailed(false)

      // Initialize account loading state
      const initialLoadingState: Record<
        string,
        { page: number; hasMore: boolean; loading: boolean; totalLoaded: number }
      > = {}
      selectedAccounts.forEach((accountId) => {
        initialLoadingState[accountId] = { page: 1, hasMore: true, loading: false, totalLoaded: 0 }
      })
      setAccountLoadingState(initialLoadingState)

      // Force clear transactions cache when dates change
      clearTransactionsCache().catch((err) => console.error("Error clearing transactions cache:", err))

      // Load all transactions for the selected accounts and date range
      loadAllTransactions(true)
    }
  }, [selectedAccounts, startDate, endDate, entityId])

  // Add a function to force refresh the date range
  const forceRefreshDateRange = useCallback(() => {
    console.log("Forcing date range refresh to reload transactions")
    // Make a copy of the current dates
    const currentStartDate = startDate
    const currentEndDate = endDate

    // Clear transactions cache
    clearTransactionsCache().catch((err) => console.error("Error clearing transactions cache:", err))

    // Set the same dates again to trigger the useEffect
    setStartDate(currentStartDate)
    setEndDate(currentEndDate)
  }, [startDate, endDate])

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

  // Load accounts function - now uses dynamic entity ID and loads saved selection
  const loadAccounts = async (currentEntityId?: string) => {
    try {
      setAccountsLoading(true)
      setError(null)

      const entityIdToUse = currentEntityId || entityId
      if (!entityIdToUse) {
        setError("No entity ID available. Please connect your bank account.")
        return
      }

      console.log("Loading accounts...")
      const accountsData = await fetchAccounts()

      console.log(`Loaded ${accountsData.length} accounts`)
      setAccounts(accountsData)

      // Load saved account selection
      const savedAccountIds = await AccountPersistenceService.loadSelectedAccounts()

      if (savedAccountIds.length > 0) {
        // Validate that saved accounts still exist
        const validAccountIds = AccountPersistenceService.validateAccountIds(savedAccountIds, accountsData)

        if (validAccountIds.length > 0) {
          console.log("Restoring saved account selection:", validAccountIds)
          setSelectedAccounts(validAccountIds)

          // If some accounts were removed, save the updated list
          if (validAccountIds.length !== savedAccountIds.length) {
            await AccountPersistenceService.saveSelectedAccounts(validAccountIds)
          }
        } else {
          // No valid saved accounts, select first account by default
          if (accountsData.length > 0) {
            const firstAccountId = accountsData[0].id
            console.log("No valid saved accounts, selecting first account ID:", firstAccountId)
            setSelectedAccounts([firstAccountId])
            await AccountPersistenceService.saveSelectedAccounts([firstAccountId])
          }
        }
      } else {
        // No saved selection, select first account by default
        if (accountsData.length > 0) {
          const firstAccountId = accountsData[0].id
          console.log("No saved selection, selecting first account ID:", firstAccountId)
          setSelectedAccounts([firstAccountId])
          await AccountPersistenceService.saveSelectedAccounts([firstAccountId])
        }
      }
    } catch (err) {
      console.error("Error loading accounts:", err)
      setError(`Failed to load accounts: ${err.message}`)
    } finally {
      setAccountsLoading(false)
    }
  }

  // New function to load transactions for a single account
  const loadTransactionsForAccount = async (accountId: string, page: number, reset = false) => {
    try {
      console.log(`Loading transactions for account ${accountId}, page ${page}`)

      // Update loading state for this account
      setAccountLoadingState((prev) => ({
        ...prev,
        [accountId]: { ...prev[accountId], loading: true },
      }))

      const result = await fetchTransactions(ENTITY_ID, accountId, startDate, endDate, page, TRANSACTIONS_PER_PAGE)

      // Ensure transactions is always an array
      const newTransactions = result.transactions || []
      console.log(`Received ${newTransactions.length} transactions for account ${accountId}, page ${page}`)

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
      const hasMoreData = newTransactions.length === TRANSACTIONS_PER_PAGE && result.hasMore
      const totalLoaded = (accountLoadingState[accountId]?.totalLoaded || 0) + newTransactions.length

      setAccountLoadingState((prev) => ({
        ...prev,
        [accountId]: {
          page: hasMoreData ? page + 1 : page,
          hasMore: hasMoreData,
          loading: false,
          totalLoaded: totalLoaded,
        },
      }))

      return {
        success: true,
        hasMore: hasMoreData,
        transactions: newTransactions,
        totalLoaded: totalLoaded,
      }
    } catch (err) {
      console.error(`Error loading transactions for account ${accountId}:`, err)

      // Update account loading state on error
      setAccountLoadingState((prev) => ({
        ...prev,
        [accountId]: { ...prev[accountId], loading: false, hasMore: false },
      }))

      return { success: false, hasMore: false, transactions: [], totalLoaded: 0 }
    }
  }

  // New function to load all pages of transactions for all accounts
  const loadAllTransactions = async (reset = false) => {
    // Prevent multiple concurrent calls to loadAllTransactions
    if (isLoadingAllPagesRef.current) {
      console.log("Already loading all pages, skipping request")
      return
    }

    try {
      isLoadingAllPagesRef.current = true
      setLoadingAllPages(true)

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
      }

      setError(null)

      console.log(`Loading ALL transactions for ${selectedAccounts.length} accounts`)
      console.log(`Date range: ${startDate} to ${endDate}`)

      // For each account, load all pages of transactions
      for (const accountId of selectedAccounts) {
        let page = 1
        let hasMore = true
        let totalLoaded = 0

        // Reset transactions for this account if we're resetting
        if (reset) {
          setTransactions((prev) => prev.filter((t) => t.account_id !== accountId))
        }

        // Load pages until there are no more or we hit the maximum
        while (hasMore && page <= MAX_PAGES_PER_ACCOUNT) {
          console.log(`Loading page ${page} for account ${accountId}`)

          const result = await loadTransactionsForAccount(accountId, page, false)
          hasMore = result.hasMore
          totalLoaded += result.transactions.length

          // Update the page number for the next iteration
          page++

          // If we got fewer transactions than expected, we're done
          if (result.transactions.length < TRANSACTIONS_PER_PAGE) {
            hasMore = false
          }
        }

        console.log(`Finished loading ${totalLoaded} transactions for account ${accountId}`)
      }

      // Update the last refresh time
      setLastRefreshTime(new Date())

      // Check if any account has more transactions to load
      const anyAccountHasMore = Object.values(accountLoadingState).some((state) => state.hasMore)
      setHasMore(anyAccountHasMore)

      // Update total count
      setTotalCount(transactions.length)

      console.log(`Loaded a total of ${transactions.length} transactions across all accounts`)
    } catch (err) {
      console.error("Error loading all transactions:", err)
      setError(err.message)
      // Mark as failed attempt on error
      setLoadAttemptFailed(true)
      setHasMore(false)
    } finally {
      setLoading(false)
      setRefreshing(false)
      setLoadingMore(false)
      setLoadingAllPages(false)
      isLoadingAllPagesRef.current = false
    }
  }

  // Handle pull-to-refresh
  const onRefresh = useCallback(() => {
    setRefreshing(true)
    // Reset the loadAttemptFailed flag when user explicitly refreshes
    setLoadAttemptFailed(false)
    // Clear the cache to ensure fresh data
    clearTransactionsCache().catch((err) => console.error("Error clearing transactions cache:", err))
    // Re-check bank connection and reload accounts
    checkBankConnection()
    // Load all transactions for all accounts
    if (selectedAccounts.length > 0 && entityId) {
      loadAllTransactions(true)
    }
  }, [selectedAccounts, startDate, endDate, entityId])

  // Handle load more - modified to load more for each account that has more transactions
  const handleLoadMore = useCallback(() => {
    // Only load more if:
    // 1. We're not already loading
    // 2. There's potentially more data
    // 3. We haven't had a failed load attempt
    if (!loadingMore && hasMore && !loadAttemptFailed && !isLoadingAllPagesRef.current) {
      console.log("Loading more transactions...")
      setLoadingMore(true)

      // For single account, use the original approach
      if (selectedAccounts.length === 1) {
        const accountId = selectedAccounts[0]
        const page = accountLoadingState[accountId]?.page || 1
        loadTransactionsForAccount(accountId, page, false).finally(() => {
          setLoadingMore(false)
        })
      } else {
        // For multiple accounts, load more for each account that has more transactions
        const loadMorePromises = selectedAccounts
          .filter((accountId) => accountLoadingState[accountId]?.hasMore && !accountLoadingState[accountId]?.loading)
          .map((accountId) => {
            return loadTransactionsForAccount(accountId, accountLoadingState[accountId].page, false)
          })

        Promise.all(loadMorePromises).finally(() => {
          setLoadingMore(false)
        })
      }
    } else {
      console.log(
        `Not loading more: loadingMore=${loadingMore}, hasMore=${hasMore}, loadAttemptFailed=${loadAttemptFailed}, isLoadingAllPages=${isLoadingAllPagesRef.current}`,
      )
    }
  }, [loadingMore, hasMore, loadAttemptFailed, selectedAccounts, accountLoadingState])

  // Handle account selection change - SAVES TO STORAGE
  const handleAccountsChange = useCallback(async (accountIds) => {
    console.log("Selected account IDs:", accountIds)
    setSelectedAccounts(accountIds)

    // Save selected accounts to persistent storage
    await AccountPersistenceService.saveSelectedAccounts(accountIds)

    // The useEffect will trigger a reload
  }, [])

  // Handle cache clearing
  const handleClearCache = useCallback(async () => {
    try {
      setIsCacheClearing(true)
      await clearAllCache()
      Alert.alert("Success", "Cache cleared successfully")
      // Reload data
      await checkBankConnection()
      // Reset the loadAttemptFailed flag when clearing cache
      setLoadAttemptFailed(false)
      if (entityId) {
        await loadAccounts(entityId)
        await loadAllTransactions(true)
      }
    } catch (error) {
      console.error("Error clearing cache:", error)
      Alert.alert("Error", "Failed to clear cache: " + error.message)
    } finally {
      setIsCacheClearing(false)
    }
  }, [entityId])

  // Handle export to CSV - Updated to download instead of share
  const handleExportToCSV = useCallback(async () => {
    try {
      setIsExporting(true)

      // Check if we have transactions to export
      if (!sortedTransactions || sortedTransactions.length === 0) {
        Alert.alert("No Data", "There are no transactions to export.")
        return
      }

      // Generate filename with date range
      const fileName = `Transactions_${startDate}_to_${endDate}.csv`

      console.log("Starting CSV export process...")

      // Create CSV content
      const headers = ["Date", "Description", "Amount", "Category", "Account", "Status", "Lean Category", "Confidence"]
      const csvContent = [
        headers.join(","),
        ...sortedTransactions.map((transaction) => {
          const isIncome = transaction.amount > 0
          const category = isIncome ? "income" : categorizeTransaction(transaction)
          const status = transaction.pending ? "Pending" : "Completed"
          const date = new Date(transaction.timestamp || transaction.date).toLocaleDateString()

          return [
            date,
            `"${transaction.description.replace(/"/g, '""')}"`,
            transaction.amount,
            category,
            `"${transaction.account_name}"`,
            status,
            transaction.lean_category || "N/A",
            transaction.lean_category_confidence || "N/A",
          ].join(",")
        }),
      ].join("\n")

      // Create file path
      const fileUri = FileSystem.documentDirectory + fileName

      // Write CSV content to file
      await FileSystem.writeAsStringAsync(fileUri, csvContent, {
        encoding: FileSystem.EncodingType.UTF8,
      })

      console.log("CSV file created at:", fileUri)

      // Download the file (save to device)
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: "text/csv",
          dialogTitle: "Save CSV File",
          UTI: "public.comma-separated-values-text",
        })
      } else {
        Alert.alert("Export Complete", `CSV file saved to: ${fileName}`)
      }

      console.log("CSV export completed successfully")
    } catch (error) {
      console.error("Error exporting to CSV:", error)
      Alert.alert("Export Failed", `Failed to export transactions: ${error.message}`)
    } finally {
      setIsExporting(false)
    }
  }, [sortedTransactions, startDate, endDate])

  // Handle transaction history sort option change
  const handleTransactionSortOptionChange = (sortOption: any) => {
    setSortBy(sortOption.sortBy)
    setSortOrder(sortOption.direction)
    setTransactionSortDropdownVisible(false)
  }

  // Get current sort option label
  const getCurrentSortLabel = () => {
    const currentOption = transactionSortOptions.find(
      (option) => option.sortBy === sortBy && option.direction === sortOrder,
    )
    return currentOption ? currentOption.label : "Date (Newest First)"
  }

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

  // Format the last refresh time
  const formatLastRefreshTime = () => {
    if (!lastRefreshTime) return "Never"

    return lastRefreshTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  }

  // Update the reset filters function
  const onResetFilters = () => {
    setSelectedCategory(["All"])
    setSelectedType(["All"])
    // Don't force refresh here, just update the filter
  }

  // Calculate the search width based on animation value
  const searchWidth = searchWidthAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  })

  // Handle transaction press
  const handleTransactionPress = (transaction: any) => {
    setSelectedTransaction(transaction)
    setTransactionDetailVisible(true)
  }

  // Handle transaction detail modal close
  const handleTransactionDetailClose = () => {
    setTransactionDetailVisible(false)
    setSelectedTransaction(null)
  }

  // Show connection prompt if no entity ID
  if (!entityId && !accountsLoading) {
    return (
      <SafeAreaView style={[styles.safeArea, isDarkMode && { backgroundColor: "#121212" }]}>
        <ScrollView
          style={[styles.container, isDarkMode && { backgroundColor: "#121212" }]}
          contentContainerStyle={styles.contentContainer}
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
          <View style={styles.header}>
            <Text style={[styles.title, isDarkMode && { color: "#FFF" }]}>Transactions</Text>
          </View>

          <View style={[styles.connectionPrompt, isDarkMode && { backgroundColor: "#1E1E1E", borderColor: "#333" }]}>
            <Text style={[styles.connectionTitle, isDarkMode && { color: "#FFF" }]}>Connect Your Bank Account</Text>
            <Text style={[styles.connectionText, isDarkMode && { color: "#AAA" }]}>
              To view your transactions, please connect your bank account in the Settings tab.
            </Text>
            <TouchableOpacity
              style={[styles.connectionButton, isDarkMode && { backgroundColor: "#2C5282" }]}
              onPress={onRefresh}
            >
              <Text style={styles.connectionButtonText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    )
  }

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

        {/* Date Range Picker with Refresh Button */}
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <View style={{ flex: 1 }}>
            <DateRangePicker startDate={startDate} endDate={endDate} onDateRangeChange={handleDateRangeChange} />
          </View>
        </View>

        {/* Search Bar - Collapsible from left to right */}
        <View style={styles.searchContainer}>
          <View style={styles.searchRow}>
            <TouchableOpacity
              style={[
                styles.searchButton,
                isDarkMode && { backgroundColor: "#2A2A2A" },
                isSearchVisible && { marginRight: 8 },
              ]}
              onPress={toggleSearch}
            >
              <MaterialIcons
                name={isSearchVisible ? "close" : "search"}
                size={24}
                color={isDarkMode ? "#DDD" : "#333"}
              />
            </TouchableOpacity>
            {isSearchVisible && (
              <Animated.View style={[styles.searchInputContainer, { width: searchWidth }]}>
                <TextInput
                  ref={searchInputRef}
                  style={[
                    styles.searchInput,
                    isDarkMode && { backgroundColor: "#2A2A2A", color: "#FFF", borderColor: "#444" },
                  ]}
                  placeholder="Search transactions..."
                  placeholderTextColor={isDarkMode ? "#888" : "#999"}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  clearButtonMode="while-editing"
                />
              </Animated.View>
            )}
          </View>
        </View>

        {/* Filters (without export button) */}
        <TransactionFilters
          selectedCategory={selectedCategory}
          setSelectedCategory={(categories) => {
            setSelectedCategory(categories)
            // Don't force refresh here, just update the filter
          }}
          selectedType={selectedType}
          setSelectedType={(type) => {
            setSelectedType(type)
            // Don't force refresh here, just update the filter
          }}
          onResetFilters={onResetFilters}
        />

        {/* Results Count */}
        <View style={styles.resultsCountContainer}>
          <Text style={[styles.resultsCount, isDarkMode && { color: "#AAA" }]}>
            {sortedTransactions.length.toLocaleString()}{" "}
            {sortedTransactions.length === 1 ? "transaction" : "transactions"} found
          </Text>
          <Text style={[styles.sortInfo, isDarkMode && { color: "#AAA" }]}>Sorted by: {getCurrentSortLabel()}</Text>
        </View>

        {/* Financial Summary */}
        <FinancialSummary
          income={financialSummary.income}
          expenses={financialSummary.expenses}
          balance={financialSummary.balance}
          categoryTotals={financialSummary.categoryTotals}
          pendingAmount={financialSummary.pendingAmount}
          inflowCategories={financialSummary.inflowCategories}
          expenseCategories={financialSummary.expenseCategories}
          selectedType={selectedType}
        />

        {/* Error */}
        {error && (
          <View style={[styles.errorContainer, isDarkMode && { backgroundColor: "#3A1212" }]}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={() => loadAllTransactions(true)}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Transaction Box Header */}
        <View style={styles.transactionBoxContainer}>
          <View style={styles.transactionHeaderRow}>
            <View style={styles.transactionHeaderLeft}>
              <Text style={[styles.transactionBoxTitle, isDarkMode && { color: "#FFF" }]}>Transaction History</Text>
              <Text style={[styles.transactionSubtitle, isDarkMode && { color: "#AAA" }]}>
                Showing {sortedTransactions.length.toLocaleString()} transactions
              </Text>
            </View>
            <View style={styles.transactionHeaderRight}>
              {/* Export Button - MOVED BACK HERE */}
              <TouchableOpacity
                style={[
                  styles.exportButton,
                  isDarkMode && { backgroundColor: "#2A2A2A" },
                  isExporting && styles.disabledButton,
                ]}
                onPress={handleExportToCSV}
                disabled={isExporting || sortedTransactions.length === 0}
              >
                <MaterialIcons
                  name={isExporting ? "hourglass-empty" : "file-download"}
                  size={16}
                  color={isDarkMode ? "#3498db" : "#3498db"}
                />
                <Text style={[styles.exportButtonText, isDarkMode && { color: "#3498db" }]}>
                  {isExporting ? "Exporting..." : "Export"}
                </Text>
              </TouchableOpacity>

              {/* Sort Button */}
              <View style={styles.sortContainer}>
                <TouchableOpacity
                  style={[styles.sortButton, isDarkMode && { backgroundColor: "#2A2A2A" }]}
                  onPress={() => setTransactionSortDropdownVisible(!transactionSortDropdownVisible)}
                >
                  <MaterialIcons name="sort" size={20} color={isDarkMode ? "#DDD" : "#555"} />
                </TouchableOpacity>

                {transactionSortDropdownVisible && (
                  <View style={styles.sortDropdownWrapper} pointerEvents="box-none">
                    <TouchableOpacity
                      style={styles.overlay}
                      activeOpacity={1}
                      onPress={() => setTransactionSortDropdownVisible(false)}
                      pointerEvents="box-only"
                    />
                    <View style={[styles.dropdown, isDarkMode && { backgroundColor: "#2A2A2A", borderColor: "#444" }]}>
                      {transactionSortOptions.map((option) => (
                        <TouchableOpacity
                          key={option.key}
                          style={[
                            styles.dropdownItem,
                            sortBy === option.sortBy && sortOrder === option.direction && styles.selectedDropdownItem,
                            isDarkMode && { borderBottomColor: "#444" },
                            sortBy === option.sortBy &&
                              sortOrder === option.direction &&
                              isDarkMode && { backgroundColor: "#3a3a3a" },
                          ]}
                          onPress={() => handleTransactionSortOptionChange(option)}
                        >
                          <Text
                            style={[
                              styles.dropdownText,
                              sortBy === option.sortBy && sortOrder === option.direction && styles.selectedDropdownText,
                              isDarkMode && { color: "#DDD" },
                            ]}
                          >
                            {option.label}
                          </Text>
                          {sortBy === option.sortBy && sortOrder === option.direction && (
                            <MaterialIcons name="check" size={16} color="#3498db" />
                          )}
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}
              </View>
            </View>
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
              <Animated.FlatList
                ref={transactionListRef}
                data={sortedTransactions}
                keyExtractor={(item) => item?.id || `transaction-${Math.random().toString(36).substring(2, 15)}`}
                renderItem={({ item }) => (
                  <TransactionCard
                    transaction={item}
                    category={categorizeTransaction(item, item.pending)}
                    isPending={item.pending === true}
                    onPress={() => handleTransactionPress(item)}
                  />
                )}
                contentContainerStyle={styles.transactionListContent}
                nestedScrollEnabled={true}
                scrollEnabled={flatListScrollEnabled}
                initialNumToRender={10}
                maxToRenderPerBatch={10}
                windowSize={5}
                removeClippedSubviews={true}
                onEndReached={handleLoadMore}
                onEndReachedThreshold={0.5}
                updateCellsBatchingPeriod={50}
                showsVerticalScrollIndicator={false}
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
              {scrollPosition > SCROLL_THRESHOLD && (
                <TouchableOpacity style={styles.scrollToTopButton} onPress={scrollToTop}>
                  <MaterialIcons name="arrow-upward" size={24} color="#FFF" />
                </TouchableOpacity>
              )}
              {scrollPosition < 1000 && ( // Simple condition instead of contentHeight comparison
                <TouchableOpacity style={styles.scrollToBottomButton} onPress={scrollToBottom}>
                  <MaterialIcons name="arrow-downward" size={24} color="#FFF" />
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>

        {/* Bottom padding */}
        <View style={{ height: 20 }} />
      </ScrollView>

      {/* Overlay to close dropdown when clicking outside */}
      {transactionSortDropdownVisible && (
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={() => setTransactionSortDropdownVisible(false)}
        />
      )}

      {/* Transaction Detail Modal */}
      <TransactionDetailModal
        visible={transactionDetailVisible}
        transaction={selectedTransaction}
        onClose={handleTransactionDetailClose}
      />
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
    marginVertical: 10,
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start", // Changed to start from left
  },
  searchInputContainer: {
    flex: 1,
    overflow: "visible",
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
    height: 50,
  },
  searchButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
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
  transactionBoxContainer: {
    marginTop: 16,
    marginBottom: 8,
  },
  transactionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  transactionHeaderLeft: {
    flex: 1,
  },
  transactionHeaderRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
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
    backgroundColor: "#fff",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#eee",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  exportButtonText: {
    fontSize: 12,
    color: "#3498db",
    marginLeft: 4,
    fontWeight: "600",
  },
  sortContainer: {
    position: "relative",
    zIndex: 5000,
  },
  sortButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#eee",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  dropdown: {
    position: "absolute",
    top: 50,
    right: 0,
    backgroundColor: "white",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#eee",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 25, // Lower than FinancialSummary
    minWidth: 200,
    zIndex: 5001, // Lower than FinancialSummary
  },
  dropdownItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  selectedDropdownItem: {
    backgroundColor: "#f0f7ff",
  },
  dropdownText: {
    fontSize: 14,
    color: "#333",
    flex: 1,
  },
  selectedDropdownText: {
    fontWeight: "600",
    color: "#3498db",
  },
  transactionBox: {
    height: screenHeight * 0.75,
    backgroundColor: "#fff",
    borderRadius: 12,
    overflow: "visible",
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
  refreshButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#f0f0f0",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  lastRefreshContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
    marginBottom: 8,
  },
  lastRefreshText: {
    fontSize: 12,
    color: "#666",
    fontStyle: "italic",
  },
  transactionCountText: {
    fontSize: 12,
    color: "#666",
    fontStyle: "italic",
  },
  connectionPrompt: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 24,
    marginTop: 32,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: "#eee",
  },
  connectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 12,
  },
  connectionText: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 24,
  },
  connectionButton: {
    backgroundColor: "#3498db",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  connectionButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  sortDropdownWrapper: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999,
    justifyContent: "flex-start",
    alignItems: "flex-end",
    paddingTop: 120, // adjust based on header height
    paddingRight: 16,
  },
  overlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "transparent",
    zIndex: 8999, // Make sure this is lower than dropdown's z-index
  },
})

export default TransactionsScreen
