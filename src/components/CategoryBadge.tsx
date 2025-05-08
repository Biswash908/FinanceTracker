"use client"

import type React from "react"
import { TouchableOpacity, Text, StyleSheet } from "react-native"
import { useTheme } from "../context/ThemeContext"

interface CategoryBadgeProps {
  category: string
  isSelected: boolean
  onPress: () => void
}

const CategoryBadge: React.FC<CategoryBadgeProps> = ({ category, isSelected, onPress }) => {
  const { isDarkMode } = useTheme()

  // Get emoji for category
  const getCategoryEmoji = (category: string): string => {
    const categoryEmojis = {
      all: "🔍",
      food: "🍔",
      shopping: "🛍️",
      entertainment: "🎬",
      utilities: "💡",
      transport: "🚗",
      education: "📚",
      health: "🏥",
      charity: "❤️",
      housing: "🏠",
      income: "💰",
      other: "📋",
    }

    return categoryEmojis[category.toLowerCase()] || "📋"
  }

  // Get category color
  const getCategoryColor = (category: string): string => {
    const categoryColors = {
      food: "#FF5733", // Orange-red
      transport: "#33A8FF", // Blue
      utilities: "#33FFC1", // Teal
      housing: "#8C33FF", // Purple
      shopping: "#FF33A8", // Pink
      health: "#33FF57", // Green
      education: "#FFC133", // Yellow
      entertainment: "#FF3333", // Red
      charity: "#33FF33", // Bright green
      income: "#27ae60", // Green
      other: "#AAAAAA", // Gray
      all: "#3498db", // Blue
    }

    return categoryColors[category.toLowerCase()] || "#AAAAAA"
  }

  return (
    <TouchableOpacity
      style={[
        styles.categoryChip,
        isSelected && { backgroundColor: getCategoryColor(category) },
        !isSelected && isDarkMode && { backgroundColor: "#333" },
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text
        style={[
          styles.categoryChipText,
          isSelected && styles.selectedCategoryChipText,
          !isSelected && isDarkMode && { color: "#DDD" },
        ]}
      >
        {getCategoryEmoji(category)} {category}
      </Text>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  categoryChip: {
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  categoryChipText: {
    fontSize: 14,
    color: "#333",
  },
  selectedCategoryChipText: {
    color: "#fff",
    fontWeight: "bold",
  },
})

export default CategoryBadge
