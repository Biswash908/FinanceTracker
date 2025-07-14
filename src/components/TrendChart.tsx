"use client"

import type React from "react"
import { useMemo, useState, useEffect, useCallback } from "react"
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ScrollView,
  TouchableWithoutFeedback,
} from "react-native"
import { LineChart, AreaChart } from "react-native-svg-charts"
import { Circle, G, Line, Text as SvgText } from "react-native-svg"
import { MaterialIcons } from "@expo/vector-icons"
import { fetchTransactions } from "../services/lean-api"
import { leanEntityService } from "../services/lean-entity-service"
import LoadingSpinner from "./LoadingSpinner" // Import the new spinner

interface Transaction {
  timestamp?: string
  date?: string
  amount?: string | number
  account_id?: string
  description?: string
  [key: string]: any
}

interface TrendChartProps {
  selectedAccounts: string[]
  startDate: string
  endDate: string
  isDarkMode?: boolean
}

interface DataPoint {
  date: Date
  balance: number
  amount?: number
  isTransaction?: boolean
  hasTransactions?: boolean
  originalTransaction?: Transaction
  transactionCount?: number
  isInvisible?: boolean
}

const screenWidth = Dimensions.get("window").width

// Format currency for amounts - from trend-chart.tsx
const formatCurrency = (value: number) => {
  if (Math.abs(value) < 1) return "0"
  if (Math.abs(value) >= 1000000) return `${(value / 1000000).toFixed(1)}M`
  if (Math.abs(value) >= 1000) return `${(value / 1000).toFixed(0)}K`
  return Math.round(value).toString()
}

// Debounce utility
const debounce = (func: Function, wait: number) => {
  let timeout: NodeJS.Timeout
  return function executedFunction(...args: any[]) {
    const later = () => {
      clearTimeout(timeout)
      func(...args)
    }
    clearTimeout(timeout)
    timeout = setTimeout(later, wait)
  }
}

// Enhanced data processor
const trendDataProcessor = {
  generateTrendData: (transactions: Transaction[], options: any) => {
    if (!transactions || transactions.length === 0) return []

    // Filter valid transactions and sort by date (oldest first)
    const validTransactions = transactions
      .filter((tx) => (tx.timestamp || tx.date) && tx.amount !== undefined)
      .sort((a, b) => {
        const dateA = new Date(a.timestamp || a.date || 0).getTime()
        const dateB = new Date(b.timestamp || b.date || 0).getTime()
        return dateA - dateB
      })

    if (validTransactions.length === 0) return []

    const processedData = []
    let runningBalance = 0

    // Process each transaction
    validTransactions.forEach((tx) => {
      const date = new Date(tx.timestamp || tx.date || 0)
      const amount = Number.parseFloat(String(tx.amount || 0))
      runningBalance += amount

      processedData.push({
        dateObj: date,
        balance: runningBalance,
        amount: amount,
        isTransaction: true,
        hasTransactions: true,
        originalTransaction: tx,
        transactionCount: 1,
      })
    })

    return processedData
  },
}

