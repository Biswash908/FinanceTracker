"use client"

import type React from "react"
import { View, Text, StyleSheet, Dimensions } from "react-native"
import { generateNiceScale, formatChartLabel } from "../utils/chart-utils"

interface IncomeExpenseChartProps {
  income: number
  expenses: number
  isDarkMode?: boolean
}

const IncomeExpenseChart: React.FC<IncomeExpenseChartProps> = ({ income, expenses, isDarkMode = false }) => {
  const screenWidth = Dimensions.get("window").width

  // Prepare data
  const data = [
    { name: "Income", amount: income, color: "#27ae60" }, // Green
    { name: "Expenses", amount: Math.abs(expenses), color: "#e74c3c" }, // Red
  ]

  if (income === 0 && expenses === 0) {
    return (
      <View style={[styles.emptyContainer, isDarkMode && { backgroundColor: "#2A2A2A" }]}>
        <Text style={[styles.emptyText, isDarkMode && { color: "#AAA" }]}>No data available</Text>
      </View>
    )
  }

  // Calculate chart dimensions
  const chartHeight = 200
  const maxAmount = Math.max(income, Math.abs(expenses))
  const columnWidth = Math.min(80, (screenWidth - 120) / 2) // Two columns with spacing

  // Format currency
  const formatCurrency = (amount: number) => {
    if (amount >= 1000000) {
      return `${(amount / 1000000).toFixed(1)}M`
    }
    if (amount >= 1000) {
      return `${(amount / 1000).toFixed(0)}K`
    }
    return amount.toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })
  }

  // Generate Y-axis labels with nice scale
  const generateYAxisLabels = () => {
    const scaleValues = generateNiceScale(maxAmount, 5)

    return scaleValues.map((value) => ({
      value,
      label: formatChartLabel(value),
    }))
  }

  const yAxisLabels = generateYAxisLabels()
  const scaleMax = yAxisLabels[0].value // First item is the highest value

  return (
    <View style={styles.container}>
      {/* Chart Area */}
      <View style={styles.chartContainer}>
        {/* Y-Axis */}
        <View style={styles.yAxis}>
          {yAxisLabels.map((label, index) => (
            <View key={index} style={styles.yAxisLabelContainer}>
              <Text style={[styles.yAxisLabel, isDarkMode && { color: "#AAA" }]}>{label.label}</Text>
            </View>
          ))}
        </View>

        {/* Chart */}
        <View style={styles.chartContent}>
          {/* Grid lines */}
          <View style={[styles.gridContainer, { height: chartHeight }]}>
            {yAxisLabels.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.gridLine,
                  { top: (chartHeight / (yAxisLabels.length - 1)) * index },
                  isDarkMode && { borderColor: "#333" },
                ]}
              />
            ))}
          </View>

          {/* Columns */}
          <View style={[styles.columnsContainer, { height: chartHeight }]}>
            {data.map((item, index) => {
              const columnHeight = scaleMax > 0 ? (item.amount / scaleMax) * chartHeight : 0

              return (
                <View key={index} style={[styles.columnContainer, { width: columnWidth }]}>
                  <View
                    style={[
                      styles.column,
                      {
                        height: Math.max(columnHeight, 4), // Minimum height
                        backgroundColor: item.color,
                        borderColor: item.color,
                        borderWidth: 1,
                        width: columnWidth,
                      },
                    ]}
                  />
                  {/* Column Label */}
                  <Text style={[styles.columnLabel, isDarkMode && { color: "#DDD" }]}>{item.name}</Text>
                </View>
              )
            })}
          </View>
        </View>
      </View>

      {/* Summary List */}
      <View style={styles.summaryContainer}>
        {data.map((item, index) => (
          <View key={index} style={styles.summaryItem}>
            <View style={styles.summaryNameContainer}>
              <View
                style={[
                  styles.summaryColorDot,
                  {
                    backgroundColor: item.color,
                  },
                ]}
              />
              <Text style={[styles.summaryName, isDarkMode && { color: "#DDD" }]}>
                {item.name === "Income" ? "💰" : "💸"} {item.name}
              </Text>
            </View>
            <Text style={[styles.summaryAmount, { color: item.color }, isDarkMode && { fontWeight: "600" }]}>
              {formatCurrency(item.amount)} AED
            </Text>
          </View>
        ))}

        {/* Net Balance */}
        <View style={[styles.summaryItem, styles.netBalanceItem]}>
          <View style={styles.summaryNameContainer}>
            <View
              style={[
                styles.summaryColorDot,
                {
                  backgroundColor: income - Math.abs(expenses) >= 0 ? "#27ae60" : "#e74c3c",
                },
              ]}
            />
            <Text style={[styles.summaryName, styles.netBalanceText, isDarkMode && { color: "#FFF" }]}>
              📊 Net Balance
            </Text>
          </View>
          <Text
            style={[
              styles.summaryAmount,
              styles.netBalanceAmount,
              { color: income - Math.abs(expenses) >= 0 ? "#27ae60" : "#e74c3c" },
              isDarkMode && { fontWeight: "600" },
            ]}
          >
            {formatCurrency(Math.abs(income - Math.abs(expenses)))} AED
          </Text>
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
  },
  chartContainer: {
    flexDirection: "row",
    height: 200,
    marginBottom: 16,
  },
  yAxis: {
    width: 50,
    height: 200,
    justifyContent: "space-between",
    paddingRight: 8,
  },
  yAxisLabelContainer: {
    height: 20,
    justifyContent: "center",
    alignItems: "flex-end",
  },
  yAxisLabel: {
    fontSize: 10,
    color: "#666",
    textAlign: "right",
  },
  chartContent: {
    flex: 1,
    paddingRight: 8,
  },
  gridContainer: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
  },
  gridLine: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 1,
    borderTopWidth: 1,
    borderColor: "#f0f0f0",
    borderStyle: "dashed",
  },
  columnsContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-around",
    paddingHorizontal: 20,
  },
  columnContainer: {
    alignItems: "center",
    marginHorizontal: 8,
  },
  column: {
    borderRadius: 4,
    minHeight: 4,
  },
  columnLabel: {
    fontSize: 12,
    color: "#333",
    marginTop: 8,
    textAlign: "center",
    fontWeight: "600",
  },
  summaryContainer: {
    marginTop: 16,
  },
  summaryItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  netBalanceItem: {
    borderTopWidth: 2,
    borderTopColor: "#ddd",
    marginTop: 8,
    paddingTop: 12,
  },
  summaryNameContainer: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  summaryColorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  summaryName: {
    fontSize: 14,
    color: "#333",
    flex: 1,
  },
  netBalanceText: {
    fontWeight: "600",
  },
  summaryAmount: {
    fontSize: 14,
    fontWeight: "bold",
    textAlign: "right",
  },
  netBalanceAmount: {
    fontSize: 16,
    fontWeight: "800",
  },
  emptyContainer: {
    height: 200,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
    borderRadius: 8,
    marginVertical: 16,
  },
  emptyText: {
    fontSize: 16,
    color: "#666",
  },
})

export default IncomeExpenseChart
