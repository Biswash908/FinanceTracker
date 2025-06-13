"use client"

import type React from "react"
import { useState } from "react"
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from "react-native"
import { MaterialIcons } from "@expo/vector-icons"
import { useTheme } from "../context/ThemeContext"
import TransactionCard from "./TransactionCard"
import TransactionDetailModal from "./TransactionDetailModal"
import { categorizeTransaction } from "../utils/categorizer"

interface DashboardTransactionListProps {
  transactions: any[]
  loading: boolean
  onViewAll: () => void
}

const DashboardTransactionList: React.FC<DashboardTransactionListProps> = ({ transactions, loading, onViewAll }) => {
  const { isDarkMode } = useTheme()
  const [selectedTransaction, setSelectedTransaction] = useState(null)
  const [transactionDetailVisible, setTransactionDetailVisible] = useState(false)

  // Group transactions by date
  const groupedTransactions = transactions.reduce((groups, transaction) => {
    const date = new Date(transaction.timestamp || transaction.date)
    const dateString = date.toISOString().split("T")[0]

    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    const todayString = today.toISOString().split("T")[0]
    const yesterdayString = yesterday.toISOString().split("T")[0]

    let groupName = dateString
    if (dateString === todayString) {
      groupName = "Today"
    } else if (dateString === yesterdayString) {
      groupName = "Yesterday"
    } else {
      // Format as readable date
      groupName = date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: date.getFullYear() !== today.getFullYear() ? "numeric" : undefined,
      })
    }

    if (!groups[groupName]) {
      groups[groupName] = []
    }

    groups[groupName].push(transaction)
    return groups
  }, {})

  // Handle transaction press
  const handleTransactionPress = (transaction: any) => {
    setSelectedTransaction(transaction)
    setTransactionDetailVisible(true)
  }

  // Handle transaction detail modal close
  const handleTransactionDetailClose = () => {
    setTransactionDetailVisible(false)
    setSelectedTransaction(null)
  }

  return (
    <View style={[styles.container, isDarkMode && { backgroundColor: "#1E1E1E", borderColor: "#333" }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, isDarkMode && { color: "#FFF" }]}>Recent Transactions</Text>
        <TouchableOpacity style={styles.viewAllButton} onPress={onViewAll}>
          <Text style={[styles.viewAllText, isDarkMode && { color: "#3498db" }]}>View All</Text>
          <MaterialIcons name="arrow-forward" size={16} color={isDarkMode ? "#3498db" : "#3498db"} />
        </TouchableOpacity>
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3498db" />
          <Text style={[styles.loadingText, isDarkMode && { color: "#AAA" }]}>Loading transactions...</Text>
        </View>
      ) : Object.keys(groupedTransactions).length > 0 ? (
        <View style={styles.transactionsList}>
          {Object.entries(groupedTransactions).map(([date, dateTransactions]) => (
            <View key={date} style={styles.dateGroup}>
              <Text style={[styles.dateHeader, isDarkMode && { color: "#AAA" }]}>{date}</Text>
              {dateTransactions.slice(0, 5).map((transaction) => (
                <TransactionCard
                  key={transaction.id}
                  transaction={transaction}
                  category={categorizeTransaction(transaction, transaction.pending)}
                  isPending={transaction.pending === true}
                  onPress={() => handleTransactionPress(transaction)}
                />
              ))}
              {dateTransactions.length > 5 && (
                <Text style={[styles.moreText, isDarkMode && { color: "#666" }]}>
                  +{dateTransactions.length - 5} more transactions
                </Text>
              )}
            </View>
          ))}
        </View>
      ) : (
        <View style={styles.emptyContainer}>
          <MaterialIcons name="receipt-long" size={48} color={isDarkMode ? "#555" : "#ccc"} />
          <Text style={[styles.emptyText, isDarkMode && { color: "#AAA" }]}>
            No transactions found for the selected period.
          </Text>
        </View>
      )}

      {/* Transaction Detail Modal */}
      <TransactionDetailModal
        visible={transactionDetailVisible}
        transaction={selectedTransaction}
        onClose={handleTransactionDetailClose}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#fff",
    borderRadius: 12,
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: "#eee",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  viewAllButton: {
    flexDirection: "row",
    alignItems: "center",
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#3498db",
    marginRight: 4,
  },
  loadingContainer: {
    padding: 32,
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#666",
  },
  transactionsList: {
    maxHeight: 400,
  },
  dateGroup: {
    marginBottom: 16,
  },
  dateHeader: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
    marginBottom: 8,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  moreText: {
    fontSize: 12,
    color: "#999",
    textAlign: "center",
    paddingVertical: 8,
    fontStyle: "italic",
  },
  emptyContainer: {
    padding: 32,
    alignItems: "center",
  },
  emptyText: {
    textAlign: "center",
    fontSize: 16,
    color: "#666",
    lineHeight: 24,
    marginTop: 12,
  },
})

export default DashboardTransactionList
