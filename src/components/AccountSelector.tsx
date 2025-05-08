"use client"

import type React from "react"
import { useState } from "react"
import { View, Text, StyleSheet, TouchableOpacity, Modal, FlatList, Switch } from "react-native"

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
  const [showModal, setShowModal] = useState(false)
  const [tempSelectedAccounts, setTempSelectedAccounts] = useState<string[]>(selectedAccounts)

  // Format currency
  const formatCurrency = (amount, currency = "AED") => {
    return `${Math.abs(amount || 0).toFixed(2)} ${currency}`
  }

  // Toggle account selection
  const toggleAccount = (accountId: string) => {
    setTempSelectedAccounts((prev) => {
      if (prev.includes(accountId)) {
        return prev.filter((id) => id !== accountId)
      } else {
        return [...prev, accountId]
      }
    })
  }

  // Toggle all accounts
  const toggleAllAccounts = () => {
    if (tempSelectedAccounts.length === accounts.length) {
      setTempSelectedAccounts([])
    } else {
      setTempSelectedAccounts(accounts.map((account) => account.id))
    }
  }

  // Apply selection
  const applySelection = () => {
    onAccountsChange(tempSelectedAccounts)
    setShowModal(false)
  }

  // Cancel selection
  const cancelSelection = () => {
    setTempSelectedAccounts(selectedAccounts)
    setShowModal(false)
  }

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

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Accounts</Text>
        <TouchableOpacity style={styles.selectButton} onPress={() => setShowModal(true)}>
          <Text style={styles.selectButtonText}>
            {selectedAccounts.length === accounts.length ? "All Accounts" : `${selectedAccounts.length} Selected`}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.accountsList}>
        {accounts.length === 0 ? (
          <Text style={styles.noAccountsText}>No accounts found</Text>
        ) : (
          <FlatList
            data={accounts.filter((account) => selectedAccounts.includes(account.id))}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <View style={styles.accountChip}>
                <Text style={styles.accountName}>{item.name}</Text>
                <Text style={styles.accountType}>{getAccountTypeDisplay(item.type)}</Text>
              </View>
            )}
            ListEmptyComponent={
              <Text style={styles.noSelectedText}>No accounts selected. Tap "Select" to choose accounts.</Text>
            }
          />
        )}
      </View>

      {/* Account Selection Modal */}
      <Modal visible={showModal} transparent={true} animationType="slide" onRequestClose={cancelSelection}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Accounts</Text>
              <TouchableOpacity onPress={cancelSelection}>
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.selectAllContainer}>
              <Text style={styles.selectAllText}>Select All Accounts</Text>
              <Switch
                value={tempSelectedAccounts.length === accounts.length}
                onValueChange={toggleAllAccounts}
                trackColor={{ false: "#767577", true: "#81b0ff" }}
                thumbColor={tempSelectedAccounts.length === accounts.length ? "#3498db" : "#f4f3f4"}
              />
            </View>

            <FlatList
              data={accounts}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.accountItem} onPress={() => toggleAccount(item.id)} activeOpacity={0.7}>
                  <View style={styles.accountInfo}>
                    <Text style={styles.accountItemName}>{item.name}</Text>
                    <Text style={styles.accountItemType}>{getAccountTypeDisplay(item.type)}</Text>
                    {item.balance !== undefined && (
                      <Text style={styles.accountItemBalance}>{formatCurrency(item.balance, item.currency)}</Text>
                    )}
                  </View>
                  <View style={[styles.checkbox, tempSelectedAccounts.includes(item.id) && styles.checkboxSelected]}>
                    {tempSelectedAccounts.includes(item.id) && <Text style={styles.checkmark}>✓</Text>}
                  </View>
                </TouchableOpacity>
              )}
              ListEmptyComponent={<Text style={styles.noAccountsText}>No accounts available</Text>}
            />

            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.cancelButton} onPress={cancelSelection}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.applyButton, tempSelectedAccounts.length === 0 && styles.disabledButton]}
                onPress={applySelection}
                disabled={tempSelectedAccounts.length === 0}
              >
                <Text style={styles.applyButtonText}>Apply</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  selectButton: {
    backgroundColor: "#f0f0f0",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  selectButtonText: {
    fontSize: 14,
    color: "#3498db",
    fontWeight: "500",
  },
  accountsList: {
    minHeight: 40,
  },
  accountChip: {
    backgroundColor: "#f5f5f5",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginRight: 8,
    minWidth: 100,
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
  noAccountsText: {
    color: "#666",
    fontStyle: "italic",
    textAlign: "center",
    padding: 10,
  },
  noSelectedText: {
    color: "#666",
    fontStyle: "italic",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: 20,
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  closeButton: {
    fontSize: 20,
    color: "#999",
    padding: 4,
  },
  selectAllContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  selectAllText: {
    fontSize: 16,
    color: "#333",
  },
  accountItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  accountInfo: {
    flex: 1,
  },
  accountItemName: {
    fontSize: 16,
    fontWeight: "500",
    color: "#333",
    marginBottom: 2,
  },
  accountItemType: {
    fontSize: 14,
    color: "#666",
    marginBottom: 2,
  },
  accountItemBalance: {
    fontSize: 14,
    color: "#3498db",
    fontWeight: "500",
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#ccc",
    justifyContent: "center",
    alignItems: "center",
  },
  checkboxSelected: {
    backgroundColor: "#3498db",
    borderColor: "#3498db",
  },
  checkmark: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "bold",
  },
  modalFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
  cancelButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ccc",
  },
  cancelButtonText: {
    color: "#666",
    fontSize: 16,
  },
  applyButton: {
    backgroundColor: "#3498db",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  disabledButton: {
    backgroundColor: "#ccc",
  },
  applyButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "500",
  },
})

export default AccountSelector
