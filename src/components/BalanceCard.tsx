import React from "react"
import { View, Text, StyleSheet } from "react-native"
import { formatCurrency } from "../utils/formatters"

interface BalanceCardProps {
  title: string
  amount: number
  type: "positive" | "negative" | "income" | "expense"
  style?: object
}

const BalanceCard = ({ title, amount, type, style }: BalanceCardProps) => {
  // Determine card color based on type
  const getCardStyle = () => {
    switch (type) {
      case "positive":
        return styles.positiveCard
      case "negative":
        return styles.negativeCard
      case "income":
        return styles.incomeCard
      case "expense":
        return styles.expenseCard
      default:
        return {}
    }
  }
  
  // Determine amount color based on type
  const getAmountStyle = () => {
    switch (type) {
      case "positive":
      case "income":
        return styles.positiveAmount
      case "negative":
      case "expense":
        return styles.negativeAmount
      default:
        return {}
    }
  }
  
  // Determine prefix based on type
  const getPrefix = () => {
    switch (type) {
      case "positive":
      case "income":
        return "+"
      case "negative":
      case "expense":
        return "-"
      default:
        return ""
    }
  }
  
  return (
    <View style={[styles.card, getCardStyle(), style]}>
      <Text style={styles.title}>{title}</Text>
      <Text style={[styles.amount, getAmountStyle()]}>
        {getPrefix()} {formatCurrency(Math.abs(amount))}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  positiveCard: {
    backgroundColor: "#e6f7ef",
  },
  negativeCard: {
    backgroundColor: "#fdeaea",
  },
  incomeCard: {
    backgroundColor: "#e6f7ef",
  },
  expenseCard: {
    backgroundColor: "#fdeaea",
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
  positiveAmount: {
    color: "#27ae60",
  },
  negativeAmount: {
    color: "#e74c3c",
  },
})

export default BalanceCard
