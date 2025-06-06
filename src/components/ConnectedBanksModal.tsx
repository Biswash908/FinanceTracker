"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Modal, View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from "react-native"
import { MaterialIcons } from "@expo/vector-icons"
import { useTheme } from "../context/ThemeContext"
import { leanEntityService } from "../services/lean-entity-service"
import { removeBankConnection } from "../services/lean-api"

interface EntityInfo {
  entityId: string
  bankName?: string
  userName?: string
  connectedAt: number
  accounts?: any[]
}

interface ConnectedBanksModalProps {
  visible: boolean
  onClose: () => void
  onBanksChanged: () => void
}

const ConnectedBanksModal: React.FC<ConnectedBanksModalProps> = ({ visible, onClose, onBanksChanged }) => {
  const { isDarkMode } = useTheme()
  const [entities, setEntities] = useState<EntityInfo[]>([])
  const [loading, setLoading] = useState(true)
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

  const handleRemoveBank = (entity: EntityInfo) => {
    Alert.alert(
      "Disconnect Bank",
      `Are you sure you want to disconnect ${entity.bankName || "this bank"}?\n\nThis will remove all associated accounts and transaction data.`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Disconnect",
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

      Alert.alert("Success", "Bank disconnected successfully")
    } catch (error) {
      console.error("Error removing bank:", error)
      Alert.alert("Error", "Failed to disconnect bank")
    } finally {
      setRemovingEntityId(null)
    }
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
    <Modal visible={visible} transparent={true} animationType="fade" onRequestClose={onClose}>
      {/* Blur Background */}
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backgroundTouchable} activeOpacity={1} onPress={onClose}>
          <View style={[styles.blurBackground, isDarkMode && { backgroundColor: "rgba(0,0,0,0.7)" }]} />
        </TouchableOpacity>

        {/* Modal Content */}
        <View style={styles.modalContainer}>
          <View style={[styles.modalContent, isDarkMode && { backgroundColor: "#1E1E1E", borderColor: "#333" }]}>
            {/* Header */}
            <View style={[styles.header, isDarkMode && { borderBottomColor: "#333" }]}>
              <Text style={[styles.headerTitle, isDarkMode && { color: "#FFF" }]}>Connected Banks</Text>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <MaterialIcons name="close" size={24} color={isDarkMode ? "#FFF" : "#333"} />
              </TouchableOpacity>
            </View>

            {/* Content */}
            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
              {loading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color="#3498db" />
                  <Text style={[styles.loadingText, isDarkMode && { color: "#AAA" }]}>Loading banks...</Text>
                </View>
              ) : entities.length === 0 ? (
                <View style={styles.emptyState}>
                  <MaterialIcons name="account-balance" size={64} color={isDarkMode ? "#555" : "#ccc"} />
                  <Text style={[styles.emptyTitle, isDarkMode && { color: "#FFF" }]}>No Banks Connected</Text>
                  <Text style={[styles.emptySubtitle, isDarkMode && { color: "#AAA" }]}>
                    You haven't connected any bank accounts yet.
                  </Text>
                </View>
              ) : (
                <View style={styles.bankList}>
                  {entities.map((entity) => (
                    <View
                      key={entity.entityId}
                      style={[styles.bankItem, isDarkMode && { backgroundColor: "#2A2A2A", borderColor: "#444" }]}
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
                          styles.disconnectButton,
                          removingEntityId === entity.entityId && styles.removingButton,
                          isDarkMode && { backgroundColor: "#8B0000" },
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
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  backgroundTouchable: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  blurBackground: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.9)",
  },
  modalContainer: {
    width: "90%",
    maxWidth: 400,
    maxHeight: "80%",
    zIndex: 1,
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 20,
    borderWidth: 1,
    borderColor: "#eee",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
  },
  closeButton: {
    padding: 4,
  },
  content: {
    maxHeight: 400,
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
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    lineHeight: 20,
  },
  bankList: {
    padding: 16,
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
  disconnectButton: {
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

export default ConnectedBanksModal
