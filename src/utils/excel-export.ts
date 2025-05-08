import * as Sharing from "expo-sharing"
import * as FileSystem from "expo-file-system"
import { Platform } from "react-native"
import { categorizeTransaction } from "./categorizer"

/**
 * Format date for Excel
 */
const formatDateForExcel = (dateString: string): string => {
  try {
    const date = new Date(dateString)
    return date.toISOString().split("T")[0] // YYYY-MM-DD format
  } catch (error) {
    console.error("Error formatting date for Excel:", error)
    return dateString
  }
}

/**
 * Export transactions to Excel file or CSV
 *
 * @param transactions Array of transactions to export
 * @param fileName Name of the file to save (without extension)
 * @returns Promise that resolves when the file is saved/shared
 */
export const exportTransactionsToExcel = async (transactions: any[], fileName = "transactions"): Promise<void> => {
  try {
    if (!transactions || transactions.length === 0) {
      throw new Error("No transactions to export")
    }

    console.log(`Preparing to export ${transactions.length} transactions to Excel`)

    // Format transactions for Excel
    const formattedTransactions = transactions.map((transaction) => {
      const amount = Number.parseFloat(transaction.amount || "0")
      const isIncome = amount > 0
      const category = isIncome ? "Income" : categorizeTransaction(transaction.description || "")

      return {
        Date: formatDateForExcel(transaction.timestamp || transaction.date || new Date().toISOString()),
        Description: transaction.description || "",
        Amount: Math.abs(amount).toFixed(2),
        Type: isIncome ? "Income" : "Expense",
        Category: category.charAt(0).toUpperCase() + category.slice(1),
        Account: transaction.account_name || "",
        Currency: transaction.currency_code || "AED",
        "Transaction ID": transaction.transaction_id || transaction.id || "",
      }
    })

    // For Expo Go compatibility, use CSV format which is simpler
    // Generate CSV content
    const headers = Object.keys(formattedTransactions[0])
    let csvContent = headers.join(",") + "\n"

    formattedTransactions.forEach((row) => {
      const values = headers.map((header) => {
        const value = row[header] || ""
        // Escape quotes and wrap in quotes if contains comma or newline
        const escaped =
          typeof value === "string" && (value.includes(",") || value.includes("\n") || value.includes('"'))
            ? `"${value.replace(/"/g, '""')}"`
            : value
        return escaped
      })
      csvContent += values.join(",") + "\n"
    })

    // Create a temporary file path
    const fileExtension = ".csv"
    const fileNameWithExt = `${fileName}${fileExtension}`

    // Check if sharing is available
    if (await Sharing.isAvailableAsync()) {
      try {
        // For Expo Go, use a more compatible approach
        const fileUri = FileSystem.documentDirectory + fileNameWithExt

        // Write the file using a more basic approach
        await FileSystem.writeAsStringAsync(fileUri, csvContent)

        console.log(`CSV file created at: ${fileUri}`)

        // Share the file
        await Sharing.shareAsync(fileUri, {
          mimeType: "text/csv",
          dialogTitle: "Export Transactions",
          UTI: "public.comma-separated-values-text",
        })

        console.log("File shared successfully")
      } catch (fileError) {
        console.error("File operation error:", fileError)

        // Fallback for Expo Go: Share as plain text
        await Sharing.shareAsync(FileSystem.documentDirectory || "", {
          mimeType: "text/plain",
          dialogTitle: "Export Transactions (CSV)",
          UTI: "public.plain-text",
          message: csvContent,
        })
      }
    } else {
      console.log("Sharing is not available on this device")
      // On web, we could use a different approach
      if (Platform.OS === "web") {
        // For web, we would use a different approach to download the file
        console.log("Web platform detected, would use different download method")
      }
    }

    return
  } catch (error) {
    console.error("Error exporting transactions to Excel:", error)
    throw error
  }
}
