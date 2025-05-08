"use client"

import { useState, useEffect } from "react"
import { View, Text, StyleSheet, TextInput, FlatList, TouchableOpacity, ActivityIndicator } from "react-native"
import { ACCOUNT_ID, ENTITY_ID } from "@env"
import { useTheme } from "../context/ThemeContext"

// Components
import TransactionCard from "../components/TransactionCard"
import DateRangePicker from "../components/DateRangePicker"

// Services and Utils
import { fetchTransactions } from "../services/lean-api"
import { categorizeTransaction } from "../utils/categorizer"
import { formatDate } from "../utils/formatters"

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
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("All")
  const [startDate, setStartDate] = useState(getFirstDayOfMonth())
  const [endDate, setEndDate] = useState(getCurrentDate())
  const [showStartDatePicker, setShowStartDatePicker] = useState(false)
  const [showEndDatePicker, setShowEndDatePicker] = useState(false)

  // Fetch transactions when component mounts or dates change
  useEffect(() => {
    const loadTransactions = async () => {
      try {
        setLoading(true)
        setError(null)

        const data = await fetchTransactions(ENTITY_ID, ACCOUNT_ID, startDate, endDate)
        setTransactions(data)
        setFilteredTransactions(data)
      } catch (err) {
        console.error("Error loading transactions:", err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    loadTransactions()
  }, [startDate, endDate])

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

  // Date picker handlers
  const onChangeStartDate = (event, selectedDate) => {
    setShowStartDatePicker(false)
    if (selectedDate) {
      const formattedDate = formatDate(selectedDate)
      setStartDate(formattedDate)
    }
  }

  const onChangeEndDate = (event, selectedDate) => {
    setShowEndDatePicker(false)
    if (selectedDate) {
      const formattedDate = formatDate(selectedDate)
      setEndDate(formattedDate)
    }
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
      <DateRangePicker
        startDate={startDate}
        endDate={endDate}
        showStartDatePicker={showStartDatePicker}
        showEndDatePicker={showEndDatePicker}
        setShowStartDatePicker={setShowStartDatePicker}
        setShowEndDatePicker={setShowEndDatePicker}
        onChangeStartDate={onChangeStartDate}
        onChangeEndDate={onChangeEndDate}
        isDarkMode={isDarkMode}
      />

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
          keyExtractor={(item) => item.id}
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
})

export default SearchScreen
