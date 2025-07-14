"use client"

import { useState, useEffect, useCallback } from "react"
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from "react-native"
import { useTheme } from "../context/ThemeContext"
import { useFocusEffect } from "@react-navigation/native"
import { MaterialIcons } from "@expo/vector-icons"

// Components
import LeanWebView from "../components/LeanWebView"
import DateRangePicker from "../components/DateRangePicker"
import AccountSelector from "../components/AccountSelector"
import TrendChart from "../components/TrendChart"
import IncomeExpenseChart from "../components/IncomeExpenseChart"
import CombinedCategoryChart from "../components/CombinedCategoryChart"
import { ErrorBoundary } from "../components/ErrorBoundary"

import BalanceCard from "../components/BalanceCard" // This is now your Financial Overview Card
// Services and Utils
import { fetchAccounts, clearTransactionsCache, fetchAccountBalances, fetchTransactions } from "../services/lean-api"
import { calculateFinancials } from "../utils/categorizer"
import { leanEntityService } from "../services/lean-entity-service"
import { getCategoryColor, formatCategoryName } from "../utils/categorizer"

// Context
import { useFilters } from "../context/FilterContext"

const DashboardScreen = () => {
  const { isDarkMode } = useTheme()

  // Use shared filter context
  const {
    startDate,
    endDate,
    handleDateRangeChange,
    selectedAccounts,
    handleAccountsChange,
    accounts,
    setAccounts,
    isInitialized,
    hasSavedSelection,
  } = useFilters()

  // State
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [accountsLoading, setAccountsLoading] = useState(true) // Add accounts loading state
  const [chartsLoading, setChartsLoading] = useState(false) // Add charts loading state
  const [error, setError] = useState(null)
  const [entityId, setEntityId] = useState<string | null>(null)
  const [lastRefresh, setLastRefresh] = useState(Date.now())
  const [showLeanWebView, setShowLeanWebView] = useState(false)
  const [viewMode, setViewMode] = useState<"trend" | "charts">("trend")
  const [accountBalance, setAccountBalance] = useState(0)
  const [balanceLoading, setBalanceLoading] = useState(false)

  // Check for bank connection when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      checkBankConnection()
    }, []),
  )

  const checkBankConnection = async () => {
    try {
      console.log("DashboardScreen: Checking bank connection...")
      const storedEntityId = await leanEntityService.getEntityId()

      if (storedEntityId) {
        console.log("DashboardScreen: Found entity ID:", storedEntityId)
        setEntityId(storedEntityId)
        setError(null)
        await loadAccounts(storedEntityId)
      } else {
        console.log("DashboardScreen: No entity ID found")
        setEntityId(null)
        setAccounts([]) // Clear accounts if no entity ID
        setAccountsLoading(false) // Stop accounts loading
        setError("No bank account connected. Please connect your bank account in Settings.")
      }
    } catch (err) {
      console.error("DashboardScreen: Error checking bank connection:", err)
      setAccountsLoading(false) // Stop accounts loading on error
      setError("Error checking bank connection status.")
    }
  }

  // Load accounts function - FilterContext handles auto-selection
  const loadAccounts = async (currentEntityId?: string) => {
    try {
      setAccountsLoading(true) // Start accounts loading
      const entityIdToUse = currentEntityId || entityId
      if (!entityIdToUse) {
        setError("No entity ID available. Please connect your bank account.")
        setAccountsLoading(false)
        return
      }

      console.log("DashboardScreen: Loading accounts...")
      const accountsData = await fetchAccounts()

      console.log(`DashboardScreen: Loaded ${accountsData.length} accounts`)
      console.log(
        "DashboardScreen: Account IDs:",
        accountsData.map((acc) => acc.id),
      )
      setAccounts(accountsData) // Use setAccounts from useFilters
      console.log("DashboardScreen: Accounts loaded, FilterContext will handle selection validation")
    } catch (err) {
      console.error("DashboardScreen: Error loading accounts:", err)
      setError(`Failed to load accounts: ${err.message}`)
    } finally {
      setAccountsLoading(false) // Stop accounts loading
    }
  }

  // Load account balances function
  const loadAccountBalances = async () => {
    try {
      setBalanceLoading(true)
      console.log("DashboardScreen: Loading account balances...")

      const { balances, totalBalance } = await fetchAccountBalances()
      console.log(`DashboardScreen: Loaded total balance: ${totalBalance}`)
      setAccountBalance(totalBalance)
    } catch (err) {
      console.error("DashboardScreen: Error loading account balances:", err)
    } finally {
      setBalanceLoading(false)
    }
  }

  // Enhanced data loading with proper account validation
  useEffect(() => {
    if (!entityId || !isInitialized) {
      console.log("DashboardScreen: Waiting for entity ID and FilterContext initialization...", {
        entityId,
        isInitialized,
      })
      setLoading(false)
      return
    }

    if (selectedAccounts.length === 0) {
      console.log("DashboardScreen: No accounts selected, waiting for account selection...")
      setLoading(false)
      return
    }

    // Validate that selected accounts exist in available accounts
    const validSelectedAccounts = selectedAccounts.filter((accountId) =>
      accounts.some((account) => account.id === accountId),
    )

    if (validSelectedAccounts.length === 0) {
      console.log("DashboardScreen: No valid accounts in selection, waiting for valid selection...")
      setLoading(false)
      return
    }

    if (validSelectedAccounts.length !== selectedAccounts.length) {
      console.log("DashboardScreen: Some selected accounts are invalid, using valid ones only:", validSelectedAccounts)
    }

    const loadData = async () => {
      try {
        setLoading(true)
        setChartsLoading(true) // Start charts loading when data changes
        setError(null)

        await loadAccountBalances()

        console.log(
          `DashboardScreen: Loading transactions from ${startDate} to ${endDate} for ${validSelectedAccounts.length} valid accounts`,
        )
        await clearTransactionsCache()

        // Enhanced transaction fetching - use only valid accounts
        const allTransactions = []
        const TRANSACTIONS_PER_PAGE = 100
        const MAX_PAGES_PER_ACCOUNT = 100

        for (const accountId of validSelectedAccounts) {
          // Double-check account exists
          const account = accounts.find((acc) => acc.id === accountId)
          if (!account) {
            console.error(`DashboardScreen: Account ${accountId} not found in available accounts, skipping`)
            continue
          }

          console.log(`DashboardScreen: Fetching all transactions for account ${accountId} (${account.name})`)
          let page = 1
          let hasMore = true
          let accountTransactions = 0

          while (hasMore && page <= MAX_PAGES_PER_ACCOUNT) {
            try {
              console.log(`DashboardScreen: Fetching page ${page} for account ${accountId}`)
              const result = await fetchTransactions(
                entityId,
                accountId,
                startDate,
                endDate,
                page,
                TRANSACTIONS_PER_PAGE,
              )

              const pageTransactions = result.transactions || []
              console.log(
                `DashboardScreen: Page ${page}: Received ${pageTransactions.length} transactions for account ${accountId}`,
              )

              if (pageTransactions.length > 0) {
                const enhancedTransactions = pageTransactions.map((transaction) => ({
                  ...transaction,
                  account_name: account.name,
                  account_type: account.type,
                  id:
                    transaction.id ||
                    `${transaction.account_id}-${transaction.transaction_id || ""}-${Math.random().toString(36).substring(2, 10)}`,
                }))

                allTransactions.push(...enhancedTransactions)
                accountTransactions += pageTransactions.length
              }

              hasMore = pageTransactions.length === TRANSACTIONS_PER_PAGE && result.hasMore !== false
              page++

              if (pageTransactions.length < TRANSACTIONS_PER_PAGE) {
                hasMore = false
              }
            } catch (error) {
              console.error(`DashboardScreen: Error fetching page ${page} for account ${accountId}:`, error)
              hasMore = false
            }
          }

          console.log(`DashboardScreen: Total transactions fetched for account ${accountId}: ${accountTransactions}`)
        }

        console.log(`DashboardScreen: Total transactions fetched across all valid accounts: ${allTransactions.length}`)
        setTransactions(allTransactions)
      } catch (err) {
        console.error("DashboardScreen: Error loading data:", err)
        setError(err.message)
      } finally {
        setLoading(false)
        setChartsLoading(false) // Stop charts loading
      }
    }

    loadData()
  }, [entityId, selectedAccounts, startDate, endDate, lastRefresh, isInitialized, accounts])

  // Calculate financial summary
  const financialSummary = calculateFinancials(transactions || [])
  const { income, expenses, balance, inflowCategories, expenseCategories } = financialSummary

  const displayBalance = accountBalance !== 0 ? accountBalance : balance

  // Handle refresh
  const handleRefresh = async () => {
    console.log("DashboardScreen: Manual refresh triggered")
    await clearTransactionsCache()
    await checkBankConnection()
    setLastRefresh(Date.now())
  }

  // Handle Connect Bank button
  const handleConnectBank = () => {
    setShowLeanWebView(true)
  }

  // Handle Lean WebView close
  const handleLeanWebViewClose = async (status: string, message?: string, entityId?: string) => {
    setShowLeanWebView(false)

    if (status === "SUCCESS") {
      await checkBankConnection()
      setLastRefresh(Date.now())
    }
  }

  // Handle date range change with loading
  const handleDateRangeChangeWithLoading = (newStartDate: string, newEndDate: string) => {
    setChartsLoading(true) // Start loading when date changes
    handleDateRangeChange(newStartDate, newEndDate)
  }

  // Prepare category data for charts
  const expenseCategoryData = Object.entries(expenseCategories || {})
    .filter(([_, amount]) => amount > 0)
    .map(([category, amount]) => ({
      name: formatCategoryName(category),
      amount,
      color: getCategoryColor(category),
      category,
    }))
    .sort((a, b) => b.amount - a.amount)

  const incomeCategoryData = Object.entries(inflowCategories || {})
    .filter(([_, amount]) => amount > 0)
    .map(([category, amount]) => ({
      name: formatCategoryName(category),
      amount,
      color: getCategoryColor(category),
      category,
    }))
    .sort((a, b) => a.amount - b.amount)

  // Show connection prompt if no entity ID or selected accounts
  if ((!entityId || selectedAccounts.length === 0) && !loading) {
    return (
      <ScrollView style={[styles.container, isDarkMode && { backgroundColor: "#121212" }]}>
        <View style={styles.header}>
          <Text style={[styles.title, isDarkMode && { color: "#FFF" }]}>Dashboard</Text>
          <TouchableOpacity
            style={[styles.refreshButton, isDarkMode && { backgroundColor: "#2C5282" }]}
            onPress={handleRefresh}
          >
            <Text style={styles.refreshButtonText}>Refresh</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.connectionPrompt, isDarkMode && { backgroundColor: "#1E1E1E", borderColor: "#333" }]}>
          <Text style={[styles.connectionTitle, isDarkMode && { color: "#FFF" }]}>Connect Your Bank Account</Text>
          <Text style={[styles.connectionText, isDarkMode && { color: "#AAA" }]}>
            To view your financial dashboard, please connect your bank account to get started.
          </Text>
          <TouchableOpacity
            style={[styles.connectionButton, isDarkMode && { backgroundColor: "#2C5282" }]}
            onPress={handleConnectBank}
          >
            <Text style={styles.connectionButtonText}>Connect Bank</Text>
          </TouchableOpacity>
        </View>

        {showLeanWebView && <LeanWebView onClose={handleLeanWebViewClose} />}
      </ScrollView>
    )
  }

  return (
    <ErrorBoundary>
      <ScrollView
        style={[styles.container, isDarkMode && { backgroundColor: "#121212" }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, isDarkMode && { color: "#FFF" }]}>Dashboard</Text>
          <TouchableOpacity
            style={[styles.refreshButton, isDarkMode && { backgroundColor: "#2C5282" }]}
            onPress={handleRefresh}
          >
            <Text style={styles.refreshButtonText}>Refresh</Text>
          </TouchableOpacity>
        </View>

        {/* Account Selector with Loading */}
        <ErrorBoundary>
          <AccountSelector
            accounts={accounts}
            selectedAccounts={selectedAccounts}
            onAccountsChange={handleAccountsChange}
            loading={accountsLoading} // Pass loading state
          />
        </ErrorBoundary>

        {/* Date Range Picker */}
        <ErrorBoundary>
          <DateRangePicker
            startDate={startDate}
            endDate={endDate}
            onDateRangeChange={handleDateRangeChangeWithLoading} // Use loading version
          />
        </ErrorBoundary>

        <View style={{ height: 24 }} />

        {/* Financial Overview Card (now BalanceCard) */}
        <ErrorBoundary>
          <BalanceCard income={income} expenses={expenses} balance={displayBalance} isDarkMode={isDarkMode} />
        </ErrorBoundary>

        {/* View Mode Toggle */}
        <View style={[styles.viewModeContainer, isDarkMode && { backgroundColor: "#333" }]}>
          <TouchableOpacity
            style={[
              styles.viewModeButton,
              viewMode === "trend" && (isDarkMode ? { backgroundColor: "#2A2A2A" } : styles.activeViewModeButton),
            ]}
            onPress={() => setViewMode("trend")}
          >
            <MaterialIcons
              name="trending-up"
              size={18}
              color={viewMode === "trend" ? (isDarkMode ? "#FFF" : "#333") : isDarkMode ? "#AAA" : "#666"}
            />
            <Text
              style={[
                styles.viewModeText,
                isDarkMode && { color: "#AAA" },
                viewMode === "trend" && (isDarkMode ? { color: "#FFF" } : styles.activeViewModeText),
              ]}
            >
              Trend
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.viewModeButton,
              viewMode === "charts" && (isDarkMode ? { backgroundColor: "#2A2A2A" } : styles.activeViewModeButton),
            ]}
            onPress={() => setViewMode("charts")}
          >
            <MaterialIcons
              name="bar-chart"
              size={18}
              color={viewMode === "charts" ? (isDarkMode ? "#FFF" : "#333") : isDarkMode ? "#AAA" : "#666"}
            />
            <Text
              style={[
                styles.viewModeText,
                isDarkMode && { color: "#AAA" },
                viewMode === "charts" && (isDarkMode ? { color: "#FFF" } : styles.activeViewModeText),
              ]}
            >
              Charts
            </Text>
          </TouchableOpacity>
        </View>

        {viewMode === "trend" ? (
          /* Trend View */
          <ErrorBoundary>
            <View style={[styles.chartSection, isDarkMode && { backgroundColor: "#1E1E1E", borderColor: "#333" }]}>
              <Text style={[styles.sectionTitle, isDarkMode && { color: "#FFF" }]}>Balance Trend</Text>
              <TrendChart
                selectedAccounts={selectedAccounts}
                startDate={startDate}
                endDate={endDate}
                isDarkMode={isDarkMode}
              />
            </View>
          </ErrorBoundary>
        ) : (
          /* Charts View with Loading States */
          <ErrorBoundary>
            <View style={[styles.chartSection, isDarkMode && { backgroundColor: "#1E1E1E", borderColor: "#333" }]}>
              <Text style={[styles.sectionTitle, isDarkMode && { color: "#FFF" }]}>Income vs Expenses</Text>
              <IncomeExpenseChart
                income={income}
                expenses={expenses}
                isDarkMode={isDarkMode}
                loading={chartsLoading} // Pass loading state
              />
            </View>

            <View style={[styles.chartSection, isDarkMode && { backgroundColor: "#1E1E1E", borderColor: "#333" }]}>
              <Text style={[styles.sectionTitle, isDarkMode && { color: "#FFF" }]}>Category Breakdown</Text>
              <CombinedCategoryChart
                inflowData={incomeCategoryData}
                expenseData={expenseCategoryData}
                isDarkMode={isDarkMode}
                loading={chartsLoading} // Pass loading state
              />
            </View>
          </ErrorBoundary>
        )}

        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#3498db" />
            <Text style={[styles.loadingText, isDarkMode && { color: "#AAA" }]}>Loading dashboard...</Text>
          </View>
        )}

        {showLeanWebView && <LeanWebView onClose={handleLeanWebViewClose} />}
      </ScrollView>
    </ErrorBoundary>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
    padding: 16,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 26,
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#333",
  },
  refreshButton: {
    backgroundColor: "#3498db",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  refreshButtonText: {
    color: "#fff",
    fontWeight: "500",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 16,
  },
  loadingContainer: {
    padding: 32,
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#666",
  },
  errorContainer: {
    padding: 16,
    backgroundColor: "#ffebee",
    borderRadius: 12,
    marginBottom: 16,
  },
  errorText: {
    color: "#c62828",
    fontSize: 15,
  },
  emptyContainer: {
    padding: 32,
    alignItems: "center",
  },
  emptyText: {
    textAlign: "center",
    fontSize: 16,
    color: "#666",
    lineHeight: 24,
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
  viewModeContainer: {
    flexDirection: "row",
    backgroundColor: "#e0e0e0",
    borderRadius: 25,
    marginBottom: 24,
    padding: 4,
  },
  viewModeButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 21,
    flexDirection: "row",
    justifyContent: "center",
  },
  activeViewModeButton: {
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
    elevation: 2,
  },
  viewModeText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#666",
    marginLeft: 6,
  },
  activeViewModeText: {
    color: "#333",
  },
  chartSection: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: "#eee",
  },
})

export default DashboardScreen
