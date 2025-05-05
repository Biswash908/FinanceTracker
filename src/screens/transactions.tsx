"use client"

import { useState, useEffect } from "react"
import { View, Text, FlatList, StyleSheet, TouchableOpacity, ActivityIndicator, Platform } from "react-native"
import { ACCOUNT_ID, ENTITY_ID } from "@env"
import DateTimePicker from "@react-native-community/datetimepicker"

// Correct import path for the auth service (note: singular 'service', not 'services')
import { authService } from "../services/auth-service"

// Simple date formatter
const formatDate = (dateString) => {
  const date = new Date(dateString)
  // Format as YYYY-MM-DD
  return date.toISOString().split("T")[0]
}

// Get current date and first day of current month
const getCurrentDate = () => {
  const now = new Date()
  return now.toISOString().split("T")[0]
}

const getFirstDayOfMonth = () => {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0]
}

const TransactionsScreen = () => {
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [startDate, setStartDate] = useState(getFirstDayOfMonth())
  const [endDate, setEndDate] = useState(getCurrentDate())
  const [showStartDatePicker, setShowStartDatePicker] = useState(false)
  const [showEndDatePicker, setShowEndDatePicker] = useState(false)
  const [summaryVisible, setSummaryVisible] = useState(true)

  // Add state for token testing UI
  const [showTokenTester, setShowTokenTester] = useState(false)
  const [token, setToken] = useState("")
  const [tokenLoading, setTokenLoading] = useState(false)
  const [tokenError, setTokenError] = useState(null)

  // Categories for expense classification
  const categories = {
    food: [
      "restaurant",
      "food",
      "grocery",
      "carrefour",
      "danube",
      "choithram",
      "sushi",
      "pizza",
      "mcdonalds",
      "starbucks",
      "coffee",
      "zomato",
      "subway",
      "noodle",
      "zuma",
      "zaatar",
    ],
    shopping: [
      "shop",
      "store",
      "market",
      "amazon",
      "amzn",
      "uniqlo",
      "zara",
      "nike",
      "body shop",
      "armour",
      "abercrombie",
      "purchase",
    ],
    entertainment: ["cinema", "movie", "netflix", "playstation", "nintendo", "game", "entertainment"],
    utilities: ["etisalat", "du", "utility", "utilities", "telecom", "mobile", "phone", "internet", "virgin"],
    transport: ["taxi", "uber", "careem", "transport", "transportation", "fuel", "gas", "petrol", "esso"],
    education: ["school", "university", "college", "education", "academy", "course", "prometric", "exam"],
    health: ["hospital", "clinic", "doctor", "medical", "pharmacy", "health", "healthcare", "insurance", "bupa"],
    charity: ["charity", "donation", "zakat", "give"],
    housing: ["rent", "housing", "accommodation", "property", "real estate"],
    other: [],
  }

  // Test auth function - FIXED
  const testAuth = async () => {
    setTokenLoading(true)
    setTokenError(null)
    try {
      const token = await authService.getToken()
      setToken(token.substring(0, 20) + "...")
      console.log("Token obtained successfully")
    } catch (err) {
      setTokenError(err.message)
      console.error("Auth error:", err)
    } finally {
      setTokenLoading(false)
    }
  }

  // FIXED: useEffect moved outside of testAuth function
  useEffect(() => {
    console.log("Date range changed - fetching transactions:", { startDate, endDate })
    fetchTransactions()
  }, [startDate, endDate])

  // Fetch transactions using the auth service
  // Fetch transactions using the auth service
  const fetchTransactions = async () => {
    try {
      setLoading(true)
      setError(null)

      console.log("Fetching transactions with:", {
        entity_id: ENTITY_ID,
        account_id: ACCOUNT_ID,
        from: startDate,
        to: endDate,
      })

      // Get a valid token from the auth service
      const token = await authService.getToken()

      // Use the correct endpoint without /list and without query parameters
      const response = await fetch("https://sandbox.leantech.me/data/v1/transactions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          Scope: "api",
        },
        body: JSON.stringify({
          entity_id: ENTITY_ID,
          account_id: ACCOUNT_ID,
          from_date: startDate, // Changed from 'from' to 'from_date'
          to_date: endDate, // Changed from 'to' to 'to_date'
        }),
      })

      // Log the response status for debugging
      console.log("Response status:", response.status)

      if (!response.ok) {
        // If we get a 401 Unauthorized, try refreshing the token once
        if (response.status === 401) {
          console.log("Token expired, refreshing...")
          const newToken = await authService.refreshToken()

          // Retry the request with the new token
          const retryResponse = await fetch("https://sandbox.leantech.me/data/v1/transactions", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${newToken}`,
              Scope: "api",
            },
            body: JSON.stringify({
              entity_id: ENTITY_ID,
              account_id: ACCOUNT_ID,
              from_date: startDate, // Changed from 'from' to 'from_date'
              to_date: endDate, // Changed from 'to' to 'to_date'
            }),
          })

          // Log retry response status
          console.log("Retry response status:", retryResponse.status)

          if (!retryResponse.ok) {
            // Get response text for better error details
            const errorText = await retryResponse.text()
            console.error("API Error response:", errorText)
            throw new Error(`API error: ${retryResponse.status} ${errorText}`)
          }

          const data = await retryResponse.json()
          if (data.payload && data.payload.transactions) {
            console.log(`Fetched ${data.payload.transactions.length} transactions`)
            setTransactions(data.payload.transactions)
          } else {
            console.error("API Error:", data)
            setError("Failed to fetch transactions: " + (data.message || "Unknown error"))
          }
          return
        }

        // Get response text for better error details
        const errorText = await response.text()
        console.error("API Error response:", errorText)
        throw new Error(`API error: ${response.status} ${errorText}`)
      }

      const data = await response.json()

      if (data.payload && data.payload.transactions) {
        console.log(`Fetched ${data.payload.transactions.length} transactions`)
        setTransactions(data.payload.transactions)
      } else {
        console.error("API Error:", data)
        setError("Failed to fetch transactions: " + (data.message || "Unknown error"))
      }
    } catch (err) {
      console.error("Fetch error:", err)
      setError("Error fetching transactions: " + err.message)
    } finally {
      setLoading(false)
    }
  }

  const onChangeStartDate = (event, selectedDate) => {
    setShowStartDatePicker(false)
    if (selectedDate) {
      // Format the date and log it for debugging
      const formattedDate = formatDate(selectedDate)
      console.log("Selected start date:", formattedDate)
      setStartDate(formattedDate)
    }
  }

  const onChangeEndDate = (event, selectedDate) => {
    setShowEndDatePicker(false)
    if (selectedDate) {
      // Format the date and log it for debugging
      const formattedDate = formatDate(selectedDate)
      console.log("Selected end date:", formattedDate)
      setEndDate(formattedDate)
    }
  }

  // Categorize a transaction based on its description
  const categorizeTransaction = (description) => {
    description = description.toLowerCase()

    for (const [category, keywords] of Object.entries(categories)) {
      for (const keyword of keywords) {
        if (description.includes(keyword.toLowerCase())) {
          return category
        }
      }
    }
    return "other"
  }

  // Calculate income, expenses, and category totals
  const calculateFinancials = () => {
    let income = 0
    let expenses = 0
    const categoryTotals = Object.keys(categories).reduce((acc, cat) => {
      acc[cat] = 0
      return acc
    }, {})

    transactions.forEach((transaction) => {
      const amount = Number.parseFloat(transaction.amount)

      // Income is positive, expenses are negative
      if (amount > 0) {
        income += amount
      } else if (amount < 0) {
        expenses += Math.abs(amount)

        // Categorize and add to category total
        const category = categorizeTransaction(transaction.description)
        categoryTotals[category] += Math.abs(amount)
      }
    })

    return { income, expenses, balance: income - expenses, categoryTotals }
  }

  const { income, expenses, balance, categoryTotals } = calculateFinancials()

  // Truncate long descriptions
  const truncateDescription = (description, maxLength = 40) => {
    return description.length > maxLength ? description.substring(0, maxLength) + "..." : description
  }

  // Format currency
  const formatCurrency = (amount, currency = "AED") => {
    return `${Math.abs(amount).toFixed(2)} ${currency}`
  }

  // Render a transaction item
  const renderTransactionItem = ({ item }) => {
    const isIncome = Number.parseFloat(item.amount) > 0
    const category = !isIncome ? categorizeTransaction(item.description) : "income"

    return (
      <View style={[styles.transactionItem, isIncome ? styles.incomeItem : styles.expenseItem]}>
        <View style={styles.transactionHeader}>
          <Text style={styles.transactionDate}>{formatDate(item.timestamp)}</Text>
          <Text style={[styles.transactionAmount, isIncome ? styles.incomeText : styles.expenseText]}>
            {isIncome ? "+" : "-"} {formatCurrency(item.amount, item.currency_code)}
          </Text>
        </View>
        <Text style={styles.transactionDescription}>{truncateDescription(item.description)}</Text>
        <Text style={styles.categoryTag}>{category}</Text>
      </View>
    )
  }

  // Render category breakdown
  const renderCategoryBreakdown = () => {
    return (
      <View style={styles.categoryBreakdown}>
        <Text style={styles.sectionTitle}>Expense Categories</Text>
        {Object.entries(categoryTotals)
          .filter(([_, amount]) => amount > 0)
          .sort(([_, a], [__, b]) => b - a)
          .map(([category, amount]) => (
            <View key={category} style={styles.categoryRow}>
              <Text style={styles.categoryName}>{category.charAt(0).toUpperCase() + category.slice(1)}</Text>
              <Text style={styles.categoryAmount}>{formatCurrency(amount)}</Text>
            </View>
          ))}
      </View>
    )
  }

  // Render token tester UI
  const renderTokenTester = () => {
    if (!showTokenTester) return null

    return (
      <View style={styles.tokenTesterContainer}>
        <Text style={styles.tokenTesterTitle}>Auth Token Tester</Text>

        <TouchableOpacity style={styles.button} onPress={testAuth} disabled={tokenLoading}>
          <Text style={styles.buttonText}>{tokenLoading ? "Getting token..." : "Test Auth Token"}</Text>
        </TouchableOpacity>

        {token && (
          <View style={styles.tokenResultContainer}>
            <Text style={styles.tokenResultText}>Token: {token}</Text>
          </View>
        )}

        {tokenError && (
          <View style={styles.tokenErrorContainer}>
            <Text style={styles.tokenErrorText}>Error: {tokenError}</Text>
          </View>
        )}

        <TouchableOpacity style={styles.closeButton} onPress={() => setShowTokenTester(false)}>
          <Text style={styles.closeButtonText}>Close</Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Transactions</Text>
        <TouchableOpacity style={styles.tokenButton} onPress={() => setShowTokenTester(!showTokenTester)}>
          <Text style={styles.tokenButtonText}>{showTokenTester ? "Hide Token Tester" : "Test Token"}</Text>
        </TouchableOpacity>
      </View>

      {renderTokenTester()}

      <View style={styles.dateFilterContainer}>
        <View style={styles.datePickerRow}>
          <Text style={styles.dateLabel}>From:</Text>
          <TouchableOpacity style={styles.dateButton} onPress={() => setShowStartDatePicker(true)}>
            <Text style={styles.dateButtonText}>{startDate}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.datePickerRow}>
          <Text style={styles.dateLabel}>To:</Text>
          <TouchableOpacity style={styles.dateButton} onPress={() => setShowEndDatePicker(true)}>
            <Text style={styles.dateButtonText}>{endDate}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Date Pickers */}
      {showStartDatePicker && (
        <DateTimePicker
          value={new Date(startDate)}
          mode="date"
          display={Platform.OS === "ios" ? "spinner" : "default"}
          onChange={onChangeStartDate}
          minimumDate={new Date("1990-01-01")}
          maximumDate={new Date("2025-12-31")}
        />
      )}

      {showEndDatePicker && (
        <DateTimePicker
          value={new Date(endDate)}
          mode="date"
          display={Platform.OS === "ios" ? "spinner" : "default"}
          onChange={onChangeEndDate}
          minimumDate={new Date(startDate)}
          maximumDate={new Date("2025-12-31")}
        />
      )}

      {/* Financial Summary */}
      <TouchableOpacity style={styles.summaryHeader} onPress={() => setSummaryVisible(!summaryVisible)}>
        <Text style={styles.summaryTitle}>Financial Summary</Text>
        <Text style={styles.summaryToggle}>{summaryVisible ? "▼" : "►"}</Text>
      </TouchableOpacity>

      {summaryVisible && (
        <View style={styles.summaryContainer}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Income:</Text>
            <Text style={[styles.summaryValue, styles.incomeText]}>+{formatCurrency(income)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Expenses:</Text>
            <Text style={[styles.summaryValue, styles.expenseText]}>-{formatCurrency(expenses)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Balance:</Text>
            <Text style={[styles.summaryValue, balance >= 0 ? styles.incomeText : styles.expenseText]}>
              {balance >= 0 ? "+" : "-"}
              {formatCurrency(Math.abs(balance))}
            </Text>
          </View>

          {renderCategoryBreakdown()}
        </View>
      )}

      {/* Error message */}
      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Loading indicator */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0000ff" />
          <Text style={styles.loadingText}>Loading transactions...</Text>
        </View>
      ) : (
        <FlatList
          data={transactions}
          renderItem={renderTransactionItem}
          keyExtractor={(item) => item.id}
          style={styles.transactionList}
          ListEmptyComponent={<Text style={styles.emptyText}>No transactions found for the selected period.</Text>}
        />
      )}
    </View>
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
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
  },
  tokenButton: {
    backgroundColor: "#3498db",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  tokenButtonText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "500",
  },
  tokenTesterContainer: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  tokenTesterTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 12,
    color: "#333",
  },
  button: {
    backgroundColor: "#3498db",
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: "center",
    marginBottom: 12,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "500",
  },
  tokenResultContainer: {
    backgroundColor: "#e6ffe6",
    padding: 10,
    borderRadius: 6,
    marginBottom: 12,
  },
  tokenResultText: {
    color: "#006600",
  },
  tokenErrorContainer: {
    backgroundColor: "#ffebee",
    padding: 10,
    borderRadius: 6,
    marginBottom: 12,
  },
  tokenErrorText: {
    color: "#c62828",
  },
  closeButton: {
    backgroundColor: "#f0f0f0",
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: "center",
  },
  closeButtonText: {
    color: "#333",
  },
  dateFilterContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  datePickerRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  dateLabel: {
    fontSize: 16,
    marginRight: 8,
    color: "#555",
  },
  dateButton: {
    backgroundColor: "#e0e0e0",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 4,
  },
  dateButtonText: {
    fontSize: 14,
    color: "#333",
  },
  summaryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#3498db",
    padding: 12,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    marginBottom: 0,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#fff",
  },
  summaryToggle: {
    fontSize: 18,
    color: "#fff",
  },
  summaryContainer: {
    backgroundColor: "#fff",
    padding: 16,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 16,
    fontWeight: "500",
    color: "#555",
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: "bold",
  },
  incomeText: {
    color: "#27ae60",
  },
  expenseText: {
    color: "#e74c3c",
  },
  categoryBreakdown: {
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#eee",
    paddingTop: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 8,
    color: "#333",
  },
  categoryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  categoryName: {
    fontSize: 14,
    color: "#555",
  },
  categoryAmount: {
    fontSize: 14,
    fontWeight: "500",
    color: "#e74c3c",
  },
  transactionList: {
    flex: 1,
  },
  transactionItem: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 1,
  },
  incomeItem: {
    borderLeftWidth: 4,
    borderLeftColor: "#27ae60",
  },
  expenseItem: {
    borderLeftWidth: 4,
    borderLeftColor: "#e74c3c",
  },
  transactionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  transactionDate: {
    fontSize: 12,
    color: "#888",
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: "bold",
  },
  transactionDescription: {
    fontSize: 14,
    color: "#333",
    marginBottom: 4,
  },
  categoryTag: {
    alignSelf: "flex-start",
    backgroundColor: "#f0f0f0",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    fontSize: 12,
    color: "#666",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 8,
    color: "#666",
  },
  errorContainer: {
    padding: 16,
    backgroundColor: "#ffebee",
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    color: "#c62828",
  },
  emptyText: {
    textAlign: "center",
    marginTop: 32,
    color: "#666",
    fontSize: 16,
  },
})

export default TransactionsScreen