const TrendChart: React.FC<TrendChartProps> = ({ selectedAccounts, startDate, endDate, isDarkMode = false }) => {
  const [zoomLevel, setZoomLevel] = useState(0.1)
  const [chartTransactions, setChartTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true) // Start with loading true
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)

  // Debounced zoom handler for performance
  const debouncedZoomChange = useCallback(
    debounce((newZoom: number) => {
      setZoomLevel(newZoom)
    }, 150),
    [],
  )

  // Enhanced data fetching with Promise.all for concurrent requests
  useEffect(() => {
    const loadTrendData = async () => {
      if (!selectedAccounts || selectedAccounts.length === 0) {
        setChartTransactions([])
        setLoading(false) // Set loading to false when no accounts
        return
      }

      try {
        setLoading(true) // Show loading spinner
        console.log("TrendChart: Loading transaction data concurrently...")

        const entityId = await leanEntityService.getEntityId()
        if (!entityId) {
          console.error("TrendChart: No entity ID found")
          setLoading(false)
          return
        }

        // Use Promise.all for concurrent fetching across accounts
        const transactionPromises = selectedAccounts.map(async (accountId) => {
          const allTransactions = []
          const TRANSACTIONS_PER_PAGE = 100
          const MAX_PAGES_PER_ACCOUNT = 100

          console.log(`TrendChart: Fetching all transactions for account ${accountId}`)
          let page = 1
          let hasMore = true
          let accountTransactions = 0

          while (hasMore && page <= MAX_PAGES_PER_ACCOUNT) {
            try {
              const result = await fetchTransactions(
                entityId,
                accountId,
                startDate,
                endDate,
                page,
                TRANSACTIONS_PER_PAGE,
              )

              const pageTransactions = result.transactions || []
              console.log(
                `TrendChart: Page ${page}: Received ${pageTransactions.length} transactions for account ${accountId}`,
              )

              if (pageTransactions.length > 0) {
                allTransactions.push(...pageTransactions)
                accountTransactions += pageTransactions.length
              }

              hasMore = pageTransactions.length === TRANSACTIONS_PER_PAGE && result.hasMore !== false
              page++

              if (pageTransactions.length < TRANSACTIONS_PER_PAGE) {
                hasMore = false
              }
            } catch (error) {
              console.error(`TrendChart: Error fetching page ${page} for account ${accountId}:`, error)
              hasMore = false
            }
          }

          console.log(`TrendChart: Total transactions fetched for account ${accountId}: ${accountTransactions}`)
          return allTransactions
        })

        // Execute all API calls concurrently
        const results = await Promise.all(transactionPromises)
        const allTransactions = results.flat()

        console.log(`TrendChart: Total transactions fetched across all accounts: ${allTransactions.length}`)
        setChartTransactions(allTransactions)
      } catch (error) {
        console.error("TrendChart: Error loading transaction data:", error)
      } finally {
        setLoading(false) // Hide loading spinner
      }
    }

    loadTrendData()
  }, [selectedAccounts, startDate, endDate])

  // Enhanced data processing with both transaction-level and daily-level data
  const chartData = useMemo(() => {
    if (!chartTransactions || chartTransactions.length === 0) {
      return {
        data: [0], // Start with 0 when no data
        dataPoints: [],
        stats: null,
        useTransactionLevel: false,
        yAxisDomain: { min: -1000, max: 1000 }, // Default range including negatives
        dateLabels: [],
      }
    }

    const useTransactionLevel = zoomLevel >= 1.5

    // Use the enhanced processor
    const processedData = trendDataProcessor.generateTrendData(chartTransactions, {
      maxDataPoints: 2000,
      enableSampling: true,
      chunkSize: 100,
      useTransactionLevel: useTransactionLevel,
    })

    // ALWAYS start from 0 - this ensures the chart shows the rise/fall from zero
    let adjustedProcessedData = []
    if (processedData.length > 0) {
      // Add a starting point at 0 with the first transaction's date
      const firstPoint = processedData[0]
      const startingPoint = {
        dateObj: new Date(firstPoint.dateObj.getTime() - 1000), // 1 second before first transaction
        balance: 0,
        amount: 0,
        isTransaction: false,
        hasTransactions: false,
        originalTransaction: null,
        transactionCount: 0,
      }
      adjustedProcessedData = [startingPoint, ...processedData]
    }

    // Add invisible padding points for proper spacing and interactivity
    const paddingPoints = Math.max(3, Math.floor(adjustedProcessedData.length * 0.05)) // 5% padding or minimum 3 points

    // Add invisible points at the beginning
    const startPaddingPoints = []
    for (let i = paddingPoints; i > 0; i--) {
      const firstPoint = adjustedProcessedData[0]
      startPaddingPoints.push({
        dateObj: new Date(firstPoint.dateObj.getTime() - i * 24 * 60 * 60 * 1000), // i days before
        balance: 0, // Keep at 0 for invisible start
        amount: 0,
        isTransaction: false,
        hasTransactions: false,
        originalTransaction: null,
        transactionCount: 0,
        isInvisible: true, // Mark as invisible
      })
    }

    // Add invisible points at the end
    const endPaddingPoints = []
    const lastPoint = adjustedProcessedData[adjustedProcessedData.length - 1]
    for (let i = 1; i <= paddingPoints; i++) {
      endPaddingPoints.push({
        dateObj: new Date(lastPoint.dateObj.getTime() + i * 24 * 60 * 60 * 1000), // i days after
        balance: lastPoint.balance, // Keep same balance for invisible end
        amount: 0,
        isTransaction: false,
        hasTransactions: false,
        originalTransaction: null,
        transactionCount: 0,
        isInvisible: true, // Mark as invisible
      })
    }

    // Combine all data with padding
    adjustedProcessedData = [...startPaddingPoints, ...adjustedProcessedData, ...endPaddingPoints]

    // Convert to chart format with dataPoints for the improved structure
    const dataPoints = adjustedProcessedData.map((point, index) => {
      // Create date string for display
      let dateStr
      if (point.dateObj) {
        const date = point.dateObj
        dateStr = `${date.getMonth() + 1}/${date.getDate()}`
      } else {
        // Fallback: estimate date based on index
        const startDateObj = new Date(startDate)
        const endDateObj = new Date(endDate)
        const daysDiff = Math.ceil((endDateObj.getTime() - startDateObj.getTime()) / (1000 * 60 * 60 * 24))
        const dayOffset = Math.floor((index / adjustedProcessedData.length) * daysDiff)
        const date = new Date(startDateObj)
        date.setDate(date.getDate() + dayOffset)
        dateStr = `${date.getMonth() + 1}/${date.getDate()}`
      }

      return {
        index,
        balance: point.balance,
        amount: point.amount || 0,
        hasTransactions: point.hasTransactions || false,
        transactionCount: point.transactionCount || 0,
        isTransaction: point.isTransaction || false,
        originalTransaction: point.originalTransaction,
        date: dateStr,
        dateObj: point.dateObj,
        isInvisible: point.isInvisible || false,
      }
    })

    // Calculate statistics
    const balances = dataPoints.map((d) => d.balance)
    const minBalance = Math.min(...balances, 0) // Always include 0
    const maxBalance = Math.max(...balances, 0) // Always include 0

    // Create Y-axis domain that always includes 0 and shows negatives when needed
    const range = Math.max(Math.abs(minBalance), Math.abs(maxBalance))
    const padding = range * 0.1 // 10% padding

    const yAxisDomain = {
      min: minBalance < 0 ? minBalance - padding : -padding,
      max: maxBalance > 0 ? maxBalance + padding : padding,
    }

    // Create smart date labels for X-axis with guaranteed first/last transaction dates
    const dateLabels = dataPoints.map((point, index) => {
      const totalPoints = dataPoints.length
      const labelInterval = Math.max(1, Math.floor(totalPoints / 6)) // Show ~6 labels max

      // Find first and last actual transaction indices (skip invisible padding)
      const firstTransactionIndex = dataPoints.findIndex((p) => !p.isInvisible && p.hasTransactions)
      const lastTransactionIndex =
        dataPoints
          .map((p, i) => (!p.isInvisible && p.hasTransactions ? i : -1))
          .filter((i) => i !== -1)
          .pop() || totalPoints - 1

      // Always show first transaction, last transaction, and interval-based labels
      if (index === firstTransactionIndex || index === lastTransactionIndex || index % labelInterval === 0) {
        return point.date
      }
      return ""
    })

    const stats = {
      startBalance: balances[0] || 0,
      endBalance: balances[balances.length - 1] || 0,
      minBalance,
      maxBalance,
      change: (balances[balances.length - 1] || 0) - (balances[0] || 0),
      days: adjustedProcessedData.length,
      totalTransactions: chartTransactions.length,
      firstTransactionAmount: processedData.length > 0 ? processedData[0].amount : 0,
    }

    return {
      data: balances,
      dataPoints,
      stats,
      useTransactionLevel,
      yAxisDomain,
      dateLabels,
    }
  }, [chartTransactions, zoomLevel, startDate, endDate])

  // ENHANCED: Smart Y-axis scale with constant gaps and round numbers (from trend-chart.tsx)
  const yAxisData = useMemo(() => {
    if (chartData.data.length === 0) return [0]

    const { yAxisDomain } = chartData
    const minValue = yAxisDomain.min
    const maxValue = yAxisDomain.max

    // Use the same increment calculation but ensure perfect alignment
    const getScaleIncrement = (max: number, min: number) => {
      const range = Math.max(Math.abs(max), Math.abs(min))

      if (range <= 10000) return 1000
      if (range <= 50000) return 5000
      if (range <= 100000) return 10000
      if (range <= 250000) return 25000
      if (range <= 500000) return 50000
      if (range <= 1000000) return 100000
      if (range <= 2500000) return 250000
      return 500000
    }

    const increment = getScaleIncrement(maxValue, minValue)

    // Calculate exact grid positions
    const maxLines = Math.ceil(Math.abs(maxValue) / increment)
    const minLines = Math.ceil(Math.abs(minValue) / increment)

    const values = []

    // Add negative values if needed
    if (minValue < 0) {
      for (let i = minLines; i >= 1; i--) {
        values.push(-i * increment)
      }
    }

    // Always add 0
    values.push(0)

    // Add positive values
    for (let i = 1; i <= Math.max(maxLines, minValue >= 0 ? 8 : 6); i++) {
      values.push(i * increment)
    }

    // Ensure we have 8-10 total lines
    while (values.length < 8) {
      const lastValue = values[values.length - 1]
      values.push(lastValue + increment)
    }

    if (values.length > 10) {
      values.splice(10)
    }

    return values.reverse()
  }, [chartData])

  // FIXED: Dot behavior configuration - "Each dot = day" starts from 1.1x
  const dotBehavior = useMemo(() => {
    const showDots = zoomLevel >= 1.1 // Changed from > 0.3 to >= 1.1
    const isTransactionLevel = zoomLevel >= 1.5

    let indicatorText = ""
    let indicatorIcon = "radio-button-unchecked"

    if (!showDots) {
      indicatorText = "No dots shown - Overview mode"
      indicatorIcon = "remove"
    } else if (isTransactionLevel) {
      indicatorText = "Each dot = Transaction"
      indicatorIcon = "fiber-manual-record"
    } else {
      indicatorText = "Each dot = Day"
      indicatorIcon = "today"
    }

    return {
      showDots,
      isTransactionLevel,
      indicatorText,
      indicatorIcon,
      dotRadius: isTransactionLevel ? "2" : "3",
    }
  }, [zoomLevel])

  // Zoom controls
  const handleZoomIn = () => {
    const newZoom = Math.min(zoomLevel * 1.5, 2)
    debouncedZoomChange(newZoom)
  }

  const handleZoomOut = () => {
    const newZoom = Math.max(zoomLevel / 1.5, 0.05)
    debouncedZoomChange(newZoom)
  }

  const handleFitToScreen = () => {
    debouncedZoomChange(0.1)
  }

  // FIXED: Grid Lines component with PERFECT alignment to amount labels
  const GridLines = ({ x, y }: any) => {
    const gridLines = []

    yAxisData.forEach((value, index) => {
      // Use EXACT same positioning as the fixed amount labels
      const linePosition = 20 + index * (240 / (yAxisData.length - 1))

      const isZeroLine = Math.abs(value) < 0.1
      const chartWidth = chartData.data.length > 0 ? x(chartData.data.length - 1) : 100

      if (isZeroLine) {
        // Black solid line for zero - made thinner
        gridLines.push(
          <Line
            key={`zero-${index}`}
            x1={0}
            y1={linePosition}
            x2={chartWidth}
            y2={linePosition}
            stroke={isDarkMode ? "#ffffff" : "#000000"}
            strokeWidth={1.5}
            opacity={1}
          />,
        )
      } else {
        // Green dashed lines for others
        gridLines.push(
          <Line
            key={`grid-${index}`}
            x1={0}
            y1={linePosition}
            x2={chartWidth}
            y2={linePosition}
            stroke={isDarkMode ? "#4CAF50" : "#27ae60"}
            strokeWidth={1}
            strokeDasharray="5,5"
            opacity={0.6}
          />,
        )
      }
    })

    return <G>{gridLines}</G>
  }

  // Date Labels component for X-axis
  const DateLabels = ({ x, y }: any) => {
    const labels = []
    // Calculate zero line position (same logic as GridLines)
    const zeroIndex = yAxisData.findIndex((value) => Math.abs(value) < 0.1)
    const zeroLinePosition = zeroIndex >= 0 ? 20 + zeroIndex * (240 / (yAxisData.length - 1)) : 130
    const yPosition = zeroLinePosition + 15 // Position dates 15px below zero line

    chartData.dateLabels.forEach((label, index) => {
      const dataPoint = chartData.dataPoints[index]
      // Only show labels for non-invisible points
      if (label && dataPoint && !dataPoint.isInvisible) {
        labels.push(
          <SvgText
            key={index}
            x={x(index)}
            y={yPosition}
            fontSize="10"
            fill={isDarkMode ? "#AAA" : "#666"}
            textAnchor="middle"
            fontWeight="400"
          >
            {label}
          </SvgText>,
        )
      }
    })

    return <G>{labels}</G>
  }

  // Enhanced Tooltip component with improved positioning and boundary checking
  const Tooltip = ({ x, y }: any) => {
    if (selectedIndex == null || !chartData.dataPoints[selectedIndex]) return null

    const value = chartData.dataPoints[selectedIndex]

    // Skip invisible points for tooltip
    if (value.isInvisible) return null

    const xPos = x(selectedIndex)
    const yPos = y(value.balance)

    // Better boundary checking with zoom-aware positioning
    const tooltipWidth = 80
    const leftMargin = 20

    let tooltipOffset = 10

    // Only apply aggressive left positioning for low zoom levels (fit to 0.3x)
    if (zoomLevel <= 0.3) {
      // For low zoom, move slightly left when near right edge
      if (xPos + tooltipWidth + 40 > chartWidth) {
        tooltipOffset = -30 // Only move slightly left, not all the way
      }
    } else {
      // For higher zoom levels, use normal positioning
      if (xPos + tooltipWidth + 20 > chartWidth) {
        tooltipOffset = -tooltipWidth - 10
      }
    }

    // Ensure tooltip doesn't go off left edge
    if (xPos + tooltipOffset < leftMargin) {
      tooltipOffset = leftMargin - xPos
    }

    return (
      <G>
        {/* Vertical line indicator */}
        <Line x1={xPos} y1={0} x2={xPos} y2={240} stroke="#aaa" strokeDasharray="4,4" strokeWidth={1} />

        {/* Tooltip circle */}
        <Circle
          cx={xPos}
          cy={yPos}
          r={5}
          fill="white"
          stroke={chartData.stats && chartData.stats.endBalance >= 0 ? "#27ae60" : "#e74c3c"}
          strokeWidth={3}
        />

        {/* Tooltip background and text */}
        <G x={xPos + tooltipOffset} y={Math.max(yPos - 50, 20)}>
          {/* Background */}
          <Circle
            cx={0}
            cy={0}
            r={35}
            fill={isDarkMode ? "rgba(0,0,0,0.9)" : "rgba(255,255,255,0.95)"}
            stroke={isDarkMode ? "#555" : "#ddd"}
            strokeWidth={1}
          />

          {/* Date */}
          <SvgText x={0} y={-8} fontSize="10" fill={isDarkMode ? "#FFF" : "#333"} textAnchor="middle" fontWeight="600">
            {value.date}
          </SvgText>

          {/* Balance */}
          <SvgText
            x={0}
            y={6}
            fontSize="9"
            fill={value.balance >= 0 ? "#27ae60" : "#e74c3c"}
            textAnchor="middle"
            fontWeight="500"
          >
            {formatCurrency(value.balance)} AED
          </SvgText>

          {/* Amount change if available */}
          {value.amount !== 0 && (
            <SvgText x={0} y={18} fontSize="8" fill={isDarkMode ? "#CCC" : "#666"} textAnchor="middle">
              {value.amount > 0 ? "+" : ""}
              {formatCurrency(value.amount)}
            </SvgText>
          )}
        </G>
      </G>
    )
  }

  // Custom decorators for dots
  const Decorator = ({ x, y, data }: any) => {
    if (!dotBehavior.showDots) return null

    return data.map((value: number, index: number) => {
      const dataPoint = chartData.dataPoints[index]
      if (!dataPoint || dataPoint.isInvisible) return null // Skip invisible points

      const hasTransactions = dataPoint.hasTransactions
      const isTransaction = dataPoint.isTransaction

      return (
        <Circle
          key={index}
          cx={x(index)}
          cy={y(value)}
          r={dotBehavior.dotRadius}
          stroke={isDarkMode ? "#fff" : "#333"}
          strokeWidth="1"
          fill={hasTransactions ? (isTransaction ? "#27ae60" : "#27ae60") : "#6b7280"}
        />
      )
    })
  }

  // Loading state - show spinner instead of empty message
  if (loading) {
    return (
      <View style={[styles.emptyContainer, isDarkMode && { backgroundColor: "#2A2A2A" }]}>
        <LoadingSpinner 
          size="large" 
          message="Loading balance trend data..." 
          isDarkMode={isDarkMode}
        />
      </View>
    )
  }

  // No accounts selected state
  if (!selectedAccounts || selectedAccounts.length === 0) {
    return (
      <View style={[styles.emptyContainer, isDarkMode && { backgroundColor: "#2A2A2A" }]}>
        <MaterialIcons name="account-balance" size={48} color={isDarkMode ? "#555" : "#ccc"} />
        <Text style={[styles.emptyText, isDarkMode && { color: "#AAA" }]}>
          No Accounts Selected
        </Text>
        <Text style={[styles.emptySubtext, isDarkMode && { color: "#777" }]}>
          Select one or more bank accounts to view the balance trend
        </Text>
      </View>
    )
  }

  // No data state
  if (chartData.data.length === 0 || chartTransactions.length === 0) {
    return (
      <View style={[styles.emptyContainer, isDarkMode && { backgroundColor: "#2A2A2A" }]}>
        <MaterialIcons name="trending-up" size={48} color={isDarkMode ? "#555" : "#ccc"} />
        <Text style={[styles.emptyText, isDarkMode && { color: "#AAA" }]}>
          No Transaction Data Available
        </Text>
        <Text style={[styles.emptySubtext, isDarkMode && { color: "#777" }]}>
          No transactions found for the selected accounts and date range
        </Text>
      </View>
    )
  }

  const { stats, dataPoints, yAxisDomain } = chartData
  const contentInset = { top: 20, bottom: 20 } // Increased bottom for date labels
  const chartHeight = 280 // Increased height for date labels

  // Calculate chart width with better padding
  const amountColumnWidth = 55
  const availableWidth = screenWidth - amountColumnWidth - 60 // Increased left margin
  const labelWidth = 30 // Increased for better spacing
  const rightPadding = 10 // Increased padding for tooltip space

  let chartWidth
  if (zoomLevel <= 0.1) {
    chartWidth = availableWidth - 20
  } else {
    chartWidth = Math.max(availableWidth, chartData.data.length * (2.5 * zoomLevel)) + labelWidth
  }

  // Use exact Y-axis domain from yAxisData for perfect alignment
  const exactYMin = yAxisData[yAxisData.length - 1] // Bottom value
  const exactYMax = yAxisData[0] // Top value

  return (
    <View style={styles.container}>
      {/* Stats */}
      {stats && (
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={[styles.statLabel, isDarkMode && { color: "#AAA" }]}>Period</Text>
            <Text style={[styles.statValue, isDarkMode && { color: "#FFF" }]}>
              {chartData.useTransactionLevel ? `${stats.totalTransactions} txns` : `${stats.days} days`}
            </Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statLabel, isDarkMode && { color: "#AAA" }]}>Transactions</Text>
            <Text style={[styles.statValue, isDarkMode && { color: "#FFF" }]}>{stats.totalTransactions}</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statLabel, isDarkMode && { color: "#AAA" }]}>Net Change</Text>
            <Text style={[styles.statValue, { color: stats.change >= 0 ? "#27ae60" : "#e74c3c" }]}>
              {stats.change >= 0 ? "+" : ""}
              {formatCurrency(stats.change)} AED
            </Text>
          </View>
        </View>
      )}

      {/* Zoom Controls */}
      <View style={[styles.zoomContainer, isDarkMode && { backgroundColor: "#333" }]}>
        <TouchableOpacity
          style={[styles.commonButton, isDarkMode && { backgroundColor: "#2A2A2A" }]}
          onPress={handleZoomOut}
        >
          <MaterialIcons name="zoom-out" size={18} color={isDarkMode ? "#FFF" : "#333"} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.commonButton, isDarkMode && { backgroundColor: "#2A2A2A" }]}
          onPress={handleFitToScreen}
        >
          {/* Ensure content is in a row for the Fit button */}
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <MaterialIcons name="fit-screen" size={16} color={isDarkMode ? "#FFF" : "#333"} />
            <Text style={[styles.fitButtonText, isDarkMode && { color: "#FFF" }]}>Fit</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.commonButton, isDarkMode && { backgroundColor: "#2A2A2A" }]}>
          <Text style={[styles.zoomLevelText, isDarkMode && { color: "#FFF" }]}>
            {/* Always show the zoom level, remove the "Fit" conditional */}
            {`${zoomLevel.toFixed(1)}x`}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.commonButton, isDarkMode && { backgroundColor: "#2A2A2A" }]}
          onPress={handleZoomIn}
        >
          <MaterialIcons name="zoom-in" size={18} color={isDarkMode ? "#FFF" : "#333"} />
        </TouchableOpacity>
      </View>

      {/* Dot Behavior Indicator */}
      <View style={[styles.dotIndicatorContainer, isDarkMode && { backgroundColor: "#2A2A2A" }]}>
        <MaterialIcons
          name={dotBehavior.indicatorIcon}
          size={16}
          color={dotBehavior.showDots ? (isDarkMode ? "#4CAF50" : "#27ae60") : isDarkMode ? "#666" : "#999"}
        />
        <Text
          style={[
            styles.dotIndicatorText,
            isDarkMode && { color: "#FFF" },
            !dotBehavior.showDots && { color: isDarkMode ? "#666" : "#999" },
          ]}
        >
          {dotBehavior.indicatorText}
        </Text>
      </View>

      {/* ENHANCED: Chart Container with Fixed Amount Labels */}
      <View style={styles.chartContainer}>
        {/* Fixed Amount Labels - Outside Scroll Area */}
        <View style={[styles.fixedAmountColumn, isDarkMode && { backgroundColor: "#1E1E1E" }]}>
          {yAxisData.map((value, index) => {
            const isZeroLine = Math.abs(value) < 0.1
            const linePosition = 20 + index * (240 / (yAxisData.length - 1))

            return (
              <View
                key={index}
                style={[
                  styles.fixedAmountLabel,
                  { top: linePosition - 10 },
                  isDarkMode && { backgroundColor: "#1E1E1E" },
                ]}
              >
                <Text
                  style={[
                    styles.amountLabel,
                    isDarkMode && { color: "#FFF" },
                    isZeroLine && {
                      fontWeight: "bold",
                      fontSize: 11,
                      color: isDarkMode ? "#FFF" : "#000",
                      backgroundColor: isDarkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)",
                      paddingHorizontal: 4,
                      paddingVertical: 1,
                      borderRadius: 3,
                    },
                  ]}
                >
                  {formatCurrency(value)}
                </Text>
              </View>
            )
          })}
        </View>

        {/* Vertical Separator */}
        <View style={[styles.verticalSeparator, isDarkMode && { backgroundColor: "#333" }]} />

        {/* Scrollable Chart Area */}
        <View style={styles.scrollableChartArea}>
          <ScrollView
            horizontal
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingLeft: 5, paddingRight: rightPadding }} // Added left padding
            showsHorizontalScrollIndicator={true}
            onScroll={() => {
              setSelectedIndex(null)
            }}
            scrollEventThrottle={16}
          >
            <TouchableWithoutFeedback
              onPress={(event) => {
                const tapX = event.nativeEvent.locationX
                const index = Math.round((tapX / chartWidth) * (chartData.data.length - 1))
                if (index >= 0 && index < chartData.data.length) {
                  setSelectedIndex(index)
                }
              }}
            >
              <View style={{ width: chartWidth + rightPadding }}>
                {/* Area Chart for fill */}
                <AreaChart
                  style={{ height: chartHeight, width: chartWidth, position: "absolute", zIndex: 2 }}
                  data={chartData.data}
                  contentInset={contentInset}
                  yMin={exactYMin}
                  yMax={exactYMax}
                  svg={{
                    fill: stats && stats.endBalance >= 0 ? "rgba(39, 174, 96, 0.2)" : "rgba(231, 76, 60, 0.2)",
                  }}
                />

                {/* Line Chart with perfectly aligned grid lines */}
                <LineChart
                  style={{ height: chartHeight, width: chartWidth, zIndex: 3 }}
                  data={chartData.data}
                  contentInset={contentInset}
                  yMin={exactYMin}
                  yMax={exactYMax}
                  svg={{
                    stroke: stats && stats.endBalance >= 0 ? "#27ae60" : "#e74c3c",
                    strokeWidth: 3,
                  }}
                >
                  <GridLines />
                  <DateLabels />
                  <Decorator />
                  <Tooltip />
                </LineChart>
              </View>
            </TouchableWithoutFeedback>
          </ScrollView>
        </View>
      </View>

      {/* Balance Info Section */}
      {stats && (
        <View style={[styles.balanceInfoContainer, isDarkMode && { backgroundColor: "#1E1E1E" }]}>
          <View style={styles.balanceInfoGrid}>
            <View style={styles.balanceInfoRow}>
              <View style={styles.balanceInfoItem}>
                <Text style={[styles.balanceInfoLabel, isDarkMode && { color: "#AAA" }]}>First Transaction</Text>
                <Text
                  style={[
                    styles.balanceInfoValue,
                    { color: stats.firstTransactionAmount >= 0 ? "#27ae60" : "#e74c3c" },
                    isDarkMode && { fontWeight: "600" },
                  ]}
                >
                  {stats.firstTransactionAmount >= 0 ? "+" : ""}
                  {formatCurrency(stats.firstTransactionAmount)} AED
                </Text>
              </View>

              <View style={styles.balanceInfoItem}>
                <Text style={[styles.balanceInfoLabel, isDarkMode && { color: "#AAA" }]}>End Balance</Text>
                <Text
                  style={[
                    styles.balanceInfoValue,
                    { color: stats.endBalance >= 0 ? "#27ae60" : "#e74c3c" },
                    isDarkMode && { fontWeight: "600" },
                  ]}
                >
                  {formatCurrency(stats.endBalance)} AED
                </Text>
              </View>
            </View>

            <View style={styles.balanceInfoRow}>
              <View style={styles.balanceInfoItem}>
                <Text style={[styles.balanceInfoLabel, isDarkMode && { color: "#AAA" }]}>Highest Balance</Text>
                <Text
                  style={[
                    styles.balanceInfoValue,
                    { color: stats.maxBalance >= 0 ? "#27ae60" : "#e74c3c" },
                    isDarkMode && { fontWeight: "600" },
                  ]}
                >
                  {formatCurrency(stats.maxBalance)} AED
                </Text>
              </View>

              <View style={styles.balanceInfoItem}>
                <Text style={[styles.balanceInfoLabel, isDarkMode && { color: "#AAA" }]}>Lowest Balance</Text>
                <Text
                  style={[
                    styles.balanceInfoValue,
                    { color: stats.minBalance >= 0 ? "#27ae60" : "#e74c3c" },
                    isDarkMode && { fontWeight: "600" },
                  ]}
                >
                  {formatCurrency(stats.minBalance)} AED
                </Text>
              </View>
            </View>
          </View>

          <View style={[styles.trendIndicator, isDarkMode && { backgroundColor: "#2A2A2A" }]}>
            <MaterialIcons
              name={stats.change >= 0 ? "trending-up" : "trending-down"}
              size={20}
              color={stats.change >= 0 ? "#27ae60" : "#e74c3c"}
            />
            <Text
              style={[
                styles.trendText,
                { color: stats.change >= 0 ? "#27ae60" : "#e74c3c" },
                isDarkMode && { fontWeight: "600" },
              ]}
            >
              {stats.change >= 0 ? "Positive" : "Negative"} trend over{" "}
              {chartData.useTransactionLevel ? `${stats.totalTransactions} transactions` : `${stats.days} days`}
            </Text>
          </View>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
  },
  emptyContainer: {
    height: 440,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
    borderRadius: 8,
    padding: 20,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginTop: 16,
    textAlign: "center",
  },
  emptySubtext: {
    fontSize: 14,
    color: "#666",
    marginTop: 8,
    textAlign: "center",
    lineHeight: 20,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  statItem: {
    alignItems: "center",
    flex: 1,
  },
  statLabel: {
    fontSize: 11,
    color: "#666",
    marginBottom: 2,
  },
  statValue: {
    fontSize: 12,
    fontWeight: "600",
    color: "#333",
    textAlign: "center",
  },
  zoomContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
    backgroundColor: "#f0f0f0",
    borderRadius: 20,
    padding: 4,
    alignSelf: "center",
  },
  commonButton: {
    width: 60, // Increased width to comfortably fit "Icon Fit" on one line
    height: 30, // Slightly increased height as requested
    borderRadius: 20, // Half of height for consistent rounded corners
    backgroundColor: "#fff",
    justifyContent: "center", // Center content horizontally
    alignItems: "center", // Center content vertically
    marginHorizontal: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1,
    elevation: 2,
  },
  fitButtonText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#333",
    marginLeft: 3,
  },
  zoomLevelText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#333",
  },
  dotIndicatorContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f8f9fa",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: 16,
    alignSelf: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  dotIndicatorText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#333",
    marginLeft: 6,
  },
  chartContainer: {
    flexDirection: "row",
    height: 320, // Increased for date labels
    marginBottom: 20,
  },
  fixedAmountColumn: {
    width: 30,
    height: 320, // Increased for date labels
    position: "relative",
    backgroundColor: "#ffffff",
    zIndex: 3,
  },
  fixedAmountLabel: {
    position: "absolute",
    right: 5,
    width: 30,
    height: 20,
    justifyContent: "center",
    alignItems: "flex-end",
    backgroundColor: "#ffffff",
    zIndex: 4,
  },
  amountLabel: {
    fontSize: 10,
    color: "#333",
    fontWeight: "500",
  },
  verticalSeparator: {
    width: 1,
    height: 320, // Increased for date labels
    backgroundColor: "#e0e0e0",
    zIndex: 2,
  },
  scrollableChartArea: {
    flex: 1,
    position: "relative",
  },
  balanceInfoContainer: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: "#eee",
  },
  balanceInfoGrid: {
    marginBottom: 16,
  },
  balanceInfoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  balanceInfoItem: {
    alignItems: "center",
    flex: 1,
  },
  balanceInfoLabel: {
    fontSize: 11,
    color: "#666",
    marginBottom: 4,
    textAlign: "center",
  },
  balanceInfoValue: {
    fontSize: 13,
    fontWeight: "600",
    color: "#333",
    textAlign: "center",
  },
  trendIndicator: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f8f9fa",
    borderRadius: 8,
    padding: 12,
  },
  trendText: {
    fontSize: 14,
    fontWeight: "500",
    marginLeft: 8,
  },
})

export default TrendChart