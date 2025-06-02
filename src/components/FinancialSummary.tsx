"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { View, Text, StyleSheet, TouchableOpacity } from "react-native"
import { MaterialIcons } from "@expo/vector-icons"
import { useTheme } from "../context/ThemeContext"
import AsyncStorage from "@react-native-async-storage/async-storage"

// Sort options
type SortOption = "amount_lowest" | "amount_highest" | "alphabetical_asc" | "alphabetical_desc"

// Storage key for persisting sort preferences
const CATEGORY_SORT_PREFERENCE_KEY = "expense_category_sort_preference"

interface FinancialSummaryProps {
  income: number
  expenses: number
  balance: number
  categoryTotals: Record<string, number>
  pendingAmount?: number
  currency?: string
}

const FinancialSummary: React.FC<FinancialSummaryProps> = ({
  income,
  expenses,
  balance,
  categoryTotals,
  pendingAmount = 0,
  currency = "AED",
}) => {
  const [expanded, setExpanded] = useState(true)
  const { isDarkMode } = useTheme()
  const [dropdownVisible, setDropdownVisible] = useState(false)
  const [sortOption, setSortOption] = useState<SortOption>("amount_highest")

  // Load saved sort preference on mount
  useEffect(() => {
    const loadSortPreference = async () => {
      try {
        const savedPreference = await AsyncStorage.getItem(CATEGORY_SORT_PREFERENCE_KEY)
        if (savedPreference) {
          setSortOption(savedPreference as SortOption)
        }
      } catch (error) {
        console.error("Error loading sort preference:", error)
      }
    }

    loadSortPreference()
  }, [])

  // Save sort preference when it changes
  useEffect(() => {
    const saveSortPreference = async () => {
      try {
        await AsyncStorage.setItem(CATEGORY_SORT_PREFERENCE_KEY, sortOption)
      } catch (error) {
        console.error("Error saving sort preference:", error)
      }
    }

    saveSortPreference()
  }, [sortOption])

  // Format currency with commas
  const formatCurrency = (amount, currency = "AED") => {
    return `${Math.abs(amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`
  }

  // Sort categories based on current sort option
  const sortedCategories = Object.entries(categoryTotals)
    .filter(([category, amount]) => amount > 0 && category.toLowerCase() !== "income")
    .sort(([categoryA, amountA], [categoryB, amountB]) => {
      switch (sortOption) {
        case "amount_lowest":
          return amountA - amountB
        case "amount_highest":
          return amountB - amountA
        case "alphabetical_asc":
          return categoryA.localeCompare(categoryB)
        case "alphabetical_desc":
          return categoryB.localeCompare(categoryA)
        default:
          return amountB - amountA
      }
    })

  // Handle sort option selection
  const handleSortSelect = (option: SortOption) => {
    setSortOption(option)
    setDropdownVisible(false)
  }

  // Get category color
  const getCategoryColor = (category: string): string => {
    const categoryColors = {
      food: "#FF5733",
      transport: "#33A8FF",
      utilities: "#33FFC1",
      housing: "#8C33FF",
      shopping: "#FF33A8",
      health: "#33FF57",
      education: "#FFC133",
      entertainment: "#FF3333",
      charity: "#33FF33",
      other: "#AAAAAA",
    }

    return categoryColors[category.toLowerCase()] || "#AAAAAA"
  }

  // Get sort option display name
  const getSortOptionName = (option: SortOption): string => {
    switch (option) {
      case "amount_lowest":
        return "Amount (Low to High)"
      case "amount_highest":
        return "Amount (High to Low)"
      case "alphabetical_asc":
        return "Alphabetical (A-Z)"
      case "alphabetical_desc":
        return "Alphabetical (Z-A)"
    }
  }

  const sortOptions: SortOption[] = ["amount_lowest", "amount_highest", "alphabetical_asc", "alphabetical_desc"]

  return (
    <View
      style={[
        styles.container,
        isDarkMode ? { backgroundColor: "#1E1E1E", borderColor: "#333" } : { backgroundColor: "#fff" },
      ]}
    >
      <TouchableOpacity
        style={[styles.header, isDarkMode ? { backgroundColor: "#2C5282" } : { backgroundColor: "#3498db" }]}
        onPress={() => setExpanded(!expanded)}
      >
        <Text style={styles.title}>Financial Summary</Text>
        <Text style={styles.toggleIcon}>{expanded ? "▼" : "►"}</Text>
      </TouchableOpacity>

      {expanded && (
        <View style={styles.content}>
          <View style={styles.summaryRow}>
            <Text style={[styles.label, isDarkMode && { color: "#DDD" }]}>Inflow:</Text>
            <Text style={[styles.value, styles.incomeText]}>+{formatCurrency(income, currency)}</Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={[styles.label, isDarkMode && { color: "#DDD" }]}>Expenses:</Text>
            <Text style={[styles.value, styles.expenseText]}>-{formatCurrency(expenses, currency)}</Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={[styles.label, isDarkMode && { color: "#DDD" }]}>Pending:</Text>
            <Text style={[styles.value, styles.pendingText]}>-{formatCurrency(pendingAmount, currency)}</Text>
          </View>

          <View style={[styles.summaryRow, styles.balanceRow, isDarkMode && { borderTopColor: "#444" }]}>
            <Text style={[styles.balanceLabel, isDarkMode && { color: "#EEE" }]}>Balance:</Text>
            <Text style={[styles.balanceValue, balance >= 0 ? styles.incomeText : styles.expenseText]}>
              {balance >= 0 ? "+" : "-"}
              {formatCurrency(Math.abs(balance), currency)}
            </Text>
          </View>

          <View style={styles.sectionTitleRow}>
            <Text style={[styles.sectionTitle, isDarkMode && { color: "#EEE" }]}>Expense Categories</Text>
            <View style={styles.sortContainer}>
              <TouchableOpacity style={styles.sortButton} onPress={() => setDropdownVisible(!dropdownVisible)}>
                <MaterialIcons name="sort" size={18} color={isDarkMode ? "#DDD" : "#555"} />
              </TouchableOpacity>

              {dropdownVisible && (
                <View style={[styles.dropdown, isDarkMode && { backgroundColor: "#2A2A2A", borderColor: "#444" }]}>
                  {sortOptions.map((option) => (
                    <TouchableOpacity
                      key={option}
                      style={[
                        styles.dropdownItem,
                        sortOption === option && styles.selectedDropdownItem,
                        isDarkMode && { borderBottomColor: "#444" },
                        sortOption === option && isDarkMode && { backgroundColor: "#3a3a3a" },
                      ]}
                      onPress={() => handleSortSelect(option)}
                    >
                      <Text
                        style={[
                          styles.dropdownText,
                          sortOption === option && styles.selectedDropdownText,
                          isDarkMode && { color: "#DDD" },
                        ]}
                      >
                        {getSortOptionName(option)}
                      </Text>
                      {sortOption === option && (
                        <MaterialIcons name="check" size={16} color={isDarkMode ? "#3498db" : "#3498db"} />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          </View>

          {sortedCategories.length > 0 ? (
            sortedCategories.map(([category, amount]) => (
              <View key={category} style={styles.categoryRow}>
                <View style={styles.categoryNameContainer}>
                  <View
                    style={[
                      styles.categoryColorDot,
                      {
                        backgroundColor: getCategoryColor(category),
                      },
                    ]}
                  />
                  <Text style={[styles.categoryName, isDarkMode && { color: "#DDD" }]}>
                    {category.charAt(0).toUpperCase() + category.slice(1)}
                  </Text>
                </View>
                <Text style={styles.categoryAmount}>-{formatCurrency(amount, currency)}</Text>
              </View>
            ))
          ) : (
            <Text style={[styles.emptyText, isDarkMode && { color: "#AAA" }]}>
              No expense data available for this period.
            </Text>
          )}
        </View>
      )}

      {/* Overlay to close dropdown when clicking outside */}
      {dropdownVisible && (
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setDropdownVisible(false)} />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    overflow: "visible",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#eee",
    zIndex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#fff",
  },
  toggleIcon: {
    fontSize: 16,
    color: "#fff",
  },
  content: {
    padding: 16,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  label: {
    fontSize: 16,
    color: "#555",
  },
  value: {
    fontSize: 16,
    fontWeight: "500",
  },
  balanceRow: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#eee",
    marginBottom: 16,
  },
  balanceLabel: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
  },
  balanceValue: {
    fontSize: 18,
    fontWeight: "bold",
  },
  incomeText: {
    color: "#27ae60",
  },
  expenseText: {
    color: "#e74c3c",
  },
  pendingText: {
    color: "#f39c12",
  },
  sectionTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  sortContainer: {
    position: "relative",
    zIndex: 10,
  },
  sortButton: {
    padding: 4,
  },
  dropdown: {
    position: "absolute",
    top: 30,
    right: 0,
    backgroundColor: "white",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#eee",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 20,
    minWidth: 170,
    zIndex: 1000,
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
  },
  selectedDropdownText: {
    fontWeight: "600",
    color: "#3498db",
  },
  categoryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
    alignItems: "center",
  },
  categoryNameContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  categoryColorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
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
  emptyText: {
    fontSize: 14,
    color: "#666",
    fontStyle: "italic",
    textAlign: "center",
    marginTop: 10,
  },
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "transparent",
    zIndex: 999, // Higher than anything in TransactionsScreen
  },
})

export default FinancialSummary
