"use client"

import type React from "react"
import { Modal, View, Text, StyleSheet, TouchableOpacity, ScrollView } from "react-native"
import { MaterialIcons } from "@expo/vector-icons"
import { useTheme } from "../context/ThemeContext"
import { categorizeTransaction } from "../utils/categorizer"

interface TransactionDetailModalProps {
  visible: boolean
  transaction: any
  onClose: () => void
}

const TransactionDetailModal: React.FC<TransactionDetailModalProps> = ({ visible, transaction, onClose }) => {
  const { isDarkMode } = useTheme()

  if (!transaction) {
    return null
  }

  const amount = transaction.amount ? Number.parseFloat(transaction.amount) : 0
  const isIncome = amount > 0
  const isPending = transaction.pending === true
  const category = categorizeTransaction(transaction, isPending)

  // Format currency with commas
  const formatCurrency = (amount: number, currency = "AED") => {
    return `${Math.abs(amount).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })} ${currency}`
  }

  // Format date and time
  const formatDateTime = (dateString: string) => {
    try {
      const date = new Date(dateString)
      return {
        date: date.toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        }),
        time: date.toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }),
      }
    } catch (error) {
      return { date: "Unknown Date", time: "Unknown Time" }
    }
  }

  const { date, time } = formatDateTime(transaction.timestamp || transaction.date || new Date().toISOString())

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
      income: "#27ae60",
      deposit: "#2196F3",
      other: "#AAAAAA",
    }
    return categoryColors[category.toLowerCase()] || "#AAAAAA"
  }

  // Get category emoji
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
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.container, isDarkMode && { backgroundColor: "#121212" }]}>
        {/* Header */}
        <View style={[styles.header, isDarkMode && { borderBottomColor: "#333" }]}>
          <Text style={[styles.headerTitle, isDarkMode && { color: "#FFF" }]}>Transaction Details</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <MaterialIcons name="close" size={24} color={isDarkMode ? "#FFF" : "#333"} />
          </TouchableOpacity>
        </View>

        {/* Content */}
        <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
          {/* Amount Section */}
          <View
            style={[
              styles.amountSection,
              isPending ? styles.pendingSection : isIncome ? styles.incomeSection : styles.expenseSection,
              isDarkMode && { backgroundColor: "#1E1E1E" },
            ]}
          >
            <Text
              style={[
                styles.amountText,
                isPending ? styles.pendingText : isIncome ? styles.incomeText : styles.expenseText,
              ]}
            >
              {isIncome ? "+" : "-"} {formatCurrency(amount, transaction.currency_code)}
            </Text>
            <Text style={[styles.amountLabel, isDarkMode && { color: "#AAA" }]}>
              {isPending ? "Pending Transaction" : isIncome ? "Income" : "Expense"}
            </Text>
          </View>

          {/* Description */}
          <View style={[styles.section, isDarkMode && { backgroundColor: "#1E1E1E", borderColor: "#333" }]}>
            <Text style={[styles.sectionTitle, isDarkMode && { color: "#FFF" }]}>Description</Text>
            <Text style={[styles.description, isDarkMode && { color: "#DDD" }]}>
              {transaction.lean_description || transaction.description || "No description available"}
            </Text>
            {transaction.lean_description && transaction.description !== transaction.lean_description && (
              <Text style={[styles.originalDescription, isDarkMode && { color: "#888" }]}>
                Original: {transaction.description}
              </Text>
            )}
          </View>

          {/* Category */}
          <View style={[styles.section, isDarkMode && { backgroundColor: "#1E1E1E", borderColor: "#333" }]}>
            <Text style={[styles.sectionTitle, isDarkMode && { color: "#FFF" }]}>Category</Text>
            <View style={styles.categoryContainer}>
              <View style={[styles.categoryBadge, { backgroundColor: getCategoryColor(category) }]}>
                <Text style={styles.categoryText}>
                  {getCategoryEmoji(category)} {category.charAt(0).toUpperCase() + category.slice(1)}
                </Text>
              </View>
              {transaction.lean_category && (
                <View style={styles.leanCategoryInfo}>
                  <Text style={[styles.leanCategoryLabel, isDarkMode && { color: "#3498db" }]}>
                    Lean Category: {transaction.lean_category}
                  </Text>
                  {transaction.lean_category_confidence && (
                    <Text style={[styles.confidenceText, isDarkMode && { color: "#AAA" }]}>
                      Confidence: {(transaction.lean_category_confidence * 100).toFixed(1)}%
                    </Text>
                  )}
                </View>
              )}
            </View>
          </View>

          {/* Date & Time */}
          <View style={[styles.section, isDarkMode && { backgroundColor: "#1E1E1E", borderColor: "#333" }]}>
            <Text style={[styles.sectionTitle, isDarkMode && { color: "#FFF" }]}>Date & Time</Text>
            <View style={styles.dateTimeContainer}>
              <View style={styles.dateTimeItem}>
                <MaterialIcons name="calendar-today" size={20} color={isDarkMode ? "#3498db" : "#666"} />
                <Text style={[styles.dateTimeText, isDarkMode && { color: "#DDD" }]}>{date}</Text>
              </View>
              <View style={styles.dateTimeItem}>
                <MaterialIcons name="access-time" size={20} color={isDarkMode ? "#3498db" : "#666"} />
                <Text style={[styles.dateTimeText, isDarkMode && { color: "#DDD" }]}>{time}</Text>
              </View>
            </View>
          </View>

          {/* Account Details */}
          <View style={[styles.section, isDarkMode && { backgroundColor: "#1E1E1E", borderColor: "#333" }]}>
            <Text style={[styles.sectionTitle, isDarkMode && { color: "#FFF" }]}>Account Details</Text>
            <View style={styles.accountDetails}>
              <View style={styles.accountItem}>
                <MaterialIcons name="account-balance" size={20} color={isDarkMode ? "#3498db" : "#666"} />
                <View style={styles.accountInfo}>
                  <Text style={[styles.accountName, isDarkMode && { color: "#DDD" }]}>
                    {transaction.account_name || "Unknown Account"}
                  </Text>
                  <Text style={[styles.accountType, isDarkMode && { color: "#AAA" }]}>
                    {transaction.account_type || "Unknown Type"}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Transaction ID */}
          <View style={[styles.section, isDarkMode && { backgroundColor: "#1E1E1E", borderColor: "#333" }]}>
            <Text style={[styles.sectionTitle, isDarkMode && { color: "#FFF" }]}>Transaction ID</Text>
            <Text style={[styles.transactionId, isDarkMode && { color: "#888" }]}>
              {transaction.transaction_id || transaction.id || "N/A"}
            </Text>
          </View>

          {/* Status */}
          {isPending && (
            <View
              style={[
                styles.section,
                styles.statusSection,
                isDarkMode && { backgroundColor: "#1E1E1E", borderColor: "#333" },
              ]}
            >
              <View style={styles.statusContainer}>
                <MaterialIcons name="hourglass-empty" size={20} color="#f39c12" />
                <Text style={[styles.statusText, { color: "#f39c12" }]}>
                  This transaction is pending and may still change
                </Text>
              </View>
            </View>
          )}
        </ScrollView>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    paddingTop: 50,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
  },
  closeButton: {
    padding: 8,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  amountSection: {
    alignItems: "center",
    padding: 24,
    borderRadius: 12,
    marginBottom: 20,
  },
  incomeSection: {
    backgroundColor: "#e8f5e8",
  },
  expenseSection: {
    backgroundColor: "#fdeaea",
  },
  pendingSection: {
    backgroundColor: "#fff3e0",
  },
  amountText: {
    fontSize: 32,
    fontWeight: "bold",
    marginBottom: 8,
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
  amountLabel: {
    fontSize: 16,
    color: "#666",
    fontWeight: "500",
  },
  section: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#eee",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    color: "#333",
    lineHeight: 24,
  },
  originalDescription: {
    fontSize: 14,
    color: "#666",
    marginTop: 8,
    fontStyle: "italic",
  },
  categoryContainer: {
    alignItems: "flex-start",
  },
  categoryBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginBottom: 8,
  },
  categoryText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  leanCategoryInfo: {
    marginTop: 8,
  },
  leanCategoryLabel: {
    fontSize: 14,
    color: "#3498db",
    fontWeight: "500",
  },
  confidenceText: {
    fontSize: 12,
    color: "#666",
    marginTop: 2,
  },
  dateTimeContainer: {
    gap: 12,
  },
  dateTimeItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  dateTimeText: {
    fontSize: 16,
    color: "#333",
  },
  accountDetails: {
    gap: 12,
  },
  accountItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  accountInfo: {
    flex: 1,
  },
  accountName: {
    fontSize: 16,
    fontWeight: "500",
    color: "#333",
  },
  accountType: {
    fontSize: 14,
    color: "#666",
    marginTop: 2,
  },
  transactionId: {
    fontSize: 14,
    color: "#666",
    fontFamily: "monospace",
  },
  statusSection: {
    borderColor: "#f39c12",
    borderWidth: 2,
  },
  statusContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  statusText: {
    fontSize: 14,
    fontWeight: "500",
    flex: 1,
  },
})

export default TransactionDetailModal
