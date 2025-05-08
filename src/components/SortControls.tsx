"use client"

import type React from "react"
import { View, Text, StyleSheet, TouchableOpacity } from "react-native"
import { useTheme } from "../context/ThemeContext"
import { MaterialIcons } from "@expo/vector-icons"

interface SortControlsProps {
  sortBy: "date" | "amount" | "category"
  setSortBy: (sortBy: "date" | "amount" | "category") => void
  sortOrder: "asc" | "desc"
  setSortOrder: (sortOrder: "asc" | "desc") => void
}

const SortControls: React.FC<SortControlsProps> = ({ sortBy, setSortBy, sortOrder, setSortOrder }) => {
  const { isDarkMode } = useTheme()

  // Sort options
  const sortOptions = [
    { id: "date", label: "Date" },
    { id: "amount", label: "Amount" },
    { id: "category", label: "Category" },
  ]

  // Toggle sort order
  const toggleSortOrder = () => {
    setSortOrder(sortOrder === "asc" ? "desc" : "asc")
  }

  return (
    <View style={[styles.container, isDarkMode && { backgroundColor: "#1E1E1E", borderColor: "#333" }]}>
      <Text style={[styles.sectionTitle, isDarkMode && { color: "#DDD" }]}>Sort By</Text>
      <View style={styles.sortOptionsWrapper}>
        {sortOptions.map((option) => (
          <TouchableOpacity
            key={option.id}
            style={[
              styles.sortOption,
              sortBy === option.id && styles.selectedSortOption,
              isDarkMode && { backgroundColor: "#333" },
              sortBy === option.id && isDarkMode && { backgroundColor: "#2C5282" },
            ]}
            onPress={() => setSortBy(option.id as "date" | "amount" | "category")}
          >
            <Text
              style={[
                styles.sortOptionText,
                sortBy === option.id && styles.selectedSortOptionText,
                isDarkMode && { color: "#DDD" },
              ]}
            >
              {option.label}
            </Text>
            {sortBy === option.id && (
              <TouchableOpacity onPress={toggleSortOrder} style={styles.directionButton}>
                <MaterialIcons name={sortOrder === "asc" ? "arrow-upward" : "arrow-downward"} size={16} color="#FFF" />
              </TouchableOpacity>
            )}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: "#eee",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 12,
  },
  sortOptionsWrapper: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  sortOption: {
    backgroundColor: "#f0f0f0",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "center",
  },
  selectedSortOption: {
    backgroundColor: "#3498db",
  },
  sortOptionText: {
    fontSize: 14,
    color: "#333",
  },
  selectedSortOptionText: {
    color: "#fff",
    fontWeight: "bold",
  },
  directionButton: {
    marginLeft: 6,
  },
})

export default SortControls
