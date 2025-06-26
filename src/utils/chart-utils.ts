/**
 * Chart utility functions extracted for better code organization and testability
 */

interface Transaction {
  timestamp?: string
  date?: string
  amount?: string | number
  account_id?: string
  description?: string
  id?: string // Assuming each transaction has a unique 'id'
  [key: string]: any
}

interface TrendDataPoint {
  date: string
  dateObj: Date
  amount: number
  balance: number
  transactionCount: number
  hasTransactions: boolean
  isTransaction?: boolean
  originalTransaction?: Transaction
}

interface ProcessingOptions {
  maxDataPoints?: number
  enableSampling?: boolean
  chunkSize?: number
  useTransactionLevel?: boolean
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
    const { maxDataPoints = 1000, enableSampling = true, chunkSize = 100, useTransactionLevel = false } = options

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
    const result = useTransactionLevel
      ? this.processTransactionLevel(transactions, chunkSize)
      : this.processTransactionsInChunks(transactions, chunkSize)

    // Apply sampling if needed
    const finalResult =
      enableSampling && result.length > maxDataPoints ? this.sampleData(result, maxDataPoints) : result

    // Cache the result
    this.cacheResult(cacheKey, finalResult)

    console.log(`TrendDataProcessor: Generated ${finalResult.length} trend points`)
    return finalResult
  }

  /**
   * Process transactions at transaction level (each transaction is a point)
   */
  private processTransactionLevel(transactions: Transaction[], chunkSize: number): TrendDataPoint[] {
    const sortedTransactions = [...transactions].sort((a, b) => {
      const dateA = new Date(a.timestamp || a.date || 0).getTime()
      const dateB = new Date(b.timestamp || b.date || 0).getTime()
      return dateA - dateB
    })

    const result: TrendDataPoint[] = []
    let runningBalance = 0

    for (let i = 0; i < sortedTransactions.length; i += chunkSize) {
      const chunk = sortedTransactions.slice(i, i + chunkSize)

      chunk.forEach((transaction) => {
        const date = new Date(transaction.timestamp || transaction.date || 0)
        const amount = Number.parseFloat(String(transaction.amount || 0))
        runningBalance += amount

        result.push({
          date: date.toISOString().split("T")[0],
          dateObj: date,
          amount: amount,
          balance: runningBalance,
          transactionCount: 1,
          hasTransactions: true,
          isTransaction: true,
          originalTransaction: transaction,
        })
      })
    }

    return result
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
            hasTransactions: true,
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
   * Sample data to reduce the number of points
   */
  private sampleData(data: TrendDataPoint[], maxDataPoints: number): TrendDataPoint[] {
    const sampleRate = Math.ceil(data.length / maxDataPoints)
    const sampledData: TrendDataPoint[] = []

    for (let i = 0; i < data.length; i += sampleRate) {
      sampledData.push(data[i])
    }

    return sampledData
  }

  /**
   * Create a cache key based on transactions and options
   */
  private createCacheKey(transactions: Transaction[], options: ProcessingOptions): string {
    const transactionIds = transactions.map((t) => t.id).join(",") // Assuming each transaction has a unique 'id'
    const optionsString = JSON.stringify(options)
    return `${transactionIds}-${optionsString}`
  }

  /**
   * Cache the result and manage cache size
   */
  private cacheResult(cacheKey: string, result: TrendDataPoint[]): void {
    if (this.cache.size >= this.MAX_CACHE_SIZE) {
      // Remove the least recently used item (simplistic approach)
      const firstKey = this.cache.keys().next().value
      this.cache.delete(firstKey)
    }

    this.cache.set(cacheKey, result)
    console.log(`TrendDataProcessor: Cached data with key ${cacheKey}`)
  }
}

/**
 * Format currency for display
 */
export const formatCurrency = (value: number): string => {
  if (Math.abs(value) < 1) return "0"
  if (Math.abs(value) >= 1000000) return `${(value / 1000000).toFixed(1)}M`
  if (Math.abs(value) >= 1000) return `${(value / 1000).toFixed(0)}K`
  return Math.round(value).toString()
}

/**
 * Determine scale increment based on the range
 */
