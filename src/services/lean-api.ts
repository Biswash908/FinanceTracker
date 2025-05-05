import { authService } from "./auth-service"

/**
 * Fetch transactions from the Lean API
 */
export const fetchTransactions = async (
  entityId: string,
  accountId: string,
  startDate: string,
  endDate: string
) => {
  try {
    console.log("Fetching transactions with:", {
      entity_id: entityId,
      account_id: accountId,
      from: startDate,
      to: endDate,
    })

    const token = await authService.getToken()

    const response = await fetch("https://sandbox.leantech.me/data/v1/transactions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        Scope: "api",
      },
      body: JSON.stringify({
        entity_id: entityId,
        account_id: accountId,
        from: new Date(startDate).toISOString(),
        to: new Date(new Date(endDate).setHours(23, 59, 59)).toISOString(),
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`API error: ${response.status} ${errorText}`)
    }

    const data = await response.json()
    console.log(`✅ Fetched ${data.payload.transactions.length} transactions`)

    // Filter transactions based on the date range
    const filteredTransactions = data.payload.transactions.filter((transaction: any) => {
      const transactionDate = new Date(transaction.timestamp)
      return transactionDate >= new Date(startDate) && transactionDate <= new Date(endDate)
    })

    return filteredTransactions
  } catch (error) {
    console.error("Error fetching transactions:", error)
    throw error
  }
}
