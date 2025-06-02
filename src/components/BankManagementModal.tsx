"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Modal, View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from "react-native"
import { MaterialIcons } from "@expo/vector-icons"
import { useTheme } from "../context/ThemeContext"
import { leanEntityService } from "../services/lean-entity-service"
import { removeBankConnection } from "../services/lean-api"
import LeanWebView from "./LeanWebView"

interface EntityInfo {
  entityId: string
  bankName?: string
  userName?: string
  connectedAt: number
  accounts?: any[]
}

interface BankManagementModalProps {
  visible: boolean
  onClose: () => void
  onBanksChanged: () => void
}

const BankManagementModal: React.FC<BankManagementModalProps> = ({ visible, onClose, onBanksChanged }) => {
  const { isDarkMode } = useTheme()
  const [entities, setEntities] = useState<EntityInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [showLeanWebView, setShowLeanWebView] = useState(false)
  const [removingEntityId, setRemovingEntityId] = useState<string | null>(null)

  // Load entities when modal opens
  useEffect(() => {
    if (visible) {
      loadEntities()
    }
  }, [visible])

  const loadEntities = async () => {
    try {
      setLoading(true)
      const allEntities = await leanEntityService.getAllEntities()
      setEntities(allEntities)
    } catch (error) {
      console.error("Error loading entities:", error)
      Alert.alert("Error", "Failed to load bank connections")
    } finally {
      setLoading(false)
    }
  }

  const handleAddBank = () => {
    setShowLeanWebView(true)
  }

  const handleRemoveBank = (entity: EntityInfo) => {
    Alert.alert(
      "Remove Bank Connection",
      `Are you sure you want to remove the connection to ${entity.bankName}?\n\nThis will remove all associated accounts and cached data.`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Remove",
          style: "destructive",
          onPress: () => confirmRemoveBank(entity.entityId),
        },
      ],
    )
  }

  const confirmRemoveBank = async (entityId: string) => {
    try {
      setRemovingEntityId(entityId)

      // Remove the bank connection
      await removeBankConnection(entityId)

      // Reload entities
      await loadEntities()

      // Notify parent component
      onBanksChanged()

      Alert.alert("Success", "Bank connection removed successfully")
    } catch (error) {
      console.error("Error removing bank:", error)
      Alert.alert("Error", "Failed to remove bank connection")
    } finally {
      setRemovingEntityId(null)
    }
  }

  const handleLeanWebViewClose = async (status: string, message?: string, entityId?: string) => {
    setShowLeanWebView(false)

    if (status === "SUCCESS") {
      // Reload entities to show the new connection
      await loadEntities()

      // Notify parent component
      onBanksChanged()

      Alert.alert("Success", message || "Bank account connected successfully!")
    } else if (status === "ERROR") {
      Alert.alert("Error", message || "Error connecting bank account")
    }
    // For CANCELLED, we don't show any alert
  }

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  return (
    <>
      <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
        <View style={[styles.container, isDarkMode && { backgroundColor: "#121212" }]}>
          {/* Header */}
          <View style={[styles.header, isDarkMode && { borderBottomColor: "#333" }]}>
            <Text style={[styles.headerTitle, isDarkMode && { color: "#FFF" }]}>Manage Bank Connections</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <MaterialIcons name="close" size={24} color={isDarkMode ? "#FFF" : "#333"} />
            </TouchableOpacity>
          </View>

          {/* Content */}
          <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
            {/* Add Bank Button */}
            <TouchableOpacity
              style={[styles.addBankButton, isDarkMode && { backgroundColor: "#2C5282" }]}
              onPress={handleAddBank}
            >
              <MaterialIcons name="add" size={24} color="#FFF" />
              <Text style={styles.addBankText}>Connect New Bank</Text>
            </TouchableOpacity>

            {/* Loading State */}
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#3498db" />
                <Text style={[styles.loadingText, isDarkMode && { color: "#AAA" }]}>Loading bank connections...</Text>
              </View>
            ) : entities.length === 0 ? (
              /* Empty State */
              <View style={styles.emptyState}>
                <MaterialIcons name="account-balance" size={64} color={isDarkMode ? "#555" : "#ccc"} />
                <Text style={[styles.emptyTitle, isDarkMode && { color: "#FFF" }]}>No Bank Connections</Text>
                <Text style={[styles.emptySubtitle, isDarkMode && { color: "#AAA" }]}>
                  Connect your first bank account to get started with tracking your finances.
                </Text>
              </View>
            ) : (
              /* Bank List */
              <View style={styles.bankList}>
                <Text style={[styles.sectionTitle, isDarkMode && { color: "#FFF" }]}>
                  Connected Banks ({entities.length})
                </Text>

                {entities.map((entity) => (
                  <View
                    key={entity.entityId}
                    style={[styles.bankItem, isDarkMode && { backgroundColor: "#1E1E1E", borderColor: "#333" }]}
                  >
                    <View style={styles.bankIcon}>
                      <MaterialIcons name="account-balance" size={32} color="#3498db" />
                    </View>

                    <View style={styles.bankDetails}>
                      <Text style={[styles.bankName, isDarkMode && { color: "#FFF" }]}>
                        {entity.bankName || "Unknown Bank"}
                      </Text>
                      <Text style={[styles.userName, isDarkMode && { color: "#AAA" }]}>
                        {entity.userName || "Unknown User"}
                      </Text>
                      <Text style={[styles.connectionDate, isDarkMode && { color: "#666" }]}>
                        Connected: {formatDate(entity.connectedAt)}
                      </Text>
                      {entity.accounts && entity.accounts.length > 0 && (
                        <Text style={[styles.accountCount, isDarkMode && { color: "#3498db" }]}>
                          {entity.accounts.length} account{entity.accounts.length !== 1 ? "s" : ""}
                        </Text>
                      )}
                    </View>

                    <TouchableOpacity
                      style={[
                        styles.removeButton,
                        removingEntityId === entity.entityId && styles.removingButton,
                        isDarkMode && { backgroundColor: "#3A1212" },
                      ]}
                      onPress={() => handleRemoveBank(entity)}
                      disabled={removingEntityId === entity.entityId}
                    >
                      {removingEntityId === entity.entityId ? (
                        <ActivityIndicator size="small" color="#FFF" />
                      ) : (
                        <MaterialIcons name="delete" size={20} color="#FFF" />
                      )}
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </ScrollView>
        </View>
      </Modal>

      {/* Lean WebView for adding new banks */}
      {showLeanWebView && <LeanWebView onClose={handleLeanWebViewClose} />}
    </>
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
    paddingTop: 50, // Account for status bar
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
  addBankButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#3498db",
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  addBankText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
  loadingContainer: {
    alignItems: "center",
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#666",
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  bankList: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginBottom: 16,
  },
  bankItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#eee",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  bankIcon: {
    marginRight: 16,
  },
  bankDetails: {
    flex: 1,
  },
  bankName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  userName: {
    fontSize: 14,
    color: "#666",
    marginBottom: 4,
  },
  connectionDate: {
    fontSize: 12,
    color: "#999",
    marginBottom: 4,
  },
  accountCount: {
    fontSize: 12,
    color: "#3498db",
    fontWeight: "500",
  },
  removeButton: {
    backgroundColor: "#e74c3c",
    padding: 12,
    borderRadius: 8,
    minWidth: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  removingButton: {
    opacity: 0.7,
  },
})

export default BankManagementModal
