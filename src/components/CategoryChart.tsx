import React from "react"
import { View, StyleSheet, Dimensions } from "react-native"
import { PieChart } from "react-native-chart-kit"

interface CategoryData {
  name: string
  amount: number
  color: string
}

interface CategoryChartProps {
  data: CategoryData[]
}

const CategoryChart = ({ data }: CategoryChartProps) => {
  // Format data for pie chart
  const chartData = data.map((item) => ({
    name: item.name,
    population: item.amount, // The chart library uses "population" for values
    color: item.color,
    legendFontColor: "#7F7F7F",
    legendFontSize: 12,
  }))
  
  return (
    <View style={styles.container}>
      <PieChart
        data={chartData}
        width={Dimensions.get("window").width - 64} // Account for padding
        height={220}
        chartConfig={{
          backgroundColor: "#fff",
          backgroundGradientFrom: "#fff",
          backgroundGradientTo: "#fff",
          color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
        }}
        accessor="population"
        backgroundColor="transparent"
        paddingLeft="15"
        absolute
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    marginTop: 16,
  },
})

export default CategoryChart
