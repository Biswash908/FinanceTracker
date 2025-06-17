"use client"

import { useState, useEffect, useCallback } from "react"
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native"
import { useTheme } from "../context/ThemeContext"
import { useFocusEffect } from "@react-navigation/native"
import { MaterialIcons } from "@expo/vector-icons"

// Components
import BalanceCard from "../components/BalanceCard"
import LeanWebView from "../components/LeanWebView"
import DateRangePicker from "../components/DateRangePicker"
import AccountSelector from "../components/AccountSelector"
import TrendChart from "../components/TrendChart"
import IncomeExpenseChart from "../components/IncomeExpenseChart"
import CombinedCategoryChart from "../components/CombinedCategoryChart"

// Services and Utils
import {
  fetchAccounts,
  clearTransactionsCache,
  fetchTransactionsMultiAccount,
  fetchAccountBalances,
} from "../services/lean-api"
import { calculateFinancials } from "../utils/categorizer"
import { leanEntityService } from "../services/lean-entity-service"
import { getCategoryColor, formatCategoryName } from "../utils/categorizer"

// Context
import { useFilters } from "../context/FilterContext"

const DashboardScreen = () => {
  const { isDarkMode } = useTheme()

  // Use shared filter context
  const { startDate, endDate, handleDateRangeChange, selectedAccounts, handleAccountsChange, accounts, setAccounts } =
    useFilters()

  // State
  const [transactions, setTransactions] = useState([])
  const [recentTransactions, setRecentTransactions] = useState([])
  const [loading, setLoading] = useState(true)
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
      console.log("Checking bank connection...")
      const storedEntityId = await leanEntityService.getEntityId()

      if (storedEntityId) {
        console.log("Found entity ID:", storedEntityId)
        setEntityId(storedEntityId)
        setError(null)

        // Load accounts
        await loadAccounts(storedEntityId)
      } else {
        console.log("No entity ID found")
        setEntityId(null)
        setAccounts([])
        setError("No bank account connected. Please connect your bank account in Settings.")
      }
    } catch (err) {
      console.error("Error checking bank connection:", err)
      setError("Error checking bank connection status.")
    }
  }

  // Load accounts function
  const loadAccounts = async (currentEntityId?: string) => {
    try {
      const entityIdToUse = currentEntityId || entityId
      if (!entityIdToUse) {
        setError("No entity ID available. Please connect your bank account.")
        return
      }

      console.log("Loading accounts...")
      const accountsData = await fetchAccounts()

      console.log(`Loaded ${accountsData.length} accounts`)
      setAccounts(accountsData)

      // If no accounts are selected and we have accounts, select the first one
      if (selectedAccounts.length === 0 && accountsData.length > 0) {
        const firstAccountId = accountsData[0].id
        console.log("No selected accounts, selecting first account ID:", firstAccountId)
        await handleAccountsChange([firstAccountId])
      }
    } catch (err) {
      console.error("Error loading accounts:", err)
      setError(`Failed to load accounts: ${err.message}`)
    }
  }

  // Periodically check bank connection only if no entityId is found
  useEffect(() => {
    if (entityId) return

    const interval = setInterval(() => {
      checkBankConnection()
    }, 3000)

    return () => clearInterval(interval)
  }, [entityId])

  // Load account balances function
  const loadAccountBalances = async () => {
    try {
      setBalanceLoading(true)
      console.log("Loading account balances...")

      const { balances, totalBalance } = await fetchAccountBalances()
      console.log(`Loaded total balance: ${totalBalance}`)
      setAccountBalance(totalBalance)
    } catch (err) {
      console.error("Error loading account balances:", err)
      // Don't set error for balance loading, just log it
    } finally {
      setBalanceLoading(false)
    }
  }

  // Fetch transactions when entity ID, selected accounts, or date range changes
  useEffect(() => {
    if (!entityId || selectedAccounts.length === 0) {
      console.log("Waiting for entity ID and selected accounts...", { entityId, selectedAccounts })
      setLoading(false)
      return
    }

    const loadData = async () => {
      try {
        setLoading(true)
        setError(null)

        // Load account balances
        await loadAccountBalances()

        console.log(`Loading transactions from ${startDate} to ${endDate} for ${selectedAccounts.length} accounts`)

        // Clear cache to ensure fresh data
        await clearTransactionsCache()

        // Fetch transactions for selected accounts
        const data = await fetchTransactionsMultiAccount(selectedAccounts, startDate, endDate)
        console.log(`Received ${data.transactions?.length || 0} transactions`)
        setTransactions(data.transactions || [])

        // Also fetch recent transactions (today and yesterday) for the "Recent Transactions" section
        const today = new Date()
        const yesterday = new Date(today)
        yesterday.setDate(yesterday.getDate() - 1)

        const recentStartDate = yesterday.toISOString().split("T")[0]
        const recentEndDate = today.toISOString().split("T")[0]

        console.log(`Loading recent transactions from ${recentStartDate} to ${recentEndDate}`)
        const recentData = await fetchTransactionsMultiAccount(selectedAccounts, recentStartDate, recentEndDate)
        console.log(`Received ${recentData.transactions?.length || 0} recent transactions`)
        setRecentTransactions(recentData.transactions || [])
      } catch (err) {
        console.error("Error loading data:", err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [entityId, selectedAccounts, startDate, endDate, lastRefresh])

  // Calculate financial summary
  const financialSummary = calculateFinancials(transactions || [])
  const { income, expenses, balance, inflowCategories, expenseCategories } = financialSummary

  // Calculate total balance from income and expenses if account balance is 0
  const displayBalance = accountBalance !== 0 ? accountBalance : balance

  // Handle refresh
  const handleRefresh = async () => {
    console.log("Manual refresh triggered")

    // Clear cache first
    await clearTransactionsCache()

    // Force re-check of bank connection
    await checkBankConnection()

    // Trigger data reload
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
      // Reload the dashboard data
      await checkBankConnection()
      setLastRefresh(Date.now())
    }
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
    .sort((a, b) => b.amount - a.amount)

  // Add this function before the return statement
  const generateTrendData = () => {
    if (!transactions || transactions.length === 0) return []

    // Group transactions by date and calculate running balance
    const dateMap = new Map()
    let runningBalance = 0

    // Sort transactions by date
    const sortedTransactions = [...transactions].sort(
      (a, b) => new Date(a.timestamp || a.date).getTime() - new Date(b.timestamp || b.date).getTime(),
    )

    sortedTransactions.forEach((transaction) => {
      const date = new Date(transaction.timestamp || transaction.date).toISOString().split("T")[0]
      const amount = Number.parseFloat(transaction.amount || 0)

      if (!dateMap.has(date)) {
        dateMap.set(date, { date, amount: 0, balance: runningBalance })
      }

      const dayData = dateMap.get(date)
      dayData.amount += amount
      runningBalance += amount
      dayData.balance = runningBalance
    })

    return Array.from(dateMap.values())
  }

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

        {/* Lean WebView Modal */}
        {showLeanWebView && <LeanWebView onClose={handleLeanWebViewClose} />}
      </ScrollView>
    )
  }

  return (
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

      {/* Account Selector */}
      <AccountSelector
        accounts={accounts}
        selectedAccounts={selectedAccounts}
        onAccountsChange={handleAccountsChange}
      />

      {/* Date Range Picker */}
      <DateRangePicker startDate={startDate} endDate={endDate} onDateRangeChange={handleDateRangeChange} />

      {/* Add spacing */}
      <View style={{ height: 24 }} />

      {/* Balance Cards */}
      <View style={styles.balanceCardsContainer}>
        <BalanceCard
          title="Total Balance"
          amount={displayBalance}
          type={displayBalance >= 0 ? "positive" : "negative"}
          isDarkMode={isDarkMode}
          loading={balanceLoading}
        />

        <View style={styles.incomeExpenseRow}>
          <BalanceCard
            title="Income"
            amount={income}
            type="income"
            style={{ flex: 1, marginRight: 8 }}
            isDarkMode={isDarkMode}
          />

          <BalanceCard
            title="Expenses"
            amount={expenses}
            type="expense"
            style={{ flex: 1, marginLeft: 8 }}
            isDarkMode={isDarkMode}
          />
        </View>
      </View>

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
        <View style={[styles.chartSection, isDarkMode && { backgroundColor: "#1E1E1E", borderColor: "#333" }]}>
          <Text style={[styles.sectionTitle, isDarkMode && { color: "#FFF" }]}>Balance Trend</Text>
          <TrendChart transactions={transactions} isDarkMode={isDarkMode} />
        </View>
      ) : (
        /* Charts View */
        <>
          {/* Income vs Expenses Chart - Show first */}
          <View style={[styles.chartSection, isDarkMode && { backgroundColor: "#1E1E1E", borderColor: "#333" }]}>
            <Text style={[styles.sectionTitle, isDarkMode && { color: "#FFF" }]}>Income vs Expenses</Text>
            <IncomeExpenseChart income={income} expenses={expenses} isDarkMode={isDarkMode} />
          </View>

          {/* Combined Category Chart - Show second */}
          <View style={[styles.chartSection, isDarkMode && { backgroundColor: "#1E1E1E", borderColor: "#333" }]}>
            <Text style={[styles.sectionTitle, isDarkMode && { color: "#FFF" }]}>Category Breakdown</Text>
            <CombinedCategoryChart
              inflowData={incomeCategoryData}
              expenseData={expenseCategoryData}
              isDarkMode={isDarkMode}
            />
          </View>
        </>
      )}

      {/* Lean WebView Modal */}
      {showLeanWebView && <LeanWebView onClose={handleLeanWebViewClose} />}
    </ScrollView>
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
  balanceCardsContainer: {
    marginBottom: 24,
  },
  incomeExpenseRow: {
    flexDirection: "row",
    marginTop: 16,
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
  trendContainer: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 32,
    marginBottom: 24,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: "#eee",
  },
  trendText: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
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
})

export default DashboardScreen
