"use client"

import type React from "react"
import { useState } from "react"
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions } from "react-native"
import { MaterialIcons } from "@expo/vector-icons"
import { useTheme } from "../context/ThemeContext"
import { getCategoryEmoji, formatCategoryName } from "../utils/categorizer"
import { generateNiceScale, formatChartLabel } from "../utils/chart-utils"

interface CategoryData {
  name: string
  amount: number
  color: string
  category: string
}

interface CombinedCategoryChartProps {
  inflowData: CategoryData[]
  expenseData: CategoryData[]
  isDarkMode?: boolean
  maxItems?: number
}

const CombinedCategoryChart: React.FC<CombinedCategoryChartProps> = ({
  inflowData,
  expenseData,
  isDarkMode = false,
  maxItems = 8,
}) => {
  const { isDarkMode: themeIsDarkMode } = useTheme()
  const darkMode = isDarkMode || themeIsDarkMode
  const screenWidth = Dimensions.get("window").width

  const [activeTab, setActiveTab] = useState<"inflow" | "expenses">("expenses")

  // Get current data based on active tab
  const currentData = activeTab === "inflow" ? inflowData : expenseData
  const chartData = currentData.slice(0, maxItems).sort((a, b) => b.amount - a.amount)

  if (chartData.length === 0) {
    return (
      <View style={[styles.container, darkMode && { backgroundColor: "#2A2A2A" }]}>
        {/* Tab Selector */}
        <View style={[styles.tabContainer, darkMode && { backgroundColor: "#333" }]}>
          <TouchableOpacity
            style={[
              styles.tab,
              activeTab === "expenses" && (isDarkMode ? { backgroundColor: "#2A2A2A" } : styles.activeTab),
            ]}
            onPress={() => setActiveTab("expenses")}
          >
            <MaterialIcons
              name="trending-down"
              size={18}
              color={activeTab === "expenses" ? (isDarkMode ? "#e74c3c" : "#e74c3c") : isDarkMode ? "#AAA" : "#666"}
            />
            <Text
              style={[
                styles.tabText,
                isDarkMode && { color: "#AAA" },
                activeTab === "expenses" && (isDarkMode ? { color: "#e74c3c" } : styles.activeTabText),
              ]}
            >
              Expenses
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tab,
              activeTab === "inflow" && (isDarkMode ? { backgroundColor: "#2A2A2A" } : styles.activeTab),
            ]}
            onPress={() => setActiveTab("inflow")}
          >
            <MaterialIcons
              name="trending-up"
              size={18}
              color={activeTab === "inflow" ? (isDarkMode ? "#27ae60" : "#27ae60") : isDarkMode ? "#AAA" : "#666"}
            />
            <Text
              style={[
                styles.tabText,
                isDarkMode && { color: "#AAA" },
                activeTab === "inflow" && (isDarkMode ? { color: "#27ae60" } : styles.activeTabText),
              ]}
            >
              Inflow
            </Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.emptyContainer, darkMode && { backgroundColor: "#2A2A2A" }]}>
          <Text style={[styles.emptyText, darkMode && { color: "#AAA" }]}>No {activeTab} data available</Text>
        </View>
      </View>
    )
  }

  // Calculate chart dimensions
  const chartHeight = 200
  const maxAmount = Math.max(...chartData.map((item) => item.amount))
  const columnWidth = Math.min(40, (screenWidth - 40) / chartData.length - 8)

  // Format currency
  const formatCurrency = (amount: number) => {
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
  const scaleMax = yAxisLabels[0].value

  return (
    <View style={styles.container}>
      {/* Tab Selector */}
      <View style={[styles.tabContainer, darkMode && { backgroundColor: "#333" }]}>
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === "expenses" && (isDarkMode ? { backgroundColor: "#2A2A2A" } : styles.activeTab),
          ]}
          onPress={() => setActiveTab("expenses")}
        >
          <MaterialIcons
            name="trending-down"
            size={18}
            color={activeTab === "expenses" ? (isDarkMode ? "#e74c3c" : "#e74c3c") : isDarkMode ? "#AAA" : "#666"}
          />
          <Text
            style={[
              styles.tabText,
              isDarkMode && { color: "#AAA" },
              activeTab === "expenses" && (isDarkMode ? { color: "#e74c3c" } : styles.activeTabText),
            ]}
          >
            Expenses ({expenseData.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === "inflow" && (isDarkMode ? { backgroundColor: "#2A2A2A" } : styles.activeTab),
          ]}
          onPress={() => setActiveTab("inflow")}
        >
          <MaterialIcons
            name="trending-up"
            size={18}
            color={activeTab === "inflow" ? (isDarkMode ? "#27ae60" : "#27ae60") : isDarkMode ? "#AAA" : "#666"}
          />
          <Text
            style={[
              styles.tabText,
              isDarkMode && { color: "#AAA" },
              activeTab === "inflow" && (isDarkMode ? { color: "#27ae60" } : styles.activeTabText),
            ]}
          >
            Inflow ({inflowData.length})
          </Text>
        </TouchableOpacity>
      </View>

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
              const columnHeight = (item.amount / scaleMax) * chartHeight
              const fillColor = item.color
              const strokeColor = activeTab === "inflow" ? "#27ae60" : "#e74c3c"

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
  tabContainer: {
    flexDirection: "row",
    backgroundColor: "#e0e0e0",
    borderRadius: 25,
    marginBottom: 16,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 21,
    flexDirection: "row",
    justifyContent: "center",
  },
  activeTab: {
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
    elevation: 2,
  },
  tabText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#666",
    marginLeft: 6,
  },
  activeTabText: {
    color: "#333",
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

export default CombinedCategoryChart
