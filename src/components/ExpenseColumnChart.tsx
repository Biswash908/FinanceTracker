"use client"

import type React from "react"
import { View, Text, StyleSheet, Dimensions } from "react-native"
import { BarChart } from "react-native-chart-kit"

interface CategoryData {
  name: string
  amount: number
  color: string
  category: string
}

interface ExpenseColumnChartProps {
  data: CategoryData[]
  isDarkMode: boolean
  isIncome?: boolean
}

const ExpenseColumnChart: React.FC<ExpenseColumnChartProps> = ({ data, isDarkMode, isIncome = false }) => {
  // Limit to top 5 categories for better visualization
  const topCategories = data.slice(0, 5)

  // Prepare data for the chart
  const chartData = {
    labels: topCategories.map((item) => item.name.split(" ")[0]), // Use only first word for labels
    datasets: [
      {
        data: topCategories.map((item) => item.amount),
        colors: topCategories.map((item) => () => item.color),
      },
    ],
  }

  const chartConfig = {
    backgroundGradientFrom: isDarkMode ? "#1E1E1E" : "#fff",
    backgroundGradientTo: isDarkMode ? "#1E1E1E" : "#fff",
    decimalPlaces: 0,
    color: (opacity = 1) => (isIncome ? `rgba(39, 174, 96, ${opacity})` : `rgba(231, 76, 60, ${opacity})`),
    labelColor: (opacity = 1) => (isDarkMode ? `rgba(255, 255, 255, ${opacity})` : `rgba(0, 0, 0, ${opacity})`),
    style: {
      borderRadius: 16,
    },
    barPercentage: 0.7,
    propsForLabels: {
      fontSize: 10,
    },
  }

  // If no data, show empty state
  if (topCategories.length === 0) {
    return (
      <View style={[styles.emptyContainer, isDarkMode && { backgroundColor: "#2A2A2A" }]}>
        <Text style={[styles.emptyText, isDarkMode && { color: "#AAA" }]}>No data available</Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <BarChart
        data={chartData}
        width={Dimensions.get("window").width - 64} // Account for padding
        height={220}
        chartConfig={chartConfig}
        style={styles.chart}
        showValuesOnTopOfBars={true}
        fromZero={true}
        withInnerLines={false}
        showBarTops={false}
        yAxisLabel=""
        yAxisSuffix=""
        formatYLabel={(value) => {
          // Format large numbers with K/M suffix
          if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`
          if (value >= 1000) return `${(value / 1000).toFixed(0)}K`
          return value.toString()
        }}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    marginVertical: 8,
  },
  chart: {
    borderRadius: 16,
    paddingRight: 0,
    paddingLeft: 0,
  },
  emptyContainer: {
    height: 220,
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

export default ExpenseColumnChart