export const getScaleIncrement = (max: number, min: number): number => {
  const range = Math.max(Math.abs(max), Math.abs(min))

  if (range <= 10000) return 1000 // 1k increments for small amounts
  if (range <= 50000) return 5000 // 5k increments
  if (range <= 100000) return 10000 // 10k increments
  if (range <= 250000) return 25000 // 25k increments
  if (range <= 500000) return 50000 // 50k increments
  if (range <= 1000000) return 100000 // 100k increments
  if (range <= 2500000) return 250000 // 250k increments
  return 500000 // 500k increments for very large amounts
}

export const generateNiceScale = (maxValue, tickCount = 5) => {
  if (maxValue === 0) return [0]
  
  const range = maxValue
  const roughStep = range / (tickCount - 1)
  const stepPower = Math.pow(10, Math.floor(Math.log10(roughStep)))
  const normalizedStep = roughStep / stepPower
  
  let step
  if (normalizedStep < 1.5) step = stepPower
  else if (normalizedStep < 3) step = 2 * stepPower
  else if (normalizedStep < 7) step = 5 * stepPower
  else step = 10 * stepPower
  
  const values = []
  for (let i = Math.ceil(maxValue / step); i >= 0; i--) {
    values.push(i * step)
  }
  
  return values
}

export const formatChartLabel = (value) => {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`
  if (value >= 1000) return `${(value / 1000).toFixed(0)}K`
  return value.toString()
}

/**
 * Create smart labels based on data length and zoom level
 */
export const createSmartLabels = (
  data: any[],
  zoom: number,
  actualLength: number,
  isTransactionLevel: boolean,
  screenWidth = 400,
): string[] => {
  const totalPoints = actualLength > 0 ? actualLength : data.length
  const availableWidth = screenWidth - 50
  const estimatedLabelWidth = 35
  const maxLabelsForScreen = Math.floor(availableWidth / estimatedLabelWidth)

  let labelInterval
  if (isTransactionLevel) {
    // For transaction level, show fewer labels
    labelInterval = Math.max(1, Math.ceil(totalPoints / Math.min(maxLabelsForScreen, 6)))
  } else {
    if (zoom <= 0.1) {
      labelInterval = Math.max(1, Math.ceil(totalPoints / Math.min(maxLabelsForScreen, 4)))
    } else if (zoom <= 0.3) {
      labelInterval = Math.max(1, Math.ceil(totalPoints / Math.min(maxLabelsForScreen, 8)))
    } else {
      labelInterval = Math.max(1, Math.ceil(totalPoints / (maxLabelsForScreen * zoom)))
    }
  }

  return data.map((item, index) => {
    const date = new Date(item.date)
    if (index < totalPoints && (index === 0 || index === totalPoints - 1 || index % labelInterval === 0)) {
      if (isTransactionLevel) {
        // For transactions, show time if same day has multiple transactions
        return `${date.getMonth() + 1}/${date.getDate()}`
      } else {
        if (totalPoints > 180) {
          return `${date.getMonth() + 1}/${date.getFullYear().toString().slice(-2)}`
        } else {
          return `${date.getMonth() + 1}/${date.getDate()}`
        }
      }
    }
    return ""
  })
}

/**
 * Debounce function for performance optimization
 */
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number,
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout | null = null

  return (...args: Parameters<T>) => {
    if (timeout) {
      clearTimeout(timeout)
    }

    timeout = setTimeout(() => {
      func(...args)
    }, wait)
  }
}

/**
 * Throttle function for scroll events
 */
export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  limit: number,
): ((...args: Parameters<T>) => void) => {
  let inThrottle = false

  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args)
      inThrottle = true
      setTimeout(() => (inThrottle = false), limit)
    }
  }
}

/**
 * Calculate optimal zoom level based on data size
 */
export const calculateOptimalZoom = (dataLength: number): number => {
  if (dataLength <= 30) return 0.8
  if (dataLength <= 90) return 0.5
  if (dataLength <= 180) return 0.3
  if (dataLength <= 365) return 0.2
  return 0.1
}

/**
 * Process transactions in batches for better performance
 */
export const processTransactionsBatch = async <T>(
  items: T[],
  batchSize: number,
  processor: (batch: T[]) => Promise<any>,
)
: Promise<any[]> =>
{
  const results = []

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize)
    const result = await processor(batch)
    results.push(result)

    // Small delay to prevent blocking
    if (i + batchSize < items.length) {
      await new Promise((resolve) => setTimeout(resolve, 10))
    }
  }

  return results
}

// Export singleton instance
export const trendDataProcessor = TrendDataProcessor.getInstance()
