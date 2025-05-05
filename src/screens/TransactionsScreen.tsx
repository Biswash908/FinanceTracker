"use client"

import { useState, useEffect, useCallback, useRef } from "react"
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
  LogBox,
} from "react-native"
import { ACCOUNT_ID, ENTITY_ID } from "@env"

// Components
import TransactionCard from "../components/TransactionCard"
import DateRangePicker from "../components/DateRangePicker"
import FinancialSummary from "../components/FinancialSummary"

// Services and Utils
import { fetchTransactions } from "../services/lean-api"
import { categorizeTransaction, calculateFinancials } from "../utils/categorizer"
import { formatDate } from "../utils/formatters"

// Suppress the warning about nested scrollviews
// Note: In a production app, you'd want to find a better solution
LogBox.ignoreLogs(["VirtualizedLists should never be nested"])

const screenHeight = Dimensions.get("window").height
const screenWidth = Dimensions.get("window").width

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
  // State
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [startDate, setStartDate] = useState(getFirstDayOfMonth())
  const [endDate, setEndDate] = useState(getCurrentDate())
  const [showStartDatePicker, setShowStartDatePicker] = useState(false)
  const [showEndDatePicker, setShowEndDatePicker] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("All")

  // Refs
  const mainScrollViewRef = useRef(null)
  const transactionListRef = useRef(null)

  // Fetch transactions when dates change
  useEffect(() => {
    const loadTransactions = async () => {
      try {
        setLoading(true)
        setError(null)

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
  }, [startDate, endDate])

  // Date picker handlers
  const onChangeStartDate = (event, selectedDate) => {
    setShowStartDatePicker(false)
    if (selectedDate) {
      const formattedDate = formatDate(selectedDate)
      console.log("Selected start date:", formattedDate)
      setStartDate(formattedDate)
    }
  }

  const onChangeEndDate = (event, selectedDate) => {
    setShowEndDatePicker(false)
    if (selectedDate) {
      const formattedDate = formatDate(selectedDate)
      console.log("Selected end date:", formattedDate)
      setEndDate(formattedDate)
    }
  }

  // Filter transactions based on search query and category
  const filteredTransactions = transactions.filter((transaction) => {
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

  // Calculate financial summary
  const { income, expenses, balance, categoryTotals } = calculateFinancials(filteredTransactions)

  // Render transaction item
  const renderTransactionItem = useCallback(({ item }) => {
    const category = Number.parseFloat(item.amount) > 0 ? "income" : categorizeTransaction(item.description)

    return (
      <TransactionCard
        transaction={item}
        category={category}
        onPress={() => console.log("Transaction pressed:", item.id)}
      />
    )
  }, [])

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

  // Render category filter chip
  const renderCategoryChip = (category) => {
    const isSelected = category === selectedCategory

    return (
      <TouchableOpacity
        key={category}
        style={[styles.categoryChip, isSelected && styles.selectedCategoryChip]}
        onPress={() => setSelectedCategory(category)}
      >
        <Text style={[styles.categoryChipText, isSelected && styles.selectedCategoryChipText]}>{category}</Text>
      </TouchableOpacity>
    )
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        ref={mainScrollViewRef}
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={true}
        nestedScrollEnabled={true}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Transactions</Text>
        </View>

        {/* Date Picker */}
        <DateRangePicker
          startDate={startDate}
          endDate={endDate}
          showStartDatePicker={showStartDatePicker}
          showEndDatePicker={showEndDatePicker}
          setShowStartDatePicker={setShowStartDatePicker}
          setShowEndDatePicker={setShowEndDatePicker}
          onChangeStartDate={onChangeStartDate}
          onChangeEndDate={onChangeEndDate}
        />

        {/* Search */}
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search by description or amount..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            clearButtonMode="while-editing"
          />
        </View>

        {/* Category Filters */}
        <View style={styles.categoryFiltersContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryFiltersList}
            nestedScrollEnabled={true}
          >
            {categoryFilters.map(renderCategoryChip)}
          </ScrollView>
        </View>

        {/* Results Count */}
        <View style={styles.resultsCountContainer}>
          <Text style={styles.resultsCount}>
            {filteredTransactions.length} {filteredTransactions.length === 1 ? "transaction" : "transactions"} found
          </Text>
        </View>

        {/* Financial Summary */}
        <FinancialSummary income={income} expenses={expenses} balance={balance} categoryTotals={categoryTotals} />

        {/* Error */}
        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Transaction Box Header */}
        <View style={styles.transactionBoxContainer}>
          <Text style={styles.transactionBoxTitle}>Transaction History</Text>
        </View>

        {/* Transaction Box */}
        <View style={styles.transactionBox}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#3498db" />
              <Text style={styles.loadingText}>Loading transactions...</Text>
            </View>
          ) : filteredTransactions.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No transactions found for the selected filters.</Text>
            </View>
          ) : (
            <FlatList
              ref={transactionListRef}
              data={filteredTransactions}
              keyExtractor={(item) => item.id || Math.random().toString()}
              renderItem={renderTransactionItem}
              contentContainerStyle={styles.transactionListContent}
              nestedScrollEnabled={true}
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
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#333",
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
  transactionBoxContainer: {
    marginTop: 16,
    marginBottom: 8,
  },
  transactionBoxTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
  },
  transactionBox: {
    height: screenHeight * 0.4,
    backgroundColor: "#fff",
    borderRadius: 12,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
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
})

export default TransactionsScreen
