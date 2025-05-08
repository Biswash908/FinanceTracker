"use client"

import { useState, useEffect } from "react"
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from "react-native"
import { ACCOUNT_ID, ENTITY_ID } from "@env"
import { useTheme } from "../context/ThemeContext"

// Components
import BalanceCard from "../components/BalanceCard"
import CategoryChart from "../components/CategoryChart"

// Services and Utils
import { fetchTransactions } from "../services/lean-api"
import { calculateFinancials } from "../utils/categorizer"
import { formatCurrency } from "../utils/formatters"

const DashboardScreen = () => {
  const { isDarkMode } = useTheme()

  // State
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [timeRange, setTimeRange] = useState("month") // "week" or "month"

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

  // Fetch transactions when component mounts or time range changes
  useEffect(() => {
    const loadTransactions = async () => {
      try {
        setLoading(true)
        setError(null)

        const { startDate, endDate } = getDateRange()
        const data = await fetchTransactions(ENTITY_ID, ACCOUNT_ID, startDate, endDate)
        setTransactions(data)
      } catch (err) {
        console.error("Error loading transactions:", err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    loadTransactions()
  }, [timeRange])

  // Calculate financial summary
  const { income, expenses, balance, categoryTotals } = calculateFinancials(transactions || [])

  // Toggle time range
  const toggleTimeRange = () => {
    setTimeRange(timeRange === "month" ? "week" : "month")
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

  return (
    <ScrollView style={[styles.container, isDarkMode && { backgroundColor: "#121212" }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, isDarkMode && { color: "#FFF" }]}>Dashboard</Text>
        <TouchableOpacity
          style={[styles.refreshButton, isDarkMode && { backgroundColor: "#2C5282" }]}
          onPress={() => {
            setTimeRange(timeRange) // Trigger a refresh
          }}
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
                        {formatCurrency(category.amount, "NPR")}
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
})

export default DashboardScreen
