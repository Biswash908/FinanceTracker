"use client"

import { useState, useEffect, useCallback } from "react"
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from "react-native"
import { ACCOUNT_ID, ENTITY_ID } from "@env"
import { useTheme } from "../context/ThemeContext"
import { useFocusEffect } from "@react-navigation/native"

// Components
import BalanceCard from "../components/BalanceCard"
import CategoryChart from "../components/CategoryChart"

// Services and Utils
import { fetchTransactions, fetchAccounts, clearTransactionsCache } from "../services/lean-api"
import { calculateFinancials } from "../utils/categorizer"
import { formatCurrency } from "../utils/formatters"
import { leanEntityService } from "../services/lean-entity-service"

const DashboardScreen = () => {
  const { isDarkMode } = useTheme()

  // State
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [timeRange, setTimeRange] = useState("month") // "week" or "month"
  const [entityId, setEntityId] = useState<string | null>(null)
  const [accountId, setAccountId] = useState<string | null>(ACCOUNT_ID || null)
  const [lastRefresh, setLastRefresh] = useState(Date.now())

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

        // If we don't have a hardcoded account ID, fetch accounts to get one
        if (!ACCOUNT_ID) {
          try {
            console.log("Fetching accounts to get account ID...")
            const accounts = await fetchAccounts()
            if (accounts && accounts.length > 0) {
              const firstAccountId = accounts[0].id
              console.log("Using first available account:", firstAccountId)
              setAccountId(firstAccountId)
            } else {
              setError("No accounts found. Please try reconnecting your bank account.")
            }
          } catch (accountError) {
            console.error("Error fetching accounts:", accountError)
            setError("Error fetching accounts. Please try reconnecting your bank account.")
          }
        } else {
          // Use hardcoded account ID
          setAccountId(ACCOUNT_ID)
        }
      } else {
        console.log("No entity ID found")
        setEntityId(null)
        setAccountId(ACCOUNT_ID || null)
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
  }, [])

  // Get date range based on selected time range
  const getDateRange = () => {
    const now = new Date()
    const endDate = now.toISOString().split("T")[0]

    let startDate
    if (timeRange === "week") {
      // Get first day of current week (Sunday)
      const day = now.getDay() // 0 = Sunday, 1 = Monday, etc.
      const diff = now.getDate() - day
      startDate = new Date(now.setDate(diff)).toISOString().split("T")[0]
    } else {
      // Get first day of current month
      startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0]
    }

    return { startDate, endDate }
  }

  // Fetch transactions when entity ID and account ID are available, or time range changes
  useEffect(() => {
    if (!entityId || !accountId) {
      console.log("Waiting for entity ID and account ID...", { entityId, accountId })
      setLoading(false)
      return
    }

    const loadTransactions = async () => {
      try {
        setLoading(true)
        setError(null)

        const { startDate, endDate } = getDateRange()
        console.log(`Loading transactions for account ${accountId} from ${startDate} to ${endDate}`)

        // Clear cache to ensure fresh data
        await clearTransactionsCache()

        const data = await fetchTransactions(ENTITY_ID, accountId, startDate, endDate)
        console.log(`Received ${data.transactions?.length || 0} transactions`)
        setTransactions(data.transactions || [])
      } catch (err) {
        console.error("Error loading transactions:", err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    loadTransactions()
  }, [entityId, accountId, timeRange, lastRefresh])

  // Calculate financial summary
  const { income, expenses, balance, categoryTotals } = calculateFinancials(transactions || [])

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

  // Format category data for chart
  const categoryData = Object.entries(categoryTotals)
    .filter(([_, amount]) => amount > 0)
    .map(([category, amount]) => ({
      name: category.charAt(0).toUpperCase() + category.slice(1),
      amount,
      color: getCategoryColor(category),
    }))
    .sort((a, b) => b.amount - a.amount)

  // Show connection prompt if no entity ID or account ID
  if ((!entityId || !accountId) && !loading) {
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
            To view your financial dashboard, please connect your bank account in the Settings tab.
          </Text>
          <TouchableOpacity
            style={[styles.connectionButton, isDarkMode && { backgroundColor: "#2C5282" }]}
            onPress={handleRefresh}
          >
            <Text style={styles.connectionButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    )
  }

  return (
    <ScrollView style={[styles.container, isDarkMode && { backgroundColor: "#121212" }]}>
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

      {/* Time Range Toggle */}
      <View style={[styles.timeRangeContainer, isDarkMode && { backgroundColor: "#333" }]}>
        <TouchableOpacity
          style={[
            styles.timeRangeButton,
            timeRange === "week" && (isDarkMode ? { backgroundColor: "#2A2A2A" } : styles.activeTimeRangeButton),
          ]}
          onPress={() => setTimeRange("week")}
        >
          <Text
            style={[
              styles.timeRangeText,
              isDarkMode && { color: "#AAA" },
              timeRange === "week" && (isDarkMode ? { color: "#FFF" } : styles.activeTimeRangeText),
            ]}
          >
            This Week
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.timeRangeButton,
            timeRange === "month" && (isDarkMode ? { backgroundColor: "#2A2A2A" } : styles.activeTimeRangeButton),
          ]}
          onPress={() => setTimeRange("month")}
        >
          <Text
            style={[
              styles.timeRangeText,
              isDarkMode && { color: "#AAA" },
              timeRange === "month" && (isDarkMode ? { color: "#FFF" } : styles.activeTimeRangeText),
            ]}
          >
            This Month
          </Text>
        </TouchableOpacity>
      </View>

      {/* Error message */}
      {error && (
        <View style={[styles.errorContainer, isDarkMode && { backgroundColor: "#3A1212" }]}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3498db" />
          <Text style={[styles.loadingText, isDarkMode && { color: "#AAA" }]}>Loading dashboard...</Text>
        </View>
      ) : (
        <>
          {/* Balance Cards */}
          <View style={styles.balanceCardsContainer}>
            <BalanceCard
              title="Balance"
              amount={balance}
              type={balance >= 0 ? "positive" : "negative"}
              isDarkMode={isDarkMode}
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

          {/* Category Breakdown */}
          <View style={[styles.categorySection, isDarkMode && { backgroundColor: "#1E1E1E", borderColor: "#333" }]}>
            <Text style={[styles.sectionTitle, isDarkMode && { color: "#FFF" }]}>Spending by Category</Text>

            {categoryData.length > 0 ? (
              <>
                <CategoryChart data={categoryData} isDarkMode={isDarkMode} />

                <View style={styles.categoryList}>
                  {categoryData.map((category) => (
                    <View
                      key={category.name}
                      style={[styles.categoryItem, isDarkMode && { borderBottomColor: "#333" }]}
                    >
                      <View style={styles.categoryNameContainer}>
                        <View style={[styles.categoryDot, { backgroundColor: category.color }]} />
                        <Text style={[styles.categoryName, isDarkMode && { color: "#DDD" }]}>{category.name}</Text>
                      </View>
                      <Text style={[styles.categoryAmount, { color: category.color }]}>
                        {formatCurrency(category.amount, "AED")}
                      </Text>
                    </View>
                  ))}
                </View>
              </>
            ) : (
              <View style={styles.emptyContainer}>
                <Text style={[styles.emptyText, isDarkMode && { color: "#AAA" }]}>
                  No spending data available for this period.
                </Text>
              </View>
            )}
          </View>
        </>
      )}
    </ScrollView>
  )
}

// Helper function to get category colors
const getCategoryColor = (category) => {
  const colors = {
    food: "#FF9800",
    shopping: "#9C27B0",
    entertainment: "#2196F3",
    utilities: "#607D8B",
    transport: "#4CAF50",
    education: "#3F51B5",
    health: "#F44336",
    charity: "#8BC34A",
    housing: "#795548",
    other: "#9E9E9E",
  }

  return colors[category] || colors.other
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
  timeRangeContainer: {
    flexDirection: "row",
    backgroundColor: "#e0e0e0",
    borderRadius: 25,
    marginBottom: 24,
    padding: 4,
  },
  timeRangeButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 21,
  },
  activeTimeRangeButton: {
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
    elevation: 2,
  },
  timeRangeText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#666",
  },
  activeTimeRangeText: {
    color: "#333",
  },
  balanceCardsContainer: {
    marginBottom: 24,
  },
  incomeExpenseRow: {
    flexDirection: "row",
    marginTop: 16,
  },
  categorySection: {
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
  categoryList: {
    marginTop: 16,
  },
  categoryItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  categoryNameContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  categoryDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  categoryName: {
    fontSize: 15,
    color: "#333",
  },
  categoryAmount: {
    fontSize: 15,
    fontWeight: "500",
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
