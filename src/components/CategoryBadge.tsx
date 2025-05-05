import React from "react"
import { View, Text, StyleSheet } from "react-native"

// Category colors for visual distinction
const categoryColors = {
  food: "#FF9800",        // Orange
  shopping: "#9C27B0",    // Purple
  entertainment: "#2196F3", // Blue
  utilities: "#607D8B",   // Blue Grey
  transport: "#4CAF50",   // Green
  education: "#3F51B5",   // Indigo
  health: "#F44336",      // Red
  charity: "#8BC34A",     // Light Green
  housing: "#795548",     // Brown
  income: "#009688",      // Teal
  other: "#9E9E9E",       // Grey
}

// Category icons (emoji for now, can be replaced with proper icons)
const categoryIcons = {
  food: "🍔",
  shopping: "🛒",
  entertainment: "🎬",
  utilities: "💡",
  transport: "🚗",
  education: "📚",
  health: "🏥",
  charity: "🎁",
  housing: "🏠",
  income: "💰",
  other: "📋",
}

interface CategoryBadgeProps {
  category: string
}

const CategoryBadge = ({ category }: CategoryBadgeProps) => {
  const color = categoryColors[category] || categoryColors.other
  const icon = categoryIcons[category] || categoryIcons.other
  
  return (
    <View style={[styles.badge, { backgroundColor: color + "20" /* 20% opacity */ }]}>
      <Text style={styles.icon}>{icon}</Text>
      <Text style={[styles.text, { color }]}>
        {category.charAt(0).toUpperCase() + category.slice(1)}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
  },
  icon: {
    marginRight: 4,
    fontSize: 14,
  },
  text: {
    fontSize: 13,
    fontWeight: "600",
  },
})

export default CategoryBadge
