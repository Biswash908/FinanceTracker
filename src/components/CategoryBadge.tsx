"use client"

import type React from "react"
import { TouchableOpacity, Text, StyleSheet } from "react-native"
import { useTheme } from "../context/ThemeContext"
import { getCategoryColor, getCategoryEmoji } from "../utils/categorizer"

interface CategoryBadgeProps {
  category: string
  isSelected: boolean
  onPress: () => void
  displayName?: string
}

const CategoryBadge: React.FC<CategoryBadgeProps> = ({ category, isSelected, onPress, displayName }) => {
  const { isDarkMode } = useTheme()

  // Special case for "All" category
  if (category === "All") {
    return (
      <TouchableOpacity
        style={[
          styles.badge,
          isSelected ? styles.selectedBadge : styles.unselectedBadge,
          isDarkMode && { backgroundColor: isSelected ? "#2C5282" : "#333", borderColor: "#555" },
        ]}
        onPress={onPress}
      >
        <Text
          style={[
            styles.badgeText,
            isSelected ? styles.selectedBadgeText : styles.unselectedBadgeText,
            isDarkMode && { color: isSelected ? "#FFF" : "#AAA" },
          ]}
        >
          {displayName || "All"}
        </Text>
      </TouchableOpacity>
    )
  }

  // For other categories, use emoji and color
  const emoji = getCategoryEmoji(category)
  const color = getCategoryColor(category)

  return (
    <TouchableOpacity
      style={[
        styles.badge,
        isSelected ? { backgroundColor: color, borderColor: color } : styles.unselectedBadge,
        isDarkMode && !isSelected && { backgroundColor: "#333", borderColor: "#555" },
      ]}
      onPress={onPress}
    >
      <Text
        style={[
          styles.badgeText,
          isSelected ? { color: "#FFF" } : styles.unselectedBadgeText,
          isDarkMode && !isSelected && { color: "#AAA" },
        ]}
        numberOfLines={1}
        ellipsizeMode="tail"
      >
        {emoji} {displayName || category}
      </Text>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 4,
  },
  selectedBadge: {
    backgroundColor: "#3498db",
    borderColor: "#3498db",
  },
  unselectedBadge: {
    backgroundColor: "#f0f0f0",
    borderColor: "#e0e0e0",
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "500",
  },
  selectedBadgeText: {
    color: "#fff",
  },
  unselectedBadgeText: {
    color: "#666",
  },
})

export default CategoryBadge
