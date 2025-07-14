"use client"

import type React from "react"
import { View, Text, StyleSheet } from "react-native"
import { useTheme } from "../context/ThemeContext"

interface FinancialOverviewCardProps {
  income: number
  expenses: number
  balance: number
  currency?: string
}

const FinancialOverviewCard: React.FC<FinancialOverviewCardProps> = ({
  income,
  expenses,
  balance,
  currency = "AED",
}) => {
  const { isDarkMode } = useTheme()

  // Format currency with commas
  const formatCurrency = (amount: number, currencyCode = "AED") => {
    return `${Math.abs(amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currencyCode}`
  }

  return (
    <View
      style={[
        styles.container,
        isDarkMode ? { backgroundColor: "#1E1E1E", borderColor: "#333" } : { backgroundColor: "#fff" },
      ]}
    >
      <View style={styles.summaryRow}>
        <Text style={[styles.label, isDarkMode && { color: "#DDD" }]}>Income:</Text>
        <Text style={[styles.value, styles.incomeText]}>+{formatCurrency(income, currency)}</Text>
      </View>

      <View style={styles.summaryRow}>
        <Text style={[styles.label, isDarkMode && { color: "#DDD" }]}>Expenses:</Text>
        <Text style={[styles.value, styles.expenseText]}>-{formatCurrency(expenses, currency)}</Text>
      </View>

      <View style={[styles.summaryRow, styles.balanceRow, isDarkMode && { borderTopColor: "#444" }]}>
        <Text style={[styles.balanceLabel, isDarkMode && { color: "#EEE" }]}>Balance:</Text>
        <Text style={[styles.balanceValue, balance >= 0 ? styles.incomeText : styles.expenseText]}>
          {balance >= 0 ? "+" : "-"}
          {formatCurrency(Math.abs(balance), currency)}
        </Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginBottom: 24, // Adjusted margin to match DashboardScreen's balanceCardsContainer
    borderWidth: 1,
    borderColor: "#eee",
    padding: 16, // Add padding to the container
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
})

export default FinancialOverviewCard
