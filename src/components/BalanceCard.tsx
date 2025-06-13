import { View, Text, StyleSheet, ActivityIndicator } from "react-native"
import type React from "react"

interface BalanceCardProps {
  title: string
  amount: number
  type: "positive" | "negative" | "income" | "expense"
  style?: object
  isDarkMode?: boolean
  currency?: string
  loading?: boolean
}

const BalanceCard: React.FC<BalanceCardProps> = ({
  title,
  amount,
  type,
  style,
  isDarkMode,
  currency = "AED",
  loading = false,
}) => {
  // Format currency with commas
  const formatCurrency = (amount, currency = "AED") => {
    return `${Math.abs(amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`
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

  const styles = StyleSheet.create({
    container: {
      padding: 16,
      borderRadius: 8,
      width: "100%",
      marginBottom: 16,
    },
    title: {
      fontSize: 16,
      fontWeight: "600",
      marginBottom: 8,
    },
    amount: {
      fontSize: 24,
      fontWeight: "bold",
    },
  })

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
      {loading ? (
        <ActivityIndicator size="small" color={getColor()} />
      ) : (
        <Text style={[styles.amount, { color: getColor() }]}>
          {type === "income" || type === "positive" ? "+" : "-"} {formatCurrency(Math.abs(amount), currency)}
        </Text>
      )}
    </View>
  )
}

export default BalanceCard
