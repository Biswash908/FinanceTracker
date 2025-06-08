import AsyncStorage from "@react-native-async-storage/async-storage"

const SELECTED_ACCOUNTS_KEY = "selected_accounts"

export class AccountPersistenceService {
  /**
   * Save selected account IDs to persistent storage
   */
  static async saveSelectedAccounts(accountIds: string[]): Promise<void> {
    try {
      await AsyncStorage.setItem(SELECTED_ACCOUNTS_KEY, JSON.stringify(accountIds))
      console.log("Selected accounts saved:", accountIds)
    } catch (error) {
      console.error("Error saving selected accounts:", error)
    }
  }

  /**
   * Load selected account IDs from persistent storage
   */
  static async loadSelectedAccounts(): Promise<string[]> {
    try {
      const savedAccounts = await AsyncStorage.getItem(SELECTED_ACCOUNTS_KEY)
      if (savedAccounts) {
        const accountIds = JSON.parse(savedAccounts)
        console.log("Selected accounts loaded:", accountIds)
        return Array.isArray(accountIds) ? accountIds : []
      }
      return []
    } catch (error) {
      console.error("Error loading selected accounts:", error)
      return []
    }
  }

  /**
   * Clear saved selected accounts
   */
  static async clearSelectedAccounts(): Promise<void> {
    try {
      await AsyncStorage.removeItem(SELECTED_ACCOUNTS_KEY)
      console.log("Selected accounts cleared")
    } catch (error) {
      console.error("Error clearing selected accounts:", error)
    }
  }

  /**
   * Check if account IDs are still valid against current available accounts
   */
  static validateAccountIds(savedAccountIds: string[], availableAccounts: any[]): string[] {
    const availableAccountIds = availableAccounts.map((acc) => acc.id)
    const validAccountIds = savedAccountIds.filter((id) => availableAccountIds.includes(id))

    if (validAccountIds.length !== savedAccountIds.length) {
      console.log("Some saved accounts are no longer available, filtering valid ones")
    }

    return validAccountIds
  }
}
