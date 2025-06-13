"use client"

import type React from "react"
import { View, Text, StyleSheet, ScrollView, Dimensions } from "react-native"
import { useTheme } from "../context/ThemeContext"
import { getCategoryEmoji, formatCategoryName } from "../utils/categorizer"

interface CategoryData {
  name: string
  amount: number
  color: string
  category: string
}

interface ImprovedColumnChartProps {
  data: CategoryData[]
  isIncome?: boolean
  maxItems?: number
}

const ImprovedColumnChart: React.FC<ImprovedColumnChartProps> = ({ data, isIncome = false, maxItems = 8 }) => {
  const { isDarkMode } = useTheme()
  const screenWidth = Dimensions.get("window").width

  // Limit data and sort by amount
  const chartData = data.slice(0, maxItems).sort((a, b) => b.amount - a.amount)

  if (chartData.length === 0) {
    return (
      <View style={[styles.emptyContainer, isDarkMode && { backgroundColor: "#2A2A2A" }]}>
        <Text style={[styles.emptyText, isDarkMode && { color: "#AAA" }]}>No data available</Text>
      </View>
    )
  }

  // Calculate chart dimensions - make wider
  const chartHeight = 200
  const maxAmount = Math.max(...chartData.map((item) => item.amount))
  const columnWidth = Math.min(40, (screenWidth - 40) / chartData.length - 8) // Increased width from 80 to 100

  // Format currency
  const formatCurrency = (amount: number) => {
    return amount.toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })
  }

  // Generate Y-axis labels
  const generateYAxisLabels = () => {
    const steps = 5
    const stepValue = maxAmount / steps
    const labels = []

    for (let i = 0; i <= steps; i++) {
      const value = stepValue * i
      labels.push({
        value,
        label:
          value >= 1000000
            ? `${(value / 1000000).toFixed(1)}M`
            : value >= 1000
              ? `${(value / 1000).toFixed(0)}K`
              : value.toFixed(0),
      })
    }

    return labels.reverse()
  }

  const yAxisLabels = generateYAxisLabels()

  // Convert hex color to rgba with 50% opacity
  // const hexToRgba = (hex: string, opacity = 0.5) => {
  //   const r = Number.parseInt(hex.slice(1, 3), 16)
  //   const g = Number.parseInt(hex.slice(3, 5), 16)
  //   const b = Number.parseInt(hex.slice(5, 7), 16)
  //   return `rgba(${r}, ${g}, ${b}, ${opacity})`
  // }

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

        {/* Chart with horizontal scroll */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.chartScrollView}
          contentContainerStyle={styles.chartContent}
        >
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
            {chartData.map((item, index) => {
              const columnHeight = (item.amount / maxAmount) * chartHeight
              const fillColor = item.color // Use full category color instead of opacity
              const strokeColor = isIncome ? "#27ae60" : "#e74c3c" // Green for income, red for expenses

              return (
                <View key={index} style={[styles.columnContainer, { width: columnWidth }]}>
                  <View
                    style={[
                      styles.column,
                      {
                        height: columnHeight,
                        backgroundColor: fillColor,
                        borderColor: strokeColor,
                        borderWidth: 1,
                        width: columnWidth,
                      },
                    ]}
                  />
                </View>
              )
            })}
          </View>
        </ScrollView>
      </View>

      {/* Category List */}
      <View style={styles.categoryListContainer}>
        {chartData.map((item, index) => (
          <View key={index} style={styles.categoryListItem}>
            <View style={styles.categoryNameContainer}>
              <View
                style={[
                  styles.categoryColorDot,
                  {
                    backgroundColor: item.color,
                  },
                ]}
              />
              <Text style={[styles.categoryFullName, isDarkMode && { color: "#DDD" }]}>
                {getCategoryEmoji(item.category)} {formatCategoryName(item.category)}
              </Text>
            </View>
            <Text style={[styles.categoryAmount, { color: item.color }, isDarkMode && { fontWeight: "600" }]}>
              {formatCurrency(item.amount)} AED
            </Text>
          </View>
        ))}
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
  chartScrollView: {
    flex: 1,
  },
  chartContent: {
    paddingRight: 8, // Reduced padding
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
    paddingHorizontal: 4,
  },
  columnContainer: {
    alignItems: "center",
    marginHorizontal: 4,
  },
  column: {
    borderRadius: 4,
    minHeight: 4,
  },
  categoryListContainer: {
    marginTop: 16,
  },
  categoryListItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  categoryNameContainer: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  categoryColorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  categoryFullName: {
    fontSize: 14,
    color: "#333",
    flex: 1,
  },
  categoryAmount: {
    fontSize: 14,
    fontWeight: "bold",
    textAlign: "right",
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

export default ImprovedColumnChart
