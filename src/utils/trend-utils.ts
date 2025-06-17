interface Transaction {
  timestamp?: string
  date?: string
  amount?: string | number
  [key: string]: any
}

interface TrendDataPoint {
  date: string
  amount: number
  balance: number
}

/**
 * Generate trend data from transactions
 */
export const generateTrendData = (transactions: Transaction[]): TrendDataPoint[] => {
  if (!transactions || transactions.length === 0) return []

  // Group transactions by date and calculate running balance
  const dateMap = new Map<string, TrendDataPoint>()
  let runningBalance = 0

  // Sort transactions by date (oldest first)
  const sortedTransactions = [...transactions].sort((a, b) => {
    const dateA = new Date(a.timestamp || a.date || 0).getTime()
    const dateB = new Date(b.timestamp || b.date || 0).getTime()
    return dateA - dateB
  })

  sortedTransactions.forEach((transaction) => {
    const date = new Date(transaction.timestamp || transaction.date || 0).toISOString().split("T")[0]
    const amount = Number.parseFloat(String(transaction.amount || 0))

    if (!dateMap.has(date)) {
      dateMap.set(date, { date, amount: 0, balance: runningBalance })
    }

    const dayData = dateMap.get(date)!
    dayData.amount += amount
    runningBalance += amount
    dayData.balance = runningBalance
  })

  return Array.from(dateMap.values()).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
}

/**
 * Format currency for display in charts
 */
export const formatChartCurrency = (amount: number): string => {
  const absAmount = Math.abs(amount)
  if (absAmount >= 1000000) {
    return `${(amount / 1000000).toFixed(1)}M`
  }
  if (absAmount >= 1000) {
    return `${(amount / 1000).toFixed(0)}K`
  }
  return amount.toFixed(0)
}
