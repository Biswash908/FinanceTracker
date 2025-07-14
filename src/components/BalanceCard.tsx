"use client"

import type React from "react"
import { View, Text, StyleSheet } from "react-native"
import { useTheme } from "../context/ThemeContext"

interface BalanceCardProps {
  income: number
  expenses: number
  balance: number
  isDarkMode?: boolean
  currency?: string
}

const BalanceCard: React.FC<BalanceCardProps> = ({ income, expenses, balance, isDarkMode, currency = "AED" }) => {
  const { isDarkMode: contextIsDarkMode } = useTheme()
  const currentIsDarkMode = isDarkMode ?? contextIsDarkMode // Use prop if provided, else context

  // Format currency with commas
  const formatCurrency = (amount: number, currencyCode = "AED") => {
    return `${Math.abs(amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currencyCode}`
  }

  const styles = StyleSheet.create({
    container: {
      borderRadius: 12,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
      marginBottom: 24,
      borderWidth: 1,
      borderColor: currentIsDarkMode ? "#333" : "#eee",
      padding: 16,
      backgroundColor: currentIsDarkMode ? "#1E1E1E" : "#fff",
    },
    summaryRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: 8,
    },
    label: {
      fontSize: 16,
      color: currentIsDarkMode ? "#DDD" : "#555",
    },
    value: {
      fontSize: 16,
      fontWeight: "500",
    },
    balanceRow: {
      marginTop: 8,
      paddingTop: 8,
      borderTopWidth: 1,
      borderTopColor: currentIsDarkMode ? "#444" : "#eee",
    },
    balanceLabel: {
      fontSize: 18,
      fontWeight: "600",
      color: currentIsDarkMode ? "#EEE" : "#333",
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

  return (
    <View style={styles.container}>
      <View style={styles.summaryRow}>
        <Text style={styles.label}>Income:</Text>
        <Text style={[styles.value, styles.incomeText]}>+{formatCurrency(income, currency)}</Text>
      </View>

      <View style={styles.summaryRow}>
        <Text style={styles.label}>Expenses:</Text>
        <Text style={[styles.value, styles.expenseText]}>-{formatCurrency(expenses, currency)}</Text>
      </View>

      <View style={[styles.summaryRow, styles.balanceRow]}>
        <Text style={styles.balanceLabel}>Balance:</Text>
        <Text style={[styles.balanceValue, balance >= 0 ? styles.incomeText : styles.expenseText]}>
          {balance >= 0 ? "+" : "-"}
          {formatCurrency(Math.abs(balance), currency)}
        </Text>
      </View>
    </View>
  )
}

export default BalanceCard
