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
  FlatList,
  RefreshControl,
  LogBox,
  Alert,
} from "react-native"
import { ENTITY_ID } from "@env"
import { MaterialIcons } from "@expo/vector-icons"

// Components
import TransactionCard from "../components/TransactionCard"
import DateRangePicker from "../components/DateRangePicker"
import FinancialSummary from "../components/FinancialSummary"
import AccountSelector from "../components/AccountSelector"
import TransactionFilters from "../components/TransactionFilters"

// Services and Utils
import { fetchTransactions, fetchTransactionsMultiAccount, fetchAccounts, clearAllCache } from "../services/lean-api"
import { categorizeTransaction, calculateFinancials } from "../utils/categorizer"
import { StorageService } from "../services/storage-service"
import { exportTransactionsToExcel } from "../utils/excel-export"
import { useTheme } from "../context/ThemeContext"
import React from "react"

// Import the date utility functions
import { getFirstDayOfMonth, getCurrentDate } from "../utils/date-utils"

// Suppress the warning about nested scrollviews
LogBox.ignoreLogs(["VirtualizedLists should never be nested"])

const screenHeight = Dimensions.get("window").height
const screenWidth = Dimensions.get("window").width

// Constants
const TRANSACTIONS_PER_PAGE = 50

// Helper functions for date handling
// const getCurrentDate = () => {
//   const now = new Date()
//   return now.toISOString().split("T")[0]
// }

