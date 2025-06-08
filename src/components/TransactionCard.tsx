"use client"

import type React from "react"
import { memo } from "react"
import { View, Text, StyleSheet, TouchableOpacity } from "react-native"
import { formatDate } from "../utils/formatters"
import { useTheme } from "../context/ThemeContext"
import { categorizeTransaction } from "../utils/categorizer"

interface TransactionCardProps {
  transaction: any
  category?: string
  isPending?: boolean
  onPress: () => void
}

const TransactionCard: React.FC<TransactionCardProps> = ({ transaction, category, isPending = false, onPress }) => {
  const { isDarkMode } = useTheme()

  // Handle potentially invalid transaction data
  if (!transaction) {
    return null
  }

  const amount = transaction.amount ? Number.parseFloat(transaction.amount) : 0
  const isIncome = amount > 0
  const description = transaction.lean_description || transaction.description || "Unknown transaction"
  const date = transaction.timestamp || transaction.date || new Date().toISOString()
  const accountName = transaction.account_name || "Unknown Account"
  const currency = transaction.currency_code || "AED"

  // Use Lean categorization if available, otherwise use the passed category or categorize manually
  const finalCategory = category || categorizeTransaction(transaction, isPending)

  // Format currency with commas
  const formatCurrency = (amount, currency = "AED") => {
    return `${Math.abs(amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`
  }

  // Truncate long descriptions
  const truncateDescription = (description, maxLength = 40) => {
    return description.length > maxLength ? description.substring(0, maxLength) + "..." : description
  }

  // Get emoji for category
  const getCategoryEmoji = (category: string): string => {
    const categoryEmojis = {
      food: "🍔",
      shopping: "🛍️",
      entertainment: "🎬",
      utilities: "💡",
      transport: "🚗",
      education: "📚",
      health: "🏥",
      charity: "❤️",
      housing: "🏠",
      income: "💰",
      deposit: "📥",
      other: "📋",
    }

    return categoryEmojis[category.toLowerCase()] || "📋"
  }

  return (
    <TouchableOpacity
      style={[
        styles.container,
        isPending ? styles.pendingItem : isIncome ? styles.incomeItem : styles.expenseItem,
        isDarkMode && {
          backgroundColor: "#2A2A2A",
          borderLeftColor: isPending ? "#f39c12" : isIncome ? "#27ae60" : "#e74c3c",
        },
      ]}
      onPress={onPress}
    >
      <View style={styles.header}>
        <Text style={[styles.date, isDarkMode && { color: "#AAA" }]}>{formatDate(date)}</Text>
        <Text
          style={[styles.amount, isPending ? styles.pendingText : isIncome ? styles.incomeText : styles.expenseText]}
        >
          {isIncome ? "+" : "-"} {formatCurrency(amount, currency)}
        </Text>
      </View>

      <Text style={[styles.description, isDarkMode && { color: "#DDD" }]}>{truncateDescription(description)}</Text>

      <View style={styles.footer}>
        <View style={styles.leftFooter}>
          <Text style={[styles.category, isDarkMode && { backgroundColor: "#444", color: "#CCC" }]}>
            {getCategoryEmoji(finalCategory)} {finalCategory}
          </Text>
          <Text style={[styles.accountName, isDarkMode && { backgroundColor: "#333", color: "#AAA" }]}>
            {accountName}
          </Text>
          {/* Show Lean category info if available */}
          {transaction.lean_category && (
            <Text style={[styles.leanCategory, isDarkMode && { backgroundColor: "#2C5282", color: "#FFF" }]}>
              Lean: {transaction.lean_category}
            </Text>
          )}
        </View>
        {isPending && (
          <View style={[styles.pendingBadge, isDarkMode && { backgroundColor: "#5d4037" }]}>
            <Text style={styles.pendingBadgeText}>PENDING</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 1,
  },
  incomeItem: {
    borderLeftWidth: 4,
    borderLeftColor: "#27ae60",
  },
  expenseItem: {
    borderLeftWidth: 4,
    borderLeftColor: "#e74c3c",
  },
  pendingItem: {
    borderLeftWidth: 4,
    borderLeftColor: "#f39c12", // Orange for pending
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  date: {
    fontSize: 12,
    color: "#888",
  },
  amount: {
    fontSize: 16,
    fontWeight: "bold",
  },
  incomeText: {
    color: "#27ae60",
  },
  expenseText: {
    color: "#e74c3c",
  },
  pendingText: {
    color: "#f39c12", // Orange for pending
  },
  description: {
    fontSize: 14,
    color: "#333",
    marginBottom: 8,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  leftFooter: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    flexWrap: "wrap",
  },
  category: {
    fontSize: 12,
    color: "#666",
    backgroundColor: "#f0f0f0",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    marginRight: 6,
    marginBottom: 2,
  },
  accountName: {
    fontSize: 11,
    color: "#888",
    backgroundColor: "#f8f8f8",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    marginRight: 6,
    marginBottom: 2,
  },
  leanCategory: {
    fontSize: 10,
    color: "#FFF",
    backgroundColor: "#3498db",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginBottom: 2,
  },
  pendingBadge: {
    backgroundColor: "#fff3e0",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 4,
  },
  pendingBadgeText: {
    color: "#e65100",
    fontSize: 10,
    fontWeight: "bold",
  },
})

// Export with memo for performance optimization
export default memo(TransactionCard)
