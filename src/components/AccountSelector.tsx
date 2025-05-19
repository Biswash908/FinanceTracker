"use client"

import type React from "react"
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from "react-native"
import { useTheme } from "../context/ThemeContext"

interface Account {
  id: string
  name: string
  type: string
  currency: string
  balance?: number
}

interface AccountSelectorProps {
  accounts: Account[]
  selectedAccounts: string[]
  onAccountsChange: (accountIds: string[]) => void
}

const AccountSelector: React.FC<AccountSelectorProps> = ({ accounts, selectedAccounts, onAccountsChange }) => {
  const { isDarkMode } = useTheme()

  // Get account type display name
  const getAccountTypeDisplay = (type: string) => {
    const typeMap = {
      CURRENT: "Current",
      SAVINGS: "Savings",
      CREDIT_CARD: "Credit Card",
      LOAN: "Loan",
      INVESTMENT: "Investment",
      MORTGAGE: "Mortgage",
    }
    return typeMap[type] || type
  }

  // Toggle account selection
  const toggleAccount = (accountId: string) => {
    if (selectedAccounts.includes(accountId)) {
      // If this is the only selected account, don't deselect it
      if (selectedAccounts.length === 1) return

      // Remove the account from selection
      onAccountsChange(selectedAccounts.filter((id) => id !== accountId))
    } else {
      // Add the account to selection
      onAccountsChange([...selectedAccounts, accountId])
    }
  }

  return (
    <View style={[styles.container, isDarkMode && { backgroundColor: "#1E1E1E", borderColor: "#333" }]}>
      <View style={styles.header}>
        <Text style={[styles.title, isDarkMode && { color: "#DDD" }]}>Accounts</Text>
      </View>

      <View style={styles.accountsList}>
        {accounts.length === 0 ? (
          <Text style={styles.noAccountsText}>No accounts found</Text>
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.accountsScrollContent}
          >
            {accounts.map((account) => (
              <TouchableOpacity
                key={account.id}
                style={[
                  styles.accountChip,
                  isDarkMode && { backgroundColor: "#333" },
                  selectedAccounts.includes(account.id) &&
                    (isDarkMode ? { backgroundColor: "#2C5282" } : styles.selectedAccountChip),
                ]}
                onPress={() => toggleAccount(account.id)}
              >
                <Text
                  style={[
                    styles.accountName,
                    isDarkMode && { color: "#DDD" },
                    selectedAccounts.includes(account.id) && styles.selectedAccountText,
                  ]}
                >
                  {account.name}
                </Text>
                <Text
                  style={[
                    styles.accountType,
                    isDarkMode && { color: "#AAA" },
                    selectedAccounts.includes(account.id) && styles.selectedAccountText,
                  ]}
                >
                  {getAccountTypeDisplay(account.type)}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {selectedAccounts.length === 0 && (
          <Text style={[styles.noSelectedText, isDarkMode && { color: "#AAA" }]}>
            No accounts selected. Please select at least one account.
          </Text>
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  accountsList: {
    minHeight: 40,
  },
  accountsScrollContent: {
    paddingBottom: 8,
  },
  accountChip: {
    backgroundColor: "#f5f5f5",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginRight: 8,
    minWidth: 100,
  },
  selectedAccountChip: {
    backgroundColor: "#3498db",
  },
  accountName: {
    fontSize: 14,
    fontWeight: "500",
    color: "#333",
    marginBottom: 2,
  },
  accountType: {
    fontSize: 12,
    color: "#666",
  },
  selectedAccountText: {
    color: "#fff",
  },
  noAccountsText: {
    color: "#666",
    fontStyle: "italic",
    textAlign: "center",
    padding: 10,
  },
  noSelectedText: {
    color: "#666",
    fontStyle: "italic",
    marginTop: 8,
  },
})

export default AccountSelector
