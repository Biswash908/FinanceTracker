import React from "react"
import { View, Text, StyleSheet, TouchableOpacity } from "react-native"
import { formatDate, formatCurrency } from "../utils/formatters"
import CategoryBadge from "./CategoryBadge"

interface TransactionCardProps {
  transaction: any
  category: string
  onPress?: () => void
}

const TransactionCard = ({ transaction, category, onPress }: TransactionCardProps) => {
  const isIncome = Number.parseFloat(transaction.amount) > 0

  return (
    <TouchableOpacity 
      style={styles.container} 
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.card, isIncome ? styles.incomeCard : styles.expenseCard]}>
        <View style={styles.header}>
          <Text style={styles.date}>{formatDate(transaction.timestamp)}</Text>
          <Text 
            style={[
              styles.amount, 
              isIncome ? styles.incomeText : styles.expenseText
            ]}
          >
            {isIncome ? "+" : "-"} {formatCurrency(transaction.amount, transaction.currency_code)}
          </Text>
        </View>
        
        <Text style={styles.description}>{transaction.description}</Text>
        
        <View style={styles.footer}>
          <CategoryBadge category={category} />
        </View>
      </View>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
  },
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
  incomeCard: {
    borderLeftWidth: 4,
    borderLeftColor: "#27ae60",
  },
  expenseCard: {
    borderLeftWidth: 4,
    borderLeftColor: "#e74c3c",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  date: {
    fontSize: 13,
    color: "#666",
    fontWeight: "500",
  },
  amount: {
    fontSize: 17,
    fontWeight: "bold",
  },
  incomeText: {
    color: "#27ae60",
  },
  expenseText: {
    color: "#e74c3c",
  },
  description: {
    fontSize: 15,
    color: "#333",
    marginBottom: 12,
    fontWeight: "500",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "flex-start",
  },
})

export default TransactionCard
