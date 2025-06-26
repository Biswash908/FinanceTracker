interface Transaction {
  timestamp?: string
  date?: string
  amount?: string | number
  [key: string]: any
}

interface TrendDataPoint {
  date: string
  dateObj: Date
  amount: number
  balance: number
  transactionCount: number
}

interface ProcessingOptions {
  maxDataPoints?: number
  enableSampling?: boolean
  chunkSize?: number
}

/**
 * Enhanced trend data generation with performance optimizations
 */
export class TrendDataProcessor {
  private static instance: TrendDataProcessor
  private cache = new Map<string, TrendDataPoint[]>()
  private readonly MAX_CACHE_SIZE = 10

  static getInstance(): TrendDataProcessor {
    if (!TrendDataProcessor.instance) {
      TrendDataProcessor.instance = new TrendDataProcessor()
    }
    return TrendDataProcessor.instance
  }

  /**
   * Generate trend data with caching and optimization
   */
  generateTrendData(transactions: Transaction[], options: ProcessingOptions = {}): TrendDataPoint[] {
    const { maxDataPoints = 1000, enableSampling = true, chunkSize = 100 } = options

    if (!transactions || transactions.length === 0) return []

    // Create cache key
    const cacheKey = this.createCacheKey(transactions, options)

    // Check cache first
    if (this.cache.has(cacheKey)) {
      console.log("TrendDataProcessor: Using cached data")
      return this.cache.get(cacheKey)!
    }

    console.log(`TrendDataProcessor: Processing ${transactions.length} transactions`)

    // Process data in chunks for better performance
    const result = this.processTransactionsInChunks(transactions, chunkSize)

    // Apply sampling if needed
    const finalResult =
      enableSampling && result.length > maxDataPoints ? this.sampleData(result, maxDataPoints) : result

    // Cache the result
    this.cacheResult(cacheKey, finalResult)

    console.log(`TrendDataProcessor: Generated ${finalResult.length} trend points`)
    return finalResult
  }

  /**
   * Process transactions in chunks to avoid blocking the main thread
   */
  private processTransactionsInChunks(transactions: Transaction[], chunkSize: number): TrendDataPoint[] {
    // Sort transactions by date (oldest first)
    const sortedTransactions = [...transactions].sort((a, b) => {
      const dateA = new Date(a.timestamp || a.date || 0).getTime()
      const dateB = new Date(b.timestamp || b.date || 0).getTime()
      return dateA - dateB
    })

    // Group transactions by date
    const dateMap = new Map<string, TrendDataPoint>()
    let runningBalance = 0

    // Process in chunks
    for (let i = 0; i < sortedTransactions.length; i += chunkSize) {
      const chunk = sortedTransactions.slice(i, i + chunkSize)

      chunk.forEach((transaction) => {
        const date = new Date(transaction.timestamp || transaction.date || 0)
        const dateKey = date.toISOString().split("T")[0]
        const amount = Number.parseFloat(String(transaction.amount || 0))

        if (!dateMap.has(dateKey)) {
          dateMap.set(dateKey, {
            date: dateKey,
            dateObj: new Date(date),
            amount: 0,
            balance: runningBalance,
            transactionCount: 0,
          })
        }

        const dayData = dateMap.get(dateKey)!
        dayData.amount += amount
        dayData.transactionCount += 1
        runningBalance += amount
        dayData.balance = runningBalance
      })
    }

    return Array.from(dateMap.values()).sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime())
  }

  /**
   * Sample data points for large datasets
   */
  private sampleData(data: TrendDataPoint[], maxPoints: number): TrendDataPoint[] {
    if (data.length <= maxPoints) return data

    const step = data.length / maxPoints
    const sampled: TrendDataPoint[] = []

    for (let i = 0; i < data.length; i += step) {
      const index = Math.floor(i)
      if (index < data.length) {
        sampled.push(data[index])
      }
    }

    // Always include the last data point
    if (sampled[sampled.length - 1] !== data[data.length - 1]) {
      sampled.push(data[data.length - 1])
    }

    console.log(`TrendDataProcessor: Sampled from ${data.length} to ${sampled.length} points`)
    return sampled
  }

  /**
   * Create cache key for transactions
   */
  private createCacheKey(transactions: Transaction[], options: ProcessingOptions): string {
    const transactionHash = this.hashTransactions(transactions)
    const optionsHash = JSON.stringify(options)
    return `${transactionHash}-${optionsHash}`
  }

  /**
   * Simple hash function for transactions
   */
  private hashTransactions(transactions: Transaction[]): string {
    if (transactions.length === 0) return "empty"

    const first = transactions[0]
    const last = transactions[transactions.length - 1]
    const count = transactions.length

    return `${count}-${first.timestamp || first.date}-${last.timestamp || last.date}`
  }

  /**
   * Cache management
   */
  private cacheResult(key: string, data: TrendDataPoint[]): void {
    if (this.cache.size >= this.MAX_CACHE_SIZE) {
      // Remove oldest entry
      const firstKey = this.cache.keys().next().value
      this.cache.delete(firstKey)
    }
    this.cache.set(key, data)
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear()
  }
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

/**
 * Calculate zoom level based on data size
 */
export const calculateOptimalZoom = (dataLength: number): number => {
  if (dataLength <= 30) return 0.8
  if (dataLength <= 90) return 0.5
  if (dataLength <= 180) return 0.3
  if (dataLength <= 365) return 0.2
  return 0.1
}

/**
 * Generate date labels with smart spacing
 */
export const generateOptimizedDateLabels = (
  trendData: TrendDataPoint[],
  screenWidth: number,
  zoomLevel: number,
): string[] => {
  const totalPoints = trendData.length
  const baseWidth = 50
  const adjustedWidth = baseWidth / zoomLevel
  const availableWidth = screenWidth - 80
  const maxLabels = Math.floor(availableWidth / adjustedWidth)
  const labelInterval = Math.max(1, Math.ceil(totalPoints / maxLabels))

  return trendData.map((item, index) => {
    if (index === 0 || index === totalPoints - 1 || index % labelInterval === 0) {
      const date = item.dateObj
      if (totalPoints > 365) {
        return `${date.getMonth() + 1}/${date.getFullYear().toString().slice(-2)}`
      } else {
        return `${date.getMonth() + 1}/${date.getDate()}`
      }
    }
    return ""
  })
}

// Export singleton instance
export const trendDataProcessor = TrendDataProcessor.getInstance()
