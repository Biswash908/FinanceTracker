"use client"

import { useState, useEffect } from "react"
import { View, Text, StyleSheet, TextInput, FlatList, TouchableOpacity, ActivityIndicator, Alert } from "react-native"
import { useTheme } from "../context/ThemeContext"

// Components
import TransactionCard from "../components/TransactionCard"
import DateRangePicker from "../components/DateRangePicker"

// Services and Utils
import { fetchTransactionsMultiAccount, fetchAccounts } from "../services/lean-api"
import { categorizeTransaction } from "../utils/categorizer"
import { leanEntityService } from "../services/lean-entity-service"

// Get current date and first day of current month
const getCurrentDate = () => {
  const now = new Date()
  return now.toISOString().split("T")[0]
}

const getFirstDayOfMonth = () => {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0]
}

// Category filter chips
const categoryFilters = [
  "All",
  "Food",
  "Shopping",
  "Entertainment",
  "Utilities",
  "Transport",
  "Education",
  "Health",
  "Charity",
  "Housing",
  "Income",
  "Other",
]

const SearchScreen = () => {
  const { isDarkMode } = useTheme()

  // State
  const [transactions, setTransactions] = useState([])
  const [filteredTransactions, setFilteredTransactions] = useState([])
  const [accounts, setAccounts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("All")
  const [startDate, setStartDate] = useState(getFirstDayOfMonth())
  const [endDate, setEndDate] = useState(getCurrentDate())
  const [entityId, setEntityId] = useState<string | null>(null)

  // Check for entity ID on mount and when component focuses
  useEffect(() => {
    const checkEntityId = async () => {
      try {
        const storedEntityId = await leanEntityService.getEntityId()
        if (storedEntityId) {
          setEntityId(storedEntityId)
          setError(null) // Clear any previous errors
        } else {
          setError("No bank account connected. Please connect your bank account in Settings.")
        }
      } catch (err) {
        console.error("Error checking entity ID:", err)
        setError("Error checking bank connection status.")
      }
    }

    checkEntityId()

    // Set up an interval to check for entity ID periodically
    const interval = setInterval(checkEntityId, 2000)

    // Clean up interval on unmount
    return () => clearInterval(interval)
  }, [])

  // Fetch accounts and transactions when entity ID is available or dates change
  useEffect(() => {
    if (!entityId) return

    const loadTransactions = async () => {
      try {
        setLoading(true)
        setError(null)

        // First, fetch accounts if we don't have them
        if (accounts.length === 0) {
          console.log("Fetching accounts for search...")
          const accountsData = await fetchAccounts()
          setAccounts(accountsData)

          if (accountsData.length === 0) {
            setError("No accounts found. Please try reconnecting your bank account.")
            return
          }
        }

        // Get all account IDs
        const accountIds = accounts.length > 0 ? accounts.map((account) => account.id) : []

        if (accountIds.length === 0) {
          // If we still don't have accounts, fetch them first
          const accountsData = await fetchAccounts()
          setAccounts(accountsData)
          accountIds.push(...accountsData.map((account) => account.id))
        }

        if (accountIds.length === 0) {
          setError("No accounts available for search.")
          return
        }

        // Fetch transactions for all accounts
        console.log(`Fetching transactions for search from ${startDate} to ${endDate}`)
        const result = await fetchTransactionsMultiAccount(accountIds, startDate, endDate)
        setTransactions(result.transactions || [])
        setFilteredTransactions(result.transactions || [])
      } catch (err) {
        console.error("Error loading transactions:", err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    loadTransactions()
  }, [entityId, startDate, endDate])

  // Filter transactions when search query or category changes
  useEffect(() => {
    if (!transactions.length) return

    const filtered = transactions.filter((transaction) => {
      // Filter by search query
      const matchesQuery =
        searchQuery === "" ||
        transaction.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        transaction.amount.toString().includes(searchQuery)

      // Filter by category
      const category =
        Number.parseFloat(transaction.amount) > 0 ? "income" : categorizeTransaction(transaction.description)

      const matchesCategory = selectedCategory === "All" || category.toLowerCase() === selectedCategory.toLowerCase()

      return matchesQuery && matchesCategory
    })

    setFilteredTransactions(filtered)
  }, [searchQuery, selectedCategory, transactions])

  // Handle date range change
  const handleDateRangeChange = (newStartDate: string, newEndDate: string) => {
    setStartDate(newStartDate)
    setEndDate(newEndDate)
  }

  // Render transaction item
  const renderTransactionItem = ({ item }) => {
    const category = Number.parseFloat(item.amount) > 0 ? "income" : categorizeTransaction(item.description)

    return (
      <TransactionCard
        transaction={item}
        category={category}
        onPress={() => console.log("Transaction pressed:", item.id)}
      />
    )
  }

  // Render category filter chip
  const renderCategoryChip = (category) => {
    const isSelected = category === selectedCategory

    return (
      <TouchableOpacity
        key={category}
        style={[
          styles.categoryChip,
          isDarkMode && { backgroundColor: "#333" },
          isSelected && (isDarkMode ? { backgroundColor: "#2C5282" } : styles.selectedCategoryChip),
        ]}
        onPress={() => setSelectedCategory(category)}
      >
        <Text
          style={[
            styles.categoryChipText,
            isDarkMode && { color: "#DDD" },
            isSelected && styles.selectedCategoryChipText,
          ]}
        >
          {category}
        </Text>
      </TouchableOpacity>
    )
  }

  // Show connection prompt if no entity ID
  if (!entityId && !loading) {
    return (
      <View style={[styles.container, isDarkMode && { backgroundColor: "#121212" }]}>
        <View style={styles.header}>
          <Text style={[styles.title, isDarkMode && { color: "#FFF" }]}>Search Transactions</Text>
        </View>

        <View style={[styles.connectionPrompt, isDarkMode && { backgroundColor: "#1E1E1E", borderColor: "#333" }]}>
          <Text style={[styles.connectionTitle, isDarkMode && { color: "#FFF" }]}>Connect Your Bank Account</Text>
          <Text style={[styles.connectionText, isDarkMode && { color: "#AAA" }]}>
            To search your transactions, please connect your bank account in the Settings tab.
          </Text>
          <TouchableOpacity
            style={[styles.connectionButton, isDarkMode && { backgroundColor: "#2C5282" }]}
            onPress={() => {
              Alert.alert("Connect Bank", "Please go to Settings to connect your bank account.")
            }}
          >
            <Text style={styles.connectionButtonText}>Go to Settings</Text>
          </TouchableOpacity>
        </View>
      </View>
    )
  }

  return (
    <View style={[styles.container, isDarkMode && { backgroundColor: "#121212" }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, isDarkMode && { color: "#FFF" }]}>Search Transactions</Text>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <TextInput
          style={[
            styles.searchInput,
            isDarkMode && {
              backgroundColor: "#2A2A2A",
              color: "#FFF",
              borderColor: "#444",
            },
          ]}
          placeholder="Search by description or amount..."
          placeholderTextColor={isDarkMode ? "#888" : "#999"}
          value={searchQuery}
          onChangeText={setSearchQuery}
          clearButtonMode="while-editing"
        />
      </View>

      {/* Date Range Picker */}
      <DateRangePicker startDate={startDate} endDate={endDate} onDateRangeChange={handleDateRangeChange} />

      {/* Category Filters */}
      <View style={styles.categoryFiltersContainer}>
        <FlatList
          data={categoryFilters}
          renderItem={({ item }) => renderCategoryChip(item)}
          keyExtractor={(item) => item}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryFiltersList}
        />
      </View>

      {/* Results Count */}
      <View style={styles.resultsCountContainer}>
        <Text style={[styles.resultsCount, isDarkMode && { color: "#AAA" }]}>
          {filteredTransactions.length} {filteredTransactions.length === 1 ? "transaction" : "transactions"} found
        </Text>
      </View>

      {/* Error message */}
      {error && (
        <View style={[styles.errorContainer, isDarkMode && { backgroundColor: "#3A1212" }]}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Transactions List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3498db" />
          <Text style={[styles.loadingText, isDarkMode && { color: "#AAA" }]}>Loading transactions...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredTransactions}
          renderItem={renderTransactionItem}
          keyExtractor={(item) => item?.id || `transaction-${Math.random().toString(36).substring(2, 15)}`}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={[styles.emptyText, isDarkMode && { color: "#AAA" }]}>
                No transactions match your search criteria.
              </Text>
            </View>
          }
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
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#333",
  },
  searchContainer: {
    marginBottom: 16,
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
  categoryFiltersContainer: {
    marginBottom: 16,
  },
  categoryFiltersList: {
    paddingVertical: 8,
  },
  categoryChip: {
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  selectedCategoryChip: {
    backgroundColor: "#3498db",
  },
  categoryChipText: {
    fontSize: 14,
    color: "#333",
  },
  selectedCategoryChipText: {
    color: "#fff",
    fontWeight: "bold",
  },
  resultsCountContainer: {
    marginBottom: 16,
  },
  resultsCount: {
    fontSize: 14,
    color: "#666",
    fontStyle: "italic",
  },
  listContent: {
    paddingBottom: 20,
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
    justifyContent: "center",
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

export default SearchScreen
