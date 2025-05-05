import React, { useState } from "react"
import { View, Text, StyleSheet, TouchableOpacity, Animated } from "react-native"
import { formatCurrency } from "../utils/formatters"

interface CategoryTotal {
  [key: string]: number
}

interface FinancialSummaryProps {
  income: number
  expenses: number
  balance: number
  categoryTotals: CategoryTotal
}

const FinancialSummary = ({ income, expenses, balance, categoryTotals }: FinancialSummaryProps) => {
  const [isExpanded, setIsExpanded] = useState(true)
  const [animation] = useState(new Animated.Value(1))

  const toggleExpand = () => {
    const toValue = isExpanded ? 0 : 1
    
    Animated.timing(animation, {
      toValue,
      duration: 300,
      useNativeDriver: false,
    }).start()
    
    setIsExpanded(!isExpanded)
  }

  const maxHeight = animation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 500], // Adjust based on content
  })

  return (
    <View style={styles.container}>
      <TouchableOpacity 
        style={styles.header} 
        onPress={toggleExpand}
        activeOpacity={0.8}
      >
        <Text style={styles.title}>Financial Summary</Text>
        <Text style={styles.toggleIcon}>{isExpanded ? "▼" : "►"}</Text>
      </TouchableOpacity>

      <Animated.View style={[styles.content, { maxHeight }]}>
        <View style={styles.summaryRow}>
          <Text style={styles.label}>Income:</Text>
          <Text style={[styles.value, styles.incomeText]}>
            +{formatCurrency(income)}
          </Text>
        </View>

        <View style={styles.summaryRow}>
          <Text style={styles.label}>Expenses:</Text>
          <Text style={[styles.value, styles.expenseText]}>
            -{formatCurrency(expenses)}
          </Text>
        </View>

        <View style={[styles.summaryRow, styles.balanceRow]}>
          <Text style={styles.balanceLabel}>Balance:</Text>
          <Text style={[
            styles.value, 
            balance >= 0 ? styles.incomeText : styles.expenseText
          ]}>
            {balance >= 0 ? "+" : "-"}
            {formatCurrency(Math.abs(balance))}
          </Text>
        </View>

        <View style={styles.divider} />

        <Text style={styles.categoryTitle}>Expense Categories</Text>
        
        {Object.entries(categoryTotals)
          .filter(([_, amount]) => amount > 0)
          .sort(([_, a], [__, b]) => b - a)
          .map(([category, amount]) => (
            <View key={category} style={styles.categoryRow}>
              <View style={styles.categoryNameContainer}>
                <View style={[styles.categoryDot, { backgroundColor: getCategoryColor(category) }]} />
                <Text style={styles.categoryName}>
                  {category.charAt(0).toUpperCase() + category.slice(1)}
                </Text>
              </View>
              <Text style={styles.categoryAmount}>{formatCurrency(amount)}</Text>
            </View>
          ))}
      </Animated.View>
    </View>
  )
}

// Helper function to get category colors
const getCategoryColor = (category: string): string => {
  const colors: {[key: string]: string} = {
    food: "#FF9800",
    shopping: "#9C27B0",
    entertainment: "#2196F3",
    utilities: "#607D8B",
    transport: "#4CAF50",
    education: "#3F51B5",
    health: "#F44336",
    charity: "#8BC34A",
    housing: "#795548",
    other: "#9E9E9E",
  }
  
  return colors[category] || colors.other
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    marginBottom: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#3498db",
    padding: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#fff",
  },
  toggleIcon: {
    fontSize: 18,
    color: "#fff",
  },
  content: {
    backgroundColor: "#fff",
    padding: 16,
    overflow: "hidden",
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  balanceRow: {
    marginTop: 4,
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    color: "#555",
    fontWeight: "500",
  },
  balanceLabel: {
    fontSize: 18,
    color: "#333",
    fontWeight: "bold",
  },
  value: {
    fontSize: 16,
    fontWeight: "bold",
  },
  incomeText: {
    color: "#27ae60",
  },
  expenseText: {
    color: "#e74c3c",
  },
  divider: {
    height: 1,
    backgroundColor: "#eee",
    marginBottom: 16,
  },
  categoryTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 12,
    color: "#333",
  },
  categoryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  categoryNameContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  categoryDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  categoryName: {
    fontSize: 14,
    color: "#333",
  },
  categoryAmount: {
    fontSize: 14,
    fontWeight: "500",
    color: "#e74c3c",
  },
})

export default FinancialSummary
