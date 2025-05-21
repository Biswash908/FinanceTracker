"use client"

import type React from "react"
import { useState } from "react"
import { View, Text, StyleSheet, TouchableOpacity } from "react-native"
import { useTheme } from "../context/ThemeContext"

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

  // Format currency with commas
  const formatCurrency = (amount, currency = "AED") => {
    return `${Math.abs(amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`
  }

  // Define category order (most important first, other last)
  const categoryOrder = [
    "food",
    "transport",
    "utilities",
    "housing",
    "shopping",
    "health",
    "education",
    "entertainment",
    "charity",
    "other",
  ]

  // Sort categories by the defined order
  const sortedCategories = Object.entries(categoryTotals)
    .filter(([category, amount]) => amount > 0 && category.toLowerCase() !== "income")
    .sort(([a], [b]) => {
      const indexA = categoryOrder.indexOf(a.toLowerCase())
      const indexB = categoryOrder.indexOf(b.toLowerCase())
      return indexA - indexB
    })

  // Get category color
  const getCategoryColor = (category: string): string => {
    const categoryColors = {
      food: "#FF5733", // Orange-red
      transport: "#33A8FF", // Blue
      utilities: "#33FFC1", // Teal
      housing: "#8C33FF", // Purple
      shopping: "#FF33A8", // Pink
      health: "#33FF57", // Green
      education: "#FFC133", // Yellow
      entertainment: "#FF3333", // Red
      charity: "#33FF33", // Bright green
      other: "#AAAAAA", // Gray
    }

    return categoryColors[category.toLowerCase()] || "#AAAAAA"
  }

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

          {/* Always show the pending line, even if amount is 0 */}
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

          <Text style={[styles.sectionTitle, isDarkMode && { color: "#EEE" }]}>Expense Categories</Text>

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
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#eee",
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
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 12,
    color: "#333",
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
})

export default FinancialSummary
