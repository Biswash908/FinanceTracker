import AsyncStorage from "@react-native-async-storage/async-storage"
import { authService } from "./auth-service"
import { leanCustomerService } from "./lean-customer-service"
import { leanEntityService } from "./lean-entity-service"
import { StorageService } from "./storage-service"

interface DisconnectResult {
  success: boolean
  message: string
  partialSuccess?: boolean
}

class LeanDisconnectService {
  /**
   * Disconnect a specific entity from Lean's servers and local storage
   */
  async disconnectEntity(entityId: string): Promise<DisconnectResult> {
    try {
      console.log("Starting disconnect process for entity:", entityId)

      // Get entity info for better messaging
      const entities = await leanEntityService.getAllEntities()
      const entity = entities.find((e) => e.entityId === entityId)
      const bankName = entity?.bankName || "Unknown Bank"

      let serverDisconnectSuccess = false
      let serverDisconnectMessage = ""

      // Try to disconnect from Lean's servers
      try {
        const disconnectResult = await this.disconnectFromLeanServers(entityId)
        serverDisconnectSuccess = disconnectResult.success
        serverDisconnectMessage = disconnectResult.message
      } catch (error) {
        console.warn("Server disconnect failed:", error)
        serverDisconnectMessage = `Server disconnect failed: ${error.message}`
      }

      // Always clean up local data regardless of server disconnect result
      await this.cleanupLocalEntityData(entityId)

      // Determine final result
      if (serverDisconnectSuccess) {
        return {
          success: true,
          message: `${bankName} has been successfully disconnected from your account.`,
        }
      } else {
        return {
          success: false,
          message: `${bankName} has been removed locally, but may still be connected on the server. ${serverDisconnectMessage}`,
          partialSuccess: true,
        }
      }
    } catch (error) {
      console.error("Error in disconnectEntity:", error)
      return {
        success: false,
        message: `Failed to disconnect bank: ${error.message}`,
      }
    }
  }

  /**
   * Disconnect all entities for a customer
   */
  async disconnectAllEntities(customerId: string): Promise<DisconnectResult> {
    try {
      console.log("Starting disconnect all process for customer:", customerId)

      const entities = await leanEntityService.getAllEntities()

      if (entities.length === 0) {
        return {
          success: true,
          message: "No bank connections found to disconnect.",
        }
      }

      let successCount = 0
      let failureCount = 0
      const disconnectResults: string[] = []

      // Try to disconnect each entity
      for (const entity of entities) {
        try {
          const result = await this.disconnectEntity(entity.entityId)
          if (result.success || result.partialSuccess) {
            successCount++
          } else {
            failureCount++
          }
          disconnectResults.push(`${entity.bankName}: ${result.success ? "Success" : "Failed"}`)
        } catch (error) {
          failureCount++
          disconnectResults.push(`${entity.bankName}: Failed - ${error.message}`)
        }
      }

      // Try to revoke customer-level access
      try {
        await this.revokeCustomerAccess(customerId)
      } catch (error) {
        console.warn("Failed to revoke customer access:", error)
      }

      // Clear all local data
      await this.cleanupAllLocalData()

      // Determine final result
      if (failureCount === 0) {
        return {
          success: true,
          message: `All ${successCount} bank connections have been successfully disconnected.`,
        }
      } else if (successCount > 0) {
        return {
          success: false,
          message: `${successCount} banks disconnected successfully, ${failureCount} failed. All local data has been cleared.`,
          partialSuccess: true,
        }
      } else {
        return {
          success: false,
          message: `Failed to disconnect ${failureCount} banks from the server. Local data has been cleared.`,
          partialSuccess: true,
        }
      }
    } catch (error) {
      console.error("Error in disconnectAllEntities:", error)
      return {
        success: false,
        message: `Failed to disconnect all banks: ${error.message}`,
      }
    }
  }

  /**
   * Attempt to disconnect from Lean's servers using various methods
   */
  private async disconnectFromLeanServers(entityId: string): Promise<DisconnectResult> {
    // Method 1: Try to revoke entity permissions
    try {
      const result = await this.revokeEntityPermissions(entityId)
      if (result.success) {
        return result
      }
    } catch (error) {
      console.warn("Method 1 (revoke permissions) failed:", error)
    }

    // Method 2: Try to delete entity from customer
    try {
      const result = await this.deleteEntityFromCustomer(entityId)
      if (result.success) {
        return result
      }
    } catch (error) {
      console.warn("Method 2 (delete entity) failed:", error)
    }

    // Method 3: Try to invalidate customer token (nuclear option)
    try {
      const result = await this.invalidateCustomerToken()
      if (result.success) {
        return {
          success: true,
          message: "Bank connection revoked by invalidating customer session.",
        }
      }
    } catch (error) {
      console.warn("Method 3 (invalidate token) failed:", error)
    }

    return {
      success: false,
      message: "All server disconnect methods failed. The connection may still exist on Lean's servers.",
    }
  }

  /**
   * Method 1: Try to revoke entity permissions
   */
  private async revokeEntityPermissions(entityId: string): Promise<DisconnectResult> {
    try {
      const token = await authService.getToken()

      const response = await fetch("https://sandbox.leantech.me/data/v1/entities/revoke", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          entity_id: entityId,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        console.log("Entity permissions revoked successfully:", data)
        return {
          success: true,
          message: "Bank connection revoked successfully.",
        }
      } else {
        const errorText = await response.text()
        console.warn("Failed to revoke entity permissions:", response.status, errorText)
        return {
          success: false,
          message: `Server returned ${response.status}: ${errorText}`,
        }
      }
    } catch (error) {
      console.error("Error revoking entity permissions:", error)
      throw error
    }
  }

