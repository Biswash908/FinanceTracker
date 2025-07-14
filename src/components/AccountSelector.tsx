"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from "react-native"
import { useTheme } from "../context/ThemeContext"
import { MaterialIcons } from "@expo/vector-icons"
import LoadingSpinner from "./LoadingSpinner"

interface Account {
  id: string
  name: string
  type: string
  balance?: number
  currency_code?: string
  entityId?: string
  bankName?: string
  userName?: string
}

interface AccountSelectorProps {
  accounts: Account[]
  selectedAccounts: string[]
  onAccountsChange: (accountIds: string[]) => void
  loading?: boolean
}

const AccountSelector: React.FC<AccountSelectorProps> = ({
  accounts,
  selectedAccounts,
  onAccountsChange,
  loading = false,
}) => {
  const { isDarkMode } = useTheme()
  const [expanded, setExpanded] = useState(true)
  const [hasInitialized, setHasInitialized] = useState(false)
  const [lastFetchTime, setLastFetchTime] = useState<number | null>(null)
  const accountsRef = useRef<Account[]>([])

  // Smart loading logic - only show loading if we haven't initialized or accounts are actually changing
  useEffect(() => {
    const now = Date.now()
    const shouldRefresh = !hasInitialized || !lastFetchTime || now - lastFetchTime > 5 * 60 * 1000 // 5 minutes

    // If we have accounts and don't need to refresh, don't show loading
    if (!shouldRefresh && accounts.length > 0 && accountsRef.current.length > 0) {
      return
    }

    // If loading prop is false and we have accounts, mark as initialized
    if (!loading && accounts.length > 0) {
      setHasInitialized(true)
      setLastFetchTime(now)
      accountsRef.current = accounts
    }
  }, [loading, accounts, hasInitialized, lastFetchTime])

  // Group accounts by bank/entity
  const accountsByBank = accounts.reduce(
    (groups, account) => {
      const bankKey = account.entityId || "unknown"
      const bankName = account.bankName || "Unknown Bank"

      if (!groups[bankKey]) {
        groups[bankKey] = {
          bankName,
          userName: account.userName || "Unknown User",
          accounts: [],
        }
      }

      groups[bankKey].accounts.push(account)
      return groups
    },
    {} as Record<string, { bankName: string; userName: string; accounts: Account[] }>,
  )

  const handleAccountToggle = (accountId: string) => {
    const newSelection = selectedAccounts.includes(accountId)
      ? selectedAccounts.filter((id) => id !== accountId)
      : [...selectedAccounts, accountId]

    onAccountsChange(newSelection)
  }

  const handleSelectAll = () => {
    if (selectedAccounts.length === accounts.length) {
      // Deselect all
      onAccountsChange([])
    } else {
      // Select all
      onAccountsChange(accounts.map((acc) => acc.id))
    }
  }

  const formatBalance = (balance: number | undefined, currency = "AED") => {
    if (balance === undefined || balance === null) return "N/A"
    return `${balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`
  }

  const isAllSelected = selectedAccounts.length === accounts.length && accounts.length > 0
  const isPartiallySelected = selectedAccounts.length > 0 && selectedAccounts.length < accounts.length

  // Show loading only if we haven't initialized and are actually loading
  const shouldShowLoading = loading && (!hasInitialized || accounts.length === 0)

  return (
    <View style={[styles.container, isDarkMode && { backgroundColor: "#1E1E1E", borderColor: "#333" }]}>
      <TouchableOpacity style={styles.header} onPress={() => setExpanded(!expanded)}>
        <View style={styles.headerLeft}>
          <Text style={[styles.title, isDarkMode && { color: "#FFF" }]}>
            Bank Accounts {!shouldShowLoading && `(${accounts.length})`}
          </Text>
          {!shouldShowLoading && (
            <Text style={[styles.subtitle, isDarkMode && { color: "#AAA" }]}>{selectedAccounts.length} selected</Text>
          )}
        </View>

        <View style={styles.headerRight}>
          <MaterialIcons
            name={expanded ? "expand-less" : "expand-more"}
            size={24}
            color={isDarkMode ? "#FFF" : "#333"}
            style={styles.expandIcon}
          />
        </View>
      </TouchableOpacity>

      {expanded && (
        <View style={styles.content}>
          {shouldShowLoading ? (
            <LoadingSpinner
              size="large"
              message="Loading bank accounts..."
              isDarkMode={isDarkMode}
              style={styles.loadingContainer}
            />
          ) : accounts.length === 0 ? (
            <View style={styles.emptyState}>
              <MaterialIcons name="account-balance" size={48} color={isDarkMode ? "#555" : "#ccc"} />
              <Text style={[styles.emptyText, isDarkMode && { color: "#AAA" }]}>No bank accounts connected</Text>
              <Text style={[styles.emptySubtext, isDarkMode && { color: "#777" }]}>
                Connect your first bank account in Settings
              </Text>
            </View>
          ) : (
            <>
              {/* Select All Button */}
              <TouchableOpacity
                style={[styles.selectAllButton, isDarkMode && { backgroundColor: "#2A2A2A" }]}
                onPress={handleSelectAll}
              >
                <MaterialIcons
                  name={
                    isAllSelected
                      ? "check-box"
                      : isPartiallySelected
                        ? "indeterminate-check-box"
                        : "check-box-outline-blank"
                  }
                  size={20}
                  color={isAllSelected || isPartiallySelected ? "#3498db" : isDarkMode ? "#666" : "#999"}
                />
                <Text style={[styles.selectAllText, isDarkMode && { color: "#DDD" }]}>
                  {isAllSelected ? "Deselect All" : "Select All"}
                </Text>
              </TouchableOpacity>

              {/* Accounts grouped by bank */}
              <ScrollView style={styles.accountsList} nestedScrollEnabled={true}>
                {Object.entries(accountsByBank).map(([bankKey, bankGroup]) => (
                  <View key={bankKey} style={styles.bankGroup}>
                    <View style={[styles.bankHeader, isDarkMode && { backgroundColor: "#2A2A2A" }]}>
                      <MaterialIcons name="account-balance" size={20} color={isDarkMode ? "#3498db" : "#2c3e50"} />
                      <View style={styles.bankInfo}>
                        <Text style={[styles.bankName, isDarkMode && { color: "#FFF" }]}>{bankGroup.bankName}</Text>
                        <Text style={[styles.userName, isDarkMode && { color: "#AAA" }]}>{bankGroup.userName}</Text>
                      </View>
                      <Text style={[styles.accountCount, isDarkMode && { color: "#666" }]}>
                        {bankGroup.accounts.length} account{bankGroup.accounts.length !== 1 ? "s" : ""}
                      </Text>
                    </View>

                    {bankGroup.accounts.map((account) => (
                      <TouchableOpacity
                        key={account.id}
                        style={[
                          styles.accountItem,
                          selectedAccounts.includes(account.id) && styles.selectedAccount,
                          isDarkMode && { backgroundColor: "#2A2A2A" },
                          selectedAccounts.includes(account.id) && isDarkMode && { backgroundColor: "#1a365d" },
                        ]}
                        onPress={() => handleAccountToggle(account.id)}
                      >
                        <MaterialIcons
                          name={selectedAccounts.includes(account.id) ? "check-circle" : "radio-button-unchecked"}
                          size={20}
                          color={selectedAccounts.includes(account.id) ? "#3498db" : isDarkMode ? "#666" : "#999"}
                        />

                        <View style={styles.accountDetails}>
                          <View style={styles.accountMainInfo}>
                            <Text style={[styles.accountName, isDarkMode && { color: "#FFF" }]}>
                              {account.name || `Account ${account.id.slice(-4)}`}
                            </Text>
                            <Text style={[styles.accountType, isDarkMode && { color: "#AAA" }]}>
                              {account.type || "Unknown Type"}
                            </Text>
                          </View>

                          {account.balance !== undefined && (
                            <Text style={[styles.accountBalance, isDarkMode && { color: "#4CAF50" }]}>
                              {formatBalance(account.balance, account.currency_code)}
                            </Text>
                          )}
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                ))}
              </ScrollView>
            </>
          )}
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
    flex: 1,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  subtitle: {
    fontSize: 14,
    color: "#666",
    marginTop: 2,
  },
  expandIcon: {
    marginLeft: 8,
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  loadingContainer: {
    paddingVertical: 40,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 32,
  },
  emptyText: {
    fontSize: 16,
    color: "#666",
    marginTop: 12,
    fontWeight: "500",
  },
  emptySubtext: {
    fontSize: 14,
    color: "#999",
    marginTop: 4,
    textAlign: "center",
  },
  selectAllButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    backgroundColor: "#f8f9fa",
    borderRadius: 8,
    marginBottom: 12,
  },
  selectAllText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#333",
    marginLeft: 8,
  },
  accountsList: {
    maxHeight: 300,
  },
  bankGroup: {
    marginBottom: 16,
  },
  bankHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    backgroundColor: "#f8f9fa",
    borderRadius: 8,
    marginBottom: 8,
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
  accountItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    backgroundColor: "#fff",
    borderRadius: 8,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: "#eee",
  },
  selectedAccount: {
    backgroundColor: "#e3f2fd",
    borderColor: "#3498db",
  },
  accountDetails: {
    flex: 1,
    marginLeft: 12,
  },
  accountMainInfo: {
    flex: 1,
  },
  accountName: {
    fontSize: 14,
    fontWeight: "500",
    color: "#333",
  },
  accountType: {
    fontSize: 12,
    color: "#666",
    marginTop: 2,
  },
  accountBalance: {
    fontSize: 14,
    fontWeight: "600",
    color: "#27ae60",
    marginTop: 4,
  },
})

export default AccountSelector
