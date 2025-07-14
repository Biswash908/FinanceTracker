"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions } from "react-native"
import { MaterialIcons } from "@expo/vector-icons"
import { useTheme } from "../context/ThemeContext"
import { getCategoryEmoji, formatCategoryName } from "../utils/categorizer"
import { generateNiceScale, formatChartLabel } from "../utils/chart-utils"
import LoadingSpinner from "./LoadingSpinner"

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
  loading?: boolean
}

const CombinedCategoryChart: React.FC<CombinedCategoryChartProps> = ({
  inflowData,
  expenseData,
  isDarkMode = false,
  maxItems = 8,
  loading = false,
}) => {
  const { isDarkMode: themeIsDarkMode } = useTheme()
  const darkMode = isDarkMode || themeIsDarkMode
  const screenWidth = Dimensions.get("window").width

  const [activeTab, setActiveTab] = useState<"inflow" | "expenses">("expenses")
  const [hasInitialized, setHasInitialized] = useState(false)
  const [lastDataHash, setLastDataHash] = useState<string>("")
  const dataRef = useRef<{ inflowData: CategoryData[]; expenseData: CategoryData[] }>({
    inflowData: [],
    expenseData: [],
  })

  // Create a hash of the data to detect actual changes
  const createDataHash = (inflow: CategoryData[], expense: CategoryData[]) => {
    return JSON.stringify({
      inflow: inflow.map((d) => ({ name: d.name, amount: d.amount })),
      expense: expense.map((d) => ({ name: d.name, amount: d.amount })),
    })
  }

  // Smart loading logic - only show loading if data is actually changing
  useEffect(() => {
    const currentDataHash = createDataHash(inflowData, expenseData)

    // If we have the same data as before, don't show loading
    if (hasInitialized && currentDataHash === lastDataHash && !loading) {
      return
    }

    // If loading prop is false and we have data, mark as initialized
    if (!loading && (inflowData.length > 0 || expenseData.length > 0)) {
      setHasInitialized(true)
      setLastDataHash(currentDataHash)
      dataRef.current = { inflowData, expenseData }
    } else if (!loading && inflowData.length === 0 && expenseData.length === 0) {
      // If not loading and no data, still mark as initialized after a brief moment
      const timer = setTimeout(() => {
        setHasInitialized(true)
        setLastDataHash(currentDataHash)
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [loading, inflowData, expenseData, hasInitialized, lastDataHash])

  // Get current data based on active tab
  const currentData = activeTab === "inflow" ? inflowData : expenseData
  const chartData = currentData.slice(0, maxItems).sort((a, b) => b.amount - a.amount)

  // Show loading only if we haven't initialized or data is actually changing
  const shouldShowLoading = loading && (!hasInitialized || createDataHash(inflowData, expenseData) !== lastDataHash)

  // Show loading state
  if (shouldShowLoading) {
    return (
      <View style={[styles.container, darkMode && { backgroundColor: "#2A2A2A" }]}>
        {/* Tab Selector - Show even during loading */}
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

        {/* Loading Spinner */}
        <LoadingSpinner
          size="large"
          message="Loading category data..."
          isDarkMode={darkMode}
          style={styles.loadingContainer}
        />
      </View>
    )
  }

  // Show empty state
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

        {/* Empty State - Fixed height to prevent scrolling issues */}
        <View style={[styles.emptyContainer, darkMode && { backgroundColor: "#2A2A2A" }]}>
          <MaterialIcons
            name={activeTab === "expenses" ? "trending-down" : "trending-up"}
            size={48}
            color={darkMode ? "#555" : "#ccc"}
          />
          <Text style={[styles.emptyText, darkMode && { color: "#AAA" }]}>No {activeTab} data available</Text>
          <Text style={[styles.emptySubtext, darkMode && { color: "#777" }]}>
            Try selecting a different date range or check your transaction data
          </Text>
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

  // Generate Y-axis labels with nice scale - always start from 0
  const generateYAxisLabels = () => {
    if (maxAmount === 0) return [{ value: 0, label: "0" }]

    const scaleValues = generateNiceScale(maxAmount, 5)

    // Ensure 0 is always included and is at the bottom
    const valuesWithZero = scaleValues.includes(0) ? scaleValues : [...scaleValues, 0]
    const sortedValues = valuesWithZero.sort((a, b) => b - a) // Highest to lowest

    return sortedValues.map((value) => ({
      value,
      label: formatChartLabel(value),
    }))
  }

  const yAxisLabels = generateYAxisLabels()
  const scaleMax = yAxisLabels[0].value // First item is the highest value

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
        {/* Fixed Amount Labels - Outside Chart Area */}
        <View style={[styles.fixedAmountColumn, darkMode && { backgroundColor: "#1E1E1E" }]}>
          {yAxisLabels.map((label, index) => {
            const isZeroLine = label.value === 0
            const linePosition = index * (chartHeight / (yAxisLabels.length - 1))

            return (
              <View
                key={index}
                style={[
                  styles.fixedAmountLabel,
                  { top: linePosition - 10 },
                  darkMode && { backgroundColor: "#1E1E1E" },
                ]}
              >
                <Text
                  style={[
                    styles.amountLabel,
                    darkMode && { color: "#FFF" },
                    isZeroLine && {
                      fontWeight: "bold",
                      fontSize: 11,
                      color: darkMode ? "#FFF" : "#000",
                    },
                  ]}
                >
                  {label.label}
                </Text>
              </View>
            )
          })}
        </View>

        {/* Vertical Separator */}
        <View style={[styles.verticalSeparator, darkMode && { backgroundColor: "#333" }]} />

        {/* Chart with horizontal scroll */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.chartScrollView}
          contentContainerStyle={styles.chartContent}
        >
          {/* Grid lines with perfect alignment */}
          <View style={[styles.gridContainer, { height: chartHeight }]}>
            {yAxisLabels.map((label, index) => {
              const isZeroLine = label.value === 0
              const linePosition = index * (chartHeight / (yAxisLabels.length - 1))

              return (
                <View
                  key={index}
                  style={[
                    isZeroLine ? styles.zeroLine : styles.gridLine,
                    { top: linePosition },
                    darkMode && {
                      borderColor: isZeroLine ? (darkMode ? "#fff" : "#000") : "#333",
                    },
                  ]}
                />
              )
            })}
          </View>

          {/* Columns */}
          <View style={[styles.columnsContainer, { height: chartHeight }]}>
            {chartData.map((item, index) => {
              const columnHeight = scaleMax > 0 ? (item.amount / scaleMax) * chartHeight : 0
              const fillColor = item.color
              const strokeColor = activeTab === "inflow" ? "#27ae60" : "#e74c3c"

              return (
                <View key={index} style={[styles.columnContainer, { width: columnWidth }]}>
                  <View
                    style={[
                      styles.column,
                      {
                        height: Math.max(columnHeight, 4),
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
              <Text style={[styles.categoryFullName, darkMode && { color: "#DDD" }]}>
                {getCategoryEmoji(item.category)} {formatCategoryName(item.category)}
              </Text>
            </View>
            <Text style={[styles.categoryAmount, { color: item.color }, darkMode && { fontWeight: "600" }]}>
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
  loadingContainer: {
    paddingVertical: 60,
  },
  chartContainer: {
    flexDirection: "row",
    height: 200,
    marginBottom: 16,
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
    borderColor: "#ddd",
    borderStyle: "dotted",
  },
  columnsContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 4,
  },
  columnContainer: {
    alignItems: "center",
    marginHorizontal: 4,
    marginVertical: 0,
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
    height: 200, // Fixed height to prevent scrolling issues
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
    borderRadius: 8,
    marginVertical: 16,
    paddingHorizontal: 20,
  },
  emptyText: {
    fontSize: 16,
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
  zeroLine: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 1,
    borderTopWidth: 1,
    borderColor: "#000",
    borderStyle: "solid",
  },
  fixedAmountColumn: {
    width: 50,
    height: 200,
    position: "relative",
    backgroundColor: "#ffffff",
    zIndex: 3,
  },
  fixedAmountLabel: {
    position: "absolute",
    right: 5,
    width: 45,
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
    height: 200,
    backgroundColor: "#e0e0e0",
    zIndex: 2,
  },
})

export default CombinedCategoryChart