// const getFirstDayOfMonth = () => {
//   const now = new Date()
//   return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0]
// }

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
  const [selectedCategory, setSelectedCategory] = useState("All")
  const [selectedType, setSelectedType] = useState("All")
  const [sortBy, setSortBy] = useState<"date" | "amount" | "category">("date")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")
  const [currentPage, setCurrentPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [totalCount, setTotalCount] = useState(0)
  const [isCacheClearing, setIsCacheClearing] = useState(false)
  const [isExporting, setIsExporting] = useState(false)

  // Refs
  const mainScrollViewRef = useRef(null)
  const transactionListRef = useRef(null)

  // Filter transactions based on search query, category, type, and account
  const filteredTransactions = useMemo(() => {
    return Array.isArray(transactions)
      ? transactions.filter((transaction) => {
          // Skip invalid transactions
          if (!transaction || !transaction.description) return false

          // Filter by search query
          const matchesQuery =
            searchQuery === "" ||
            transaction.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (transaction.amount && transaction.amount.toString().includes(searchQuery)) ||
            (transaction.account_name && transaction.account_name.toLowerCase().includes(searchQuery.toLowerCase()))

          // Filter by category
          const amount = transaction.amount ? Number.parseFloat(transaction.amount) : 0
          const isIncome = amount > 0
          const category = isIncome ? "income" : categorizeTransaction(transaction.description)
          const matchesCategory =
            selectedCategory === "All" || category.toLowerCase() === selectedCategory.toLowerCase()

          // Filter by transaction type
          const matchesType =
            selectedType === "All" ||
            (selectedType === "Income" && isIncome) ||
            (selectedType === "Expense" && !isIncome)

          return matchesQuery && matchesCategory && matchesType
        })
      : []
  }, [transactions, searchQuery, selectedCategory, selectedType])

  // Sort the filtered transactions
  const sortedTransactions = useMemo(() => {
    if (!filteredTransactions.length) return []

    return [...filteredTransactions].sort((a, b) => {
      const getVal = (tx: any) => {
        if (sortBy === "date") return new Date(tx.timestamp || tx.date || 0).getTime()
        if (sortBy === "amount") return Math.abs(Number(tx.amount || 0))
        if (sortBy === "category") {
          const amount = Number(tx.amount || 0)
          return amount > 0 ? "income" : categorizeTransaction(tx.description || "").toLowerCase()
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

  // Load transactions when accounts, dates, or page changes
  useEffect(() => {
    if (selectedAccounts.length > 0) {
      console.log(`Date range changed: ${startDate} to ${endDate}, reloading transactions...`)
      loadTransactions(true)
    }
  }, [selectedAccounts, startDate, endDate])

  // Handle date range change
  const handleDateRangeChange = useCallback((newStartDate, newEndDate) => {
    console.log(`Date range changed: ${newStartDate} to ${newEndDate}`)

    // Ensure we're working with string dates in YYYY-MM-DD format
    const formattedStartDate =
      typeof newStartDate === "string" ? newStartDate : newStartDate.toISOString().split("T")[0]
    const formattedEndDate = typeof newEndDate === "string" ? newEndDate : newEndDate.toISOString().split("T")[0]

    setStartDate(formattedStartDate)
    setEndDate(formattedEndDate)
  }, [])

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

  // Load transactions function
  const loadTransactions = async (reset = false) => {
    try {
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
      }

      setError(null)
      const page = reset ? 1 : currentPage

      console.log(`Loading transactions for ${selectedAccounts.length} accounts: page ${page}`)
      console.log(`Date range: ${startDate} to ${endDate}`)

      let result
      if (selectedAccounts.length === 1) {
        // Use single account fetch if only one account is selected
        result = await fetchTransactions(
          ENTITY_ID,
          selectedAccounts[0],
          startDate,
          endDate,
          page,
          TRANSACTIONS_PER_PAGE,
        )
      } else {
        // Use multi-account fetch if multiple accounts are selected
        result = await fetchTransactionsMultiAccount(
          ENTITY_ID,
          selectedAccounts,
          startDate,
          endDate,
          page,
          TRANSACTIONS_PER_PAGE,
        )
      }

      // Ensure transactions is always an array
      const newTransactions = result.transactions || []
      console.log(`Received ${newTransactions.length} transactions`)

      // Add account information to each transaction
      const enhancedTransactions = newTransactions.map((transaction) => {
        const account = accounts.find((acc) => acc.id === transaction.account_id)
        return {
          ...transaction,
          account_name: account ? account.name : "Unknown Account",
          account_type: account ? account.type : "Unknown",
          // Ensure each transaction has a truly unique ID
          id:
            transaction.id ||
            `${transaction.account_id}-${transaction.transaction_id || ""}-${Math.random().toString(36).substring(2, 10)}`,
        }
      })

      // Update state with new data
      if (reset) {
        setTransactions(enhancedTransactions)
      } else {
        // Ensure no duplicate transactions when appending
        const existingIds = new Set(transactions.map((t) => t.id))
        const uniqueNewTransactions = enhancedTransactions.filter((t) => !existingIds.has(t.id))

        console.log(`Adding ${uniqueNewTransactions.length} unique new transactions to existing ${transactions.length}`)

        setTransactions((prev) => [...prev, ...uniqueNewTransactions])
      }

      setTotalCount(result.totalCount)

      // Only set hasMore to false if we received fewer transactions than requested
      const hasMoreData = newTransactions.length >= TRANSACTIONS_PER_PAGE
      console.log(
        `Has more data: ${hasMoreData ? "Yes" : "No"} (received ${newTransactions.length} of ${TRANSACTIONS_PER_PAGE})`,
      )
      setHasMore(hasMoreData)

      // If we loaded data and there's more, increment the page
      if (hasMoreData) {
        const nextPage = page + 1
        console.log(`Setting next page to: ${nextPage}`)
        setCurrentPage(nextPage)
      }
    } catch (err) {
      console.error("Error loading transactions:", err)
      setError(err.message)
    } finally {
      setLoading(false)
      setRefreshing(false)
      setLoadingMore(false)
    }
  }

  // Handle pull-to-refresh
  const onRefresh = useCallback(() => {
    setRefreshing(true)
    loadTransactions(true)
  }, [selectedAccounts, startDate, endDate])

  // Handle load more
  const handleLoadMore = useCallback(() => {
    if (!loadingMore && hasMore) {
      console.log("Loading more transactions...")
      setLoadingMore(true)
      loadTransactions(false)
    } else {
      console.log(`Not loading more: loadingMore=${loadingMore}, hasMore=${hasMore}`)
    }
  }, [loadingMore, hasMore, currentPage, selectedAccounts, startDate, endDate])

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
    if (!item || !item.description) {
      console.warn("Invalid transaction item:", item)
      return null
    }

    const amount = item.amount ? Number.parseFloat(item.amount) : 0
    const category = amount > 0 ? "income" : categorizeTransaction(item.description)

    return (
      <MemoizedTransactionCard
        transaction={item}
        category={category}
        onPress={() => console.log("Transaction pressed:", item.id)}
      />
    )
  }, [])

  return (
    <SafeAreaView style={[styles.safeArea, isDarkMode && { backgroundColor: "#121212" }]}>
      <ScrollView
        ref={mainScrollViewRef}
        style={[styles.container, isDarkMode && { backgroundColor: "#121212" }]}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={true}
        nestedScrollEnabled={true}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#3498db"]} />}
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
        <View style={[styles.transactionBox, isDarkMode && { backgroundColor: "#2A2A2A", borderColor: "#444" }]}>
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
            <FlatList
              ref={transactionListRef}
              data={sortedTransactions}
              keyExtractor={(item) => item?.id || `transaction-${Math.random().toString(36).substring(2, 15)}`}
              renderItem={renderTransactionItem}
              contentContainerStyle={styles.transactionListContent}
              nestedScrollEnabled={true}
              initialNumToRender={10}
              maxToRenderPerBatch={10}
              windowSize={5}
              removeClippedSubviews={true}
              onEndReached={handleLoadMore}
              onEndReachedThreshold={0.5}
              updateCellsBatchingPeriod={50}
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
                ) : hasMore ? (
                  <TouchableOpacity
                    style={[styles.loadMoreButton, isDarkMode && { backgroundColor: "#2C5282" }]}
                    onPress={handleLoadMore}
                  >
                    <Text style={styles.loadMoreButtonText}>Load More Transactions</Text>
                  </TouchableOpacity>
                ) : (
                  <Text style={[styles.endOfListText, isDarkMode && { color: "#AAA" }]}>End of transactions</Text>
                )
              }
            />
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
    height: screenHeight * 0.45, // Increased from 0.4 to 0.45
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
})

export default TransactionsScreen