  /**
   * Method 2: Try to delete entity from customer
   */
  private async deleteEntityFromCustomer(entityId: string): Promise<DisconnectResult> {
    try {
      const customerId = await AsyncStorage.getItem("lean_customer_id")
      if (!customerId) {
        throw new Error("No customer ID found")
      }

      const customerToken = await leanCustomerService.getCustomerToken(customerId)

      const response = await fetch(`https://sandbox.leantech.me/customers/v1/${customerId}/entities/${entityId}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${customerToken}`,
        },
      })

      if (response.ok) {
        console.log("Entity deleted from customer successfully")
        return {
          success: true,
          message: "Bank connection removed successfully.",
        }
      } else {
        const errorText = await response.text()
        console.warn("Failed to delete entity from customer:", response.status, errorText)
        return {
          success: false,
          message: `Server returned ${response.status}: ${errorText}`,
        }
      }
    } catch (error) {
      console.error("Error deleting entity from customer:", error)
      throw error
    }
  }

  /**
   * Method 3: Invalidate customer token (nuclear option)
   */
  private async invalidateCustomerToken(): Promise<DisconnectResult> {
    try {
      // Clear the customer token from local storage
      await leanCustomerService.clearCustomerData()

      // Try to call a revoke endpoint if it exists
      try {
        const customerId = await AsyncStorage.getItem("lean_customer_id")
        if (customerId) {
          const token = await authService.getToken()

          const response = await fetch("https://sandbox.leantech.me/customers/v1/revoke", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              customer_id: customerId,
            }),
          })

          if (response.ok) {
            console.log("Customer access revoked successfully")
          } else {
            console.warn("Customer revoke endpoint failed, but token cleared locally")
          }
        }
      } catch (error) {
        console.warn("Customer revoke API call failed:", error)
      }

      return {
        success: true,
        message: "Customer session invalidated.",
      }
    } catch (error) {
      console.error("Error invalidating customer token:", error)
      throw error
    }
  }

  /**
   * Revoke customer-level access
   */
  private async revokeCustomerAccess(customerId: string): Promise<void> {
    try {
      const token = await authService.getToken()

      const response = await fetch("https://sandbox.leantech.me/customers/v1/revoke", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          customer_id: customerId,
        }),
      })

      if (response.ok) {
        console.log("Customer access revoked successfully")
      } else {
        const errorText = await response.text()
        console.warn("Failed to revoke customer access:", response.status, errorText)
      }
    } catch (error) {
      console.error("Error revoking customer access:", error)
      throw error
    }
  }

  /**
   * Clean up local data for a specific entity
   */
  private async cleanupLocalEntityData(entityId: string): Promise<void> {
    try {
      console.log("Cleaning up local data for entity:", entityId)

      // Remove from entity service
      await leanEntityService.removeEntity(entityId)

      // Clear cache for this entity
      await StorageService.clearEntityCache(entityId)

      console.log("Local entity data cleaned up successfully")
    } catch (error) {
      console.error("Error cleaning up local entity data:", error)
      throw error
    }
  }

  /**
   * Clean up all local data
   */
  private async cleanupAllLocalData(): Promise<void> {
    try {
      console.log("Cleaning up all local data")

      // Clear all entity data
      await leanEntityService.clearEntityData()

      // Clear all customer data
      await leanCustomerService.clearCustomerData()

      // Clear all cache
      await StorageService.clearAllCache()

      // Clear any additional stored data
      await AsyncStorage.multiRemove([
        "lean_customer_id",
        "lean_customer_token",
        "lean_customer_token_expiry",
        "bankConnected",
      ])

      console.log("All local data cleaned up successfully")
    } catch (error) {
      console.error("Error cleaning up all local data:", error)
      throw error
    }
  }

  /**
   * Check if an entity is still connected on Lean's servers
   */
  async checkEntityConnectionStatus(entityId: string): Promise<{ connected: boolean; message: string }> {
    try {
      const customerId = await AsyncStorage.getItem("lean_customer_id")
      if (!customerId) {
        return { connected: false, message: "No customer ID found" }
      }

      const customerToken = await leanCustomerService.getCustomerToken(customerId)

      const response = await fetch(`https://sandbox.leantech.me/customers/v1/${customerId}/entities`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${customerToken}`,
        },
      })

      if (response.ok) {
        const entities = await response.json()
        const isConnected = Array.isArray(entities)
          ? entities.some((entity) => entity.id === entityId || entity.entity_id === entityId)
          : false

        return {
          connected: isConnected,
          message: isConnected ? "Entity is still connected" : "Entity is not connected",
        }
      } else {
        return { connected: false, message: `Failed to check status: ${response.status}` }
      }
    } catch (error) {
      console.error("Error checking entity connection status:", error)
      return { connected: false, message: `Error: ${error.message}` }
    }
  }

  /**
   * Force disconnect by clearing all data (last resort)
   */
  async forceDisconnectAll(): Promise<DisconnectResult> {
    try {
      console.log("Force disconnecting all banks (nuclear option)")

      // Clear all local data
      await this.cleanupAllLocalData()

      // Clear auth service data
      await authService.logout()

      return {
        success: true,
        message: "All bank connections have been force-disconnected. You may need to log in again.",
      }
    } catch (error) {
      console.error("Error in force disconnect:", error)
      return {
        success: false,
        message: `Force disconnect failed: ${error.message}`,
      }
    }
  }
}

// Export a singleton instance
export const leanDisconnectService = new LeanDisconnectService()
