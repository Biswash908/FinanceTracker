"use client"

import type React from "react"
import { useMemo } from "react"
import { View, Text, StyleSheet, Dimensions, ScrollView } from "react-native"
import { LineChart } from "react-native-chart-kit"
import { useTheme } from "../context/ThemeContext"

interface Transaction {
  timestamp?: string
  date?: string
  amount?: string | number
  description?: string
  [key: string]: any
}

interface TrendChartProps {
  transactions: Transaction[]
  isDarkMode?: boolean
}

interface TrendDataPoint {
  date: string
  dateObj: Date
  balance: number
  dailyChange: number
  transactionCount: number
}

const TrendChart: React.FC<TrendChartProps> = ({ transactions, isDarkMode = false }) => {
  const { isDarkMode: themeIsDarkMode } = useTheme()
  const darkMode = isDarkMode || themeIsDarkMode
  const screenWidth = Dimensions.get("window").width

  // Generate comprehensive trend data from transactions
  const trendData = useMemo(() => {
    if (!transactions || transactions.length === 0) return []

    // Sort transactions by date (oldest first for running balance calculation)
    const sortedTransactions = [...transactions].sort((a, b) => {
      const dateA = new Date(a.timestamp || a.date || 0).getTime()
      const dateB = new Date(b.timestamp || b.date || 0).getTime()
      return dateA - dateB
    })

    // Get the date range from the transactions
    const firstTransactionDate = new Date(sortedTransactions[0].timestamp || sortedTransactions[0].date || 0)
    const lastTransactionDate = new Date(
      sortedTransactions[sortedTransactions.length - 1].timestamp ||
        sortedTransactions[sortedTransactions.length - 1].date ||
        0,
    )

    // Create a complete date range (fill in missing days)
    const dateRange: Date[] = []
    const currentDate = new Date(firstTransactionDate)
    currentDate.setHours(0, 0, 0, 0) // Start at beginning of day

    while (currentDate <= lastTransactionDate) {
      dateRange.push(new Date(currentDate))
      currentDate.setDate(currentDate.getDate() + 1)
    }

    // Group transactions by date
    const transactionsByDate = new Map<string, Transaction[]>()
    sortedTransactions.forEach((transaction) => {
      const date = new Date(transaction.timestamp || transaction.date || 0)
      const dateKey = date.toISOString().split("T")[0] // YYYY-MM-DD format

      if (!transactionsByDate.has(dateKey)) {
        transactionsByDate.set(dateKey, [])
      }
      transactionsByDate.get(dateKey)!.push(transaction)
    })

    // Calculate running balance for each day
    let runningBalance = 0
    const trendPoints: TrendDataPoint[] = []

    dateRange.forEach((date) => {
      const dateKey = date.toISOString().split("T")[0]
      const dayTransactions = transactionsByDate.get(dateKey) || []

      // Calculate daily change
      const dailyChange = dayTransactions.reduce((sum, transaction) => {
        return sum + Number.parseFloat(String(transaction.amount || 0))
      }, 0)

      // Update running balance
      runningBalance += dailyChange

      trendPoints.push({
        date: dateKey,
        dateObj: new Date(date),
        balance: runningBalance,
        dailyChange,
        transactionCount: dayTransactions.length,
      })
    })

    return trendPoints
  }, [transactions])

  if (!trendData || trendData.length === 0) {
    return (
      <View style={[styles.emptyContainer, darkMode && { backgroundColor: "#2A2A2A" }]}>
        <Text style={[styles.emptyText, darkMode && { color: "#AAA" }]}>No trend data available</Text>
      </View>
    )
  }

  // Calculate chart dimensions and data
  const balanceData = trendData.map((item) => item.balance)
  const minBalance = Math.min(...balanceData)
  const maxBalance = Math.max(...balanceData)

  // Create a baseline at zero or adjust range to include zero
  const hasNegativeBalance = minBalance < 0
  const hasPositiveBalance = maxBalance > 0

  // Adjust the range to always include zero as a reference line
  let adjustedMin = minBalance
  let adjustedMax = maxBalance

  if (hasNegativeBalance && hasPositiveBalance) {
    // Both positive and negative - keep natural range but ensure zero is visible
    const range = maxBalance - minBalance
    const padding = range * 0.1 // 10% padding
    adjustedMin = Math.min(minBalance - padding, -Math.abs(maxBalance) * 0.1)
    adjustedMax = Math.max(maxBalance + padding, Math.abs(minBalance) * 0.1)
  } else if (hasNegativeBalance) {
    // Only negative balances - extend to show zero line
    adjustedMax = Math.max(0, maxBalance * 1.1)
    adjustedMin = minBalance * 1.1
  } else {
    // Only positive balances - extend to show zero line
    adjustedMin = Math.min(0, minBalance * 0.9)
    adjustedMax = maxBalance * 1.1
  }

  // Generate labels - show dates at regular intervals
  const labels = trendData.map((item, index) => {
    const totalPoints = trendData.length
    let labelInterval = 1

    // Adjust label interval based on data length
    if (totalPoints > 30) labelInterval = Math.floor(totalPoints / 8)
    else if (totalPoints > 14) labelInterval = Math.floor(totalPoints / 6)
    else if (totalPoints > 7) labelInterval = Math.floor(totalPoints / 4)

    if (index % labelInterval === 0 || index === totalPoints - 1) {
      const date = new Date(item.date)
      return `${date.getMonth() + 1}/${date.getDate()}`
    }
    return ""
  })

  // Chart configuration
  const chartConfig = {
    backgroundGradientFrom: darkMode ? "#1E1E1E" : "#fff",
    backgroundGradientTo: darkMode ? "#1E1E1E" : "#fff",
    decimalPlaces: 0,
    color: (opacity = 1) => {
      // Color based on current balance and trend
      const currentBalance = balanceData[balanceData.length - 1]
      const startBalance = balanceData[0]
      const isPositiveTrend = currentBalance >= startBalance

      if (currentBalance < 0) {
        return `rgba(231, 76, 60, ${opacity})` // Red for negative balance
      } else if (isPositiveTrend) {
        return `rgba(39, 174, 96, ${opacity})` // Green for positive trend
      } else {
        return `rgba(255, 193, 7, ${opacity})` // Yellow/orange for declining but positive
      }
    },
    labelColor: (opacity = 1) => (darkMode ? `rgba(255, 255, 255, ${opacity})` : `rgba(0, 0, 0, ${opacity})`),
    style: {
      borderRadius: 16,
    },
    propsForDots: {
      r: "3",
      strokeWidth: "2",
      stroke: darkMode ? "#fff" : "#333",
    },
    propsForLabels: {
      fontSize: 10,
    },
    fillShadowGradient: darkMode ? "#333" : "#f0f0f0",
    fillShadowGradientOpacity: 0.3,
  }

  // Format Y-axis labels
  const formatYLabel = (value: string) => {
    const num = Number.parseFloat(value)
    if (Math.abs(num) >= 1000000) return `${(num / 1000000).toFixed(1)}M`
    if (Math.abs(num) >= 1000) return `${(num / 1000).toFixed(0)}K`
    return num.toFixed(0)
  }

  // Calculate chart width for horizontal scrolling
  const minChartWidth = screenWidth - 64
  const optimalPointWidth = 25 // Optimal spacing between points
  const calculatedWidth = Math.max(minChartWidth, trendData.length * optimalPointWidth)

  // Get trend statistics
  const totalChange = maxBalance - minBalance
  const startBalance = balanceData[0]
  const endBalance = balanceData[balanceData.length - 1]
  const netChange = endBalance - startBalance
  const totalTransactions = trendData.reduce((sum, point) => sum + point.transactionCount, 0)

  // Find significant points (highest and lowest)
  const highestPoint = trendData.find((point) => point.balance === maxBalance)
  const lowestPoint = trendData.find((point) => point.balance === minBalance)

  return (
    <View style={styles.container}>
      {/* Trend Statistics */}
      <View style={styles.statsContainer}>
        <View style={styles.statRow}>
          <View style={styles.statItem}>
            <Text style={[styles.statLabel, darkMode && { color: "#AAA" }]}>Period</Text>
            <Text style={[styles.statValue, darkMode && { color: "#FFF" }]}>{trendData.length} days</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statLabel, darkMode && { color: "#AAA" }]}>Transactions</Text>
            <Text style={[styles.statValue, darkMode && { color: "#FFF" }]}>{totalTransactions}</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statLabel, darkMode && { color: "#AAA" }]}>Net Change</Text>
            <Text
              style={[
                styles.statValue,
                { color: netChange >= 0 ? "#27ae60" : "#e74c3c" },
                darkMode && { fontWeight: "600" },
              ]}
            >
              {netChange >= 0 ? "+" : ""}
              {formatYLabel(netChange.toString())} AED
            </Text>
          </View>
        </View>
      </View>

      {/* Chart with horizontal scroll */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={true}
        style={styles.chartScrollContainer}
        contentContainerStyle={styles.chartScrollContent}
      >
        <LineChart
          data={{
            labels,
            datasets: [
              {
                data: balanceData,
                color: (opacity = 1) => {
                  const currentBalance = balanceData[balanceData.length - 1]
                  const startBalance = balanceData[0]
                  const isPositiveTrend = currentBalance >= startBalance

                  if (currentBalance < 0) {
                    return `rgba(231, 76, 60, ${opacity})`
                  } else if (isPositiveTrend) {
                    return `rgba(39, 174, 96, ${opacity})`
                  } else {
                    return `rgba(255, 193, 7, ${opacity})`
                  }
                },
                strokeWidth: 3,
              },
            ],
          }}
          width={calculatedWidth}
          height={250}
          chartConfig={chartConfig}
          bezier={false}
          style={styles.chart}
          formatYLabel={formatYLabel}
          withInnerLines={true}
          withOuterLines={true}
          withVerticalLines={false}
          withHorizontalLines={true}
          segments={6}
          withDots={trendData.length <= 50}
          withShadow={true}
          fromZero={false} // Allow negative values
        />
      </ScrollView>

      {/* Balance Range and Key Points */}
      <View style={styles.balanceInfo}>
        <View style={styles.balanceRow}>
          <View style={styles.balanceItem}>
            <Text style={[styles.balanceLabel, darkMode && { color: "#AAA" }]}>Start Balance</Text>
            <Text
              style={[
                styles.balanceValue,
                { color: startBalance >= 0 ? "#27ae60" : "#e74c3c" },
                darkMode && { fontWeight: "600" },
              ]}
            >
              {formatYLabel(startBalance.toString())} AED
            </Text>
          </View>
          <View style={styles.balanceItem}>
            <Text style={[styles.balanceLabel, darkMode && { color: "#AAA" }]}>End Balance</Text>
            <Text
              style={[
                styles.balanceValue,
                { color: endBalance >= 0 ? "#27ae60" : "#e74c3c" },
                darkMode && { fontWeight: "600" },
              ]}
            >
              {formatYLabel(endBalance.toString())} AED
            </Text>
          </View>
        </View>

        {highestPoint && lowestPoint && (
          <View style={styles.balanceRow}>
            <View style={styles.balanceItem}>
              <Text style={[styles.balanceLabel, darkMode && { color: "#AAA" }]}>Highest</Text>
              <Text style={[styles.balanceValue, { color: "#27ae60" }, darkMode && { fontWeight: "600" }]}>
                {formatYLabel(highestPoint.balance.toString())} AED
              </Text>
              <Text style={[styles.balanceDate, darkMode && { color: "#888" }]}>
                {new Date(highestPoint.date).toLocaleDateString()}
              </Text>
            </View>
            <View style={styles.balanceItem}>
              <Text style={[styles.balanceLabel, darkMode && { color: "#AAA" }]}>Lowest</Text>
              <Text style={[styles.balanceValue, { color: "#e74c3c" }, darkMode && { fontWeight: "600" }]}>
                {formatYLabel(lowestPoint.balance.toString())} AED
              </Text>
              <Text style={[styles.balanceDate, darkMode && { color: "#888" }]}>
                {new Date(lowestPoint.date).toLocaleDateString()}
              </Text>
            </View>
          </View>
        )}
      </View>

      {/* Instructions */}
      <View style={styles.instructions}>
        <Text style={[styles.instructionText, darkMode && { color: "#888" }]}>
          Scroll horizontally to view the complete trend • Zero line represents balance baseline
        </Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    marginVertical: 8,
  },
  statsContainer: {
    width: "100%",
    marginBottom: 16,
  },
  statRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingHorizontal: 8,
  },
  statItem: {
    alignItems: "center",
    flex: 1,
  },
  statLabel: {
    fontSize: 12,
    color: "#666",
    marginBottom: 4,
  },
  statValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
  },
  chartScrollContainer: {
    width: "100%",
    marginBottom: 16,
  },
  chartScrollContent: {
    paddingHorizontal: 8,
  },
  chart: {
    borderRadius: 16,
    paddingRight: 0,
  },
  balanceInfo: {
    width: "100%",
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  balanceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  balanceItem: {
    alignItems: "center",
    flex: 1,
  },
  balanceLabel: {
    fontSize: 11,
    color: "#666",
    marginBottom: 2,
  },
  balanceValue: {
    fontSize: 13,
    fontWeight: "600",
    color: "#333",
  },
  balanceDate: {
    fontSize: 10,
    color: "#888",
    marginTop: 2,
  },
  instructions: {
    paddingHorizontal: 16,
  },
  instructionText: {
    fontSize: 10,
    color: "#888",
    textAlign: "center",
    fontStyle: "italic",
  },
  emptyContainer: {
    height: 250,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
    borderRadius: 16,
    marginVertical: 8,
  },
  emptyText: {
    fontSize: 16,
    color: "#666",
  },
})

export default TrendChart
