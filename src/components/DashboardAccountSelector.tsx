"use client"

import type React from "react"
import { useState } from "react"
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from "react-native"
import { MaterialIcons } from "@expo/vector-icons"
import { useTheme } from "../context/ThemeContext"

interface DashboardAccountSelectorProps {
  accounts: any[]
  selectedAccounts: string[]
  onAccountsChange: (accountIds: string[]) => void
}

const DashboardAccountSelector: React.FC<DashboardAccountSelectorProps> = ({
  accounts,
  selectedAccounts,
  onAccountsChange,
}) => {
  const { isDarkMode } = useTheme()
  const [expanded, setExpanded] = useState(false)

  // Group accounts by bank
  const accountsByBank = accounts.reduce(
    (groups, account) => {
      const bankKey = account.entityId || "unknown"
      const bankName = account.bankName || "Unknown Bank"
      const userName = account.userName || "Unknown User"

      if (!groups[bankKey]) {
        groups[bankKey] = {
          bankName,
          userName,
          accounts: [],
        }
      }

      groups[bankKey].accounts.push(account)
      return groups
    },
    {} as Record<string, { bankName: string; userName: string; accounts: any[] }>,
  )

  const handleAccountToggle = (accountId: string) => {
    const isSelected = selectedAccounts.includes(accountId)
    let newSelection: string[]

    if (isSelected) {
      // Remove account
      newSelection = selectedAccounts.filter((id) => id !== accountId)
    } else {
      // Add account
      newSelection = [...selectedAccounts, accountId]
    }

    // Ensure at least one account is always selected
    if (newSelection.length === 0 && accounts.length > 0) {
      newSelection = [accounts[0].id]
    }

    onAccountsChange(newSelection)
  }

  const handleSelectAll = () => {
    onAccountsChange(accounts.map((acc) => acc.id))
  }

  const handleSelectNone = () => {
    // Keep at least one account selected
    if (accounts.length > 0) {
      onAccountsChange([accounts[0].id])
    }
  }

  const getSelectedAccountsText = () => {
    if (selectedAccounts.length === accounts.length) {
      return "All Accounts"
    } else if (selectedAccounts.length === 1) {
      const account = accounts.find((acc) => acc.id === selectedAccounts[0])
      return account ? `${account.bankName} - ${account.name}` : "1 Account"
    } else {
      return `${selectedAccounts.length} Accounts Selected`
    }
  }

  const formatBalance = (balance: number | undefined, currency = "AED") => {
    if (balance === undefined || balance === null) return ""
    return `${balance.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })} ${currency}`
  }

  return (
    <View style={[styles.container, isDarkMode && { backgroundColor: "#1E1E1E", borderColor: "#333" }]}>
      {/* Header */}
      <TouchableOpacity style={styles.header} onPress={() => setExpanded(!expanded)} activeOpacity={0.7}>
        <View style={styles.headerLeft}>
          <MaterialIcons name="account-balance" size={20} color={isDarkMode ? "#3498db" : "#3498db"} />
          <View style={styles.headerText}>
            <Text style={[styles.title, isDarkMode && { color: "#FFF" }]}>Selected Accounts</Text>
            <Text style={[styles.subtitle, isDarkMode && { color: "#AAA" }]}>{getSelectedAccountsText()}</Text>
          </View>
        </View>
        <MaterialIcons name={expanded ? "expand-less" : "expand-more"} size={24} color={isDarkMode ? "#DDD" : "#666"} />
      </TouchableOpacity>

      {/* Expandable Content */}
      {expanded && (
        <View style={styles.content}>
          {/* Quick Actions */}
          <View style={styles.quickActions}>

          </View>

          {/* Banks and Accounts */}
          <ScrollView style={styles.banksList} nestedScrollEnabled={true}>
            {Object.entries(accountsByBank).map(([bankKey, bankGroup]) => (
              <View key={bankKey} style={styles.bankSection}>
                {/* Bank Header */}
                <View style={[styles.bankHeader, isDarkMode && { backgroundColor: "#2A2A2A" }]}>
                  <MaterialIcons name="account-balance" size={18} color={isDarkMode ? "#3498db" : "#2c3e50"} />
                  <View style={styles.bankInfo}>
                    <Text style={[styles.bankName, isDarkMode && { color: "#FFF" }]}>{bankGroup.bankName}</Text>
                    <Text style={[styles.userName, isDarkMode && { color: "#AAA" }]}>{bankGroup.userName}</Text>
                  </View>
                  <Text style={[styles.accountCount, isDarkMode && { color: "#666" }]}>
                    {bankGroup.accounts.length} account{bankGroup.accounts.length !== 1 ? "s" : ""}
                  </Text>
                </View>

                {/* Horizontal Scrollable Accounts */}
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.accountsScrollView}
                  contentContainerStyle={styles.accountsContainer}
                >
                  {bankGroup.accounts.map((account) => {
                    const isSelected = selectedAccounts.includes(account.id)
                    return (
                      <TouchableOpacity
                        key={account.id}
                        style={[
                          styles.accountBox,
                          isSelected && styles.selectedAccountBox,
                          isDarkMode && { backgroundColor: "#2A2A2A", borderColor: "#444" },
                          isSelected && isDarkMode && { backgroundColor: "#2C5282", borderColor: "#3498db" },
                        ]}
                        onPress={() => handleAccountToggle(account.id)}
                      >
                        {/* Selection Indicator */}
                        <View style={styles.selectionIndicator}>
                          {isSelected && (
                            <MaterialIcons name="check-circle" size={16} color={isDarkMode ? "#FFF" : "#FFF"} />
                          )}
                        </View>

                        {/* Account Info */}
                        <View style={styles.accountInfo}>
                          <Text
                            style={[
                              styles.accountName,
                              isDarkMode && { color: "#DDD" },
                              isSelected && { color: "#FFF" },
                            ]}
                            numberOfLines={1}
                            ellipsizeMode="tail"
                          >
                            {account.name || `Account ${account.id.slice(-4)}`}
                          </Text>
                          <Text
                            style={[
                              styles.accountType,
                              isDarkMode && { color: "#AAA" },
                              isSelected && { color: "#E0E0E0" },
                            ]}
                            numberOfLines={1}
                          >
                            {account.type || "Unknown"}
                          </Text>
                          {account.balance !== undefined && (
                            <Text
                              style={[
                                styles.accountBalance,
                                isDarkMode && { color: "#4CAF50" },
                                isSelected && { color: "#E8F5E8" },
                              ]}
                              numberOfLines={1}
                            >
                              {formatBalance(account.balance, account.currency_code)}
                            </Text>
                          )}
                        </View>
                      </TouchableOpacity>
                    )
                  })}
                </ScrollView>
              </View>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#fff",
    borderRadius: 12,
    marginBottom: 16,
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
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  headerText: {
    marginLeft: 12,
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  subtitle: {
    fontSize: 14,
    color: "#666",
    marginTop: 2,
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  quickActions: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
  },
  quickActionButton: {
    flex: 1,
    backgroundColor: "#f0f0f0",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  quickActionText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#3498db",
  },
  banksList: {
    maxHeight: 300,
  },
  bankSection: {
    marginBottom: 20,
  },
  bankHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    backgroundColor: "#f8f9fa",
    borderRadius: 8,
    marginBottom: 12,
  },
  bankInfo: {
    flex: 1,
    marginLeft: 12,
  },
  bankName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  userName: {
    fontSize: 12,
    color: "#666",
    marginTop: 2,
  },
  accountCount: {
    fontSize: 12,
    color: "#999",
  },
  accountsScrollView: {
    flexDirection: "row",
  },
  accountsContainer: {
    paddingRight: 16,
  },
  accountBox: {
    width: 140,
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    marginRight: 12,
    borderWidth: 2,
    borderColor: "#eee",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  selectedAccountBox: {
    backgroundColor: "#3498db",
    borderColor: "#3498db",
  },
  selectionIndicator: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  accountInfo: {
    flex: 1,
    paddingTop: 4,
  },
  accountName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  accountType: {
    fontSize: 12,
    color: "#666",
    marginBottom: 4,
  },
  accountBalance: {
    fontSize: 11,
    fontWeight: "500",
    color: "#27ae60",
  },
})

export default DashboardAccountSelector
