import type React from "react"
import { View, Text, StyleSheet } from "react-native"

interface BalanceCardProps {
  title: string
  amount: number
  type: "positive" | "negative" | "income" | "expense"
  style?: object
  isDarkMode?: boolean
  currency?: string
}

const BalanceCard: React.FC<BalanceCardProps> = ({ title, amount, type, style, isDarkMode, currency = "AED" }) => {
  // Format currency
  const formatCurrency = (amount, currency = "AED") => {
    return `${Math.abs(amount).toFixed(2)} ${currency}`
  }

  // Get color based on type
  const getColor = () => {
    switch (type) {
      case "positive":
      case "income":
        return "#27ae60" // Green
      case "negative":
      case "expense":
        return "#e74c3c" // Red
      default:
        return "#333"
    }
  }

  // Get background color based on type
  const getBackgroundColor = () => {
    if (isDarkMode) return "#1E1E1E"

    switch (type) {
      case "positive":
      case "income":
        return "#e6f7ef" // Light green
      case "negative":
      case "expense":
        return "#fdecea" // Light red
      default:
        return "#f5f5f5"
    }
  }

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: getBackgroundColor() },
        isDarkMode && { borderColor: "#333" },
        style,
      ]}
    >
      <Text style={[styles.title, isDarkMode && { color: "#DDD" }]}>{title}</Text>
      <Text style={[styles.amount, { color: getColor() }]}>
        {type === "income" || type === "positive" ? "+" : "-"} {formatCurrency(Math.abs(amount), currency)}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: "#eee",
  },
  title: {
    fontSize: 16,
    color: "#666",
    marginBottom: 8,
  },
  amount: {
    fontSize: 24,
    fontWeight: "bold",
  },
})

export default BalanceCard
