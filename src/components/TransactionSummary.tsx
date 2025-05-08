"use client"

import type React from "react"
import { View, Text, StyleSheet } from "react-native"
import { useTheme } from "../context/ThemeContext"

interface TransactionSummaryProps {
  income: number
  expenses: number
  transactionCount: number
  dateRange: {
    start: string
    end: string
  }
  currency?: string
}

const TransactionSummary: React.FC<TransactionSummaryProps> = ({
  income,
  expenses,
  transactionCount,
  dateRange,
  currency = "AED",
}) => {
  const { isDarkMode } = useTheme()

  // Format date for display
  const formatDate = (dateString: string): string => {
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    } catch (error) {
      console.error("Error formatting date:", error)
      return dateString
    }
  }

  return (
    <View style={[styles.container, isDarkMode && { backgroundColor: "#1E1E1E", borderColor: "#333" }]}>
      <Text style={[styles.title, isDarkMode && { color: "#FFF" }]}>Period Summary</Text>

      <Text style={[styles.dateRange, isDarkMode && { color: "#AAA" }]}>
        {formatDate(dateRange.start)} - {formatDate(dateRange.end)}
      </Text>

      <Text style={[styles.summaryText, isDarkMode && { color: "#DDD" }]}>
        You {expenses > 0 ? "spent" : "didn't spend"}{" "}
        {expenses > 0 ? `${Math.abs(expenses).toFixed(2)} ${currency}` : "anything"} and{" "}
        {income > 0 ? "earned" : "didn't earn"} {income > 0 ? `${income.toFixed(2)} ${currency}` : "anything"} in this
        period.
      </Text>

      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, styles.incomeText]}>
            +{income.toFixed(2)} {currency}
          </Text>
          <Text style={[styles.statLabel, isDarkMode && { color: "#AAA" }]}>Income</Text>
        </View>

        <View style={styles.statItem}>
          <Text style={[styles.statValue, styles.expenseText]}>
            -{expenses.toFixed(2)} {currency}
          </Text>
          <Text style={[styles.statLabel, isDarkMode && { color: "#AAA" }]}>Expenses</Text>
        </View>

        <View style={styles.statItem}>
          <Text style={[styles.statValue, isDarkMode && { color: "#FFF" }]}>{transactionCount}</Text>
          <Text style={[styles.statLabel, isDarkMode && { color: "#AAA" }]}>Transactions</Text>
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: "#eee",
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 8,
  },
  dateRange: {
    fontSize: 14,
    color: "#666",
    marginBottom: 12,
  },
  summaryText: {
    fontSize: 16,
    color: "#555",
    lineHeight: 24,
    marginBottom: 16,
  },
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: "#eee",
    paddingTop: 16,
  },
  statItem: {
    alignItems: "center",
  },
  statValue: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: "#666",
  },
  incomeText: {
    color: "#27ae60",
  },
  expenseText: {
    color: "#e74c3c",
  },
})

export default TransactionSummary
