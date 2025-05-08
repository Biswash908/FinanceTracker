import type React from "react"
import { View, Text, StyleSheet, Dimensions } from "react-native"
import { PieChart } from "react-native-chart-kit"

interface CategoryChartProps {
  data: Array<{
    name: string
    amount: number
    color: string
  }>
  isDarkMode?: boolean
}

const CategoryChart: React.FC<CategoryChartProps> = ({ data, isDarkMode }) => {
  // Format data for pie chart
  const chartData = data.map((item) => ({
    name: item.name,
    population: item.amount, // The library uses "population" for the value
    color: item.color,
    legendFontColor: isDarkMode ? "#DDD" : "#7F7F7F",
    legendFontSize: 12,
  }))

  return (
    <View style={styles.container}>
      {data.length > 0 ? (
        <PieChart
          data={chartData}
          width={Dimensions.get("window").width - 64} // Account for padding
          height={220}
          chartConfig={{
            backgroundColor: isDarkMode ? "#1E1E1E" : "#fff",
            backgroundGradientFrom: isDarkMode ? "#1E1E1E" : "#fff",
            backgroundGradientTo: isDarkMode ? "#1E1E1E" : "#fff",
            color: (opacity = 1) => (isDarkMode ? `rgba(255, 255, 255, ${opacity})` : `rgba(0, 0, 0, ${opacity})`),
            labelColor: (opacity = 1) => (isDarkMode ? `rgba(255, 255, 255, ${opacity})` : `rgba(0, 0, 0, ${opacity})`),
            style: {
              borderRadius: 16,
            },
          }}
          accessor="population"
          backgroundColor="transparent"
          paddingLeft="15"
          absolute
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyText, isDarkMode && { color: "#AAA" }]}>No data available</Text>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
  },
  emptyContainer: {
    height: 220,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    fontSize: 16,
    color: "#666",
  },
})

export default CategoryChart
