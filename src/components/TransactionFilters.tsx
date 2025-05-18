"use client"

import type React from "react"
import { useState, useCallback } from "react"
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from "react-native"
import { useTheme } from "../context/ThemeContext"
import CategoryBadge from "./CategoryBadge"
import { MaterialIcons } from "@expo/vector-icons"

interface TransactionFiltersProps {
  selectedCategory: string[]
  setSelectedCategory: (category: string[]) => void
  selectedType: string
  setSelectedType: (type: string) => void
  sortOption: string
  setSortOption: (option: string) => void
  sortDirection: "asc" | "desc"
  setSortDirection: (direction: "asc" | "desc") => void
  onResetFilters?: () => void
}

const TransactionFilters: React.FC<TransactionFiltersProps> = ({
  selectedCategory,
  setSelectedCategory,
  selectedType,
  setSelectedType,
  sortOption,
  setSortOption,
  sortDirection,
  setSortDirection,
  onResetFilters,
}) => {
  const { isDarkMode } = useTheme()
  const [showSortOptions, setShowSortOptions] = useState(false)
  const [isProcessingCategoryChange, setIsProcessingCategoryChange] = useState(false)

  const categoryFilters = [
    "All",
    "Food",
    "Shopping",
    "Entertainment",
    "Utilities",
    "Transport",
    "Education",
    "Health",
    "Charity",
    "Housing",
    "Income",
    "Other",
  ]

  const transactionTypes = ["All", "Income", "Expense", "Pending"]

  const sortOptions = [
    { id: "date", label: "Date" },
    { id: "amount", label: "Amount" },
    { id: "category", label: "Category" },
  ]

  const toggleSortDirection = () => {
    setSortDirection(sortDirection === "asc" ? "desc" : "asc")
  }

  // Debounced category change handler
  const handleCategoryPress = useCallback(
    (category: string) => {
      if (isProcessingCategoryChange) {
        console.log("Skipping category change - already processing")
        return
      }

      setIsProcessingCategoryChange(true)
      console.log(`Category selection changed: ${category}`)

      if (category === "All") {
        setSelectedCategory(["All"])
      } else {
        const newSelectedCategories = [...selectedCategory]

        if (newSelectedCategories.includes(category)) {
          const filteredCategories = newSelectedCategories.filter((c) => c !== category)
          if (filteredCategories.length === 0 || (filteredCategories.length === 1 && filteredCategories[0] === "All")) {
            setSelectedCategory(["All"])
          } else {
            setSelectedCategory(filteredCategories.filter((c) => c !== "All"))
          }
        } else {
          const withoutAll = newSelectedCategories.filter((c) => c !== "All")
          setSelectedCategory([...withoutAll, category])
        }
      }

      // Reset the processing flag after a delay
      setTimeout(() => {
        setIsProcessingCategoryChange(false)
      }, 300)
    },
    [selectedCategory, setSelectedCategory, isProcessingCategoryChange],
  )

  const isCategorySelected = (category: string) => {
    return selectedCategory.includes(category)
  }

  return (
    <View style={[styles.container, isDarkMode && { backgroundColor: "#1E1E1E", borderColor: "#333" }]}>
      {/* Transaction Type Filter */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, isDarkMode && { color: "#DDD" }]}>Transaction Type</Text>
        <View style={styles.typeFilters}>
          {transactionTypes.map((type) => (
            <TouchableOpacity
              key={type}
              style={[
                styles.typeChip,
                selectedType === type && styles.selectedTypeChip,
                isDarkMode && { backgroundColor: "#333" },
                selectedType === type && isDarkMode && { backgroundColor: "#2C5282" },
              ]}
              onPress={() => setSelectedType(type)}
            >
              <Text
                style={[
                  styles.typeChipText,
                  selectedType === type && styles.selectedTypeChipText,
                  isDarkMode && { color: "#DDD" },
                ]}
              >
                {type}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Category Filter */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, isDarkMode && { color: "#DDD" }]}>Category</Text>
        <Text style={[styles.categoryHint, isDarkMode && { color: "#AAA" }]}>
          Tap multiple categories to filter by more than one
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.categoryFilters}
          contentContainerStyle={{ paddingRight: 16 }}
        >
          {categoryFilters.map((category) => (
            <CategoryBadge
              key={category}
              category={category}
              isSelected={isCategorySelected(category)}
              onPress={() => handleCategoryPress(category)}
            />
          ))}
        </ScrollView>
      </View>

      {/* Sort Options */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, isDarkMode && { color: "#DDD" }]}>Sort By</Text>
        <View style={styles.sortOptionsContainer}>
          {sortOptions.map((option) => (
            <TouchableOpacity
              key={option.id}
              style={[
                styles.sortOption,
                sortOption === option.id && styles.selectedSortOption,
                isDarkMode && { backgroundColor: "#333" },
                sortOption === option.id && isDarkMode && { backgroundColor: "#2C5282" },
              ]}
              onPress={() => {
                if (sortOption === option.id) {
                  toggleSortDirection()
                } else {
                  setSortOption(option.id)
                }
              }}
            >
              <Text
                style={[
                  styles.sortOptionText,
                  sortOption === option.id && styles.selectedSortOptionText,
                  isDarkMode && { color: "#DDD" },
                ]}
              >
                {option.label}
              </Text>
              {sortOption === option.id && (
                <View style={styles.directionIndicator}>
                  <MaterialIcons
                    name={sortDirection === "asc" ? "arrow-upward" : "arrow-downward"}
                    size={16}
                    color="#FFF"
                  />
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Reset Filters Button */}
      {onResetFilters && (
        <TouchableOpacity
          style={[styles.resetButton, isDarkMode && { backgroundColor: "#333" }]}
          onPress={onResetFilters}
        >
          <MaterialIcons name="refresh" size={14} color={isDarkMode ? "#AAA" : "#666"} />
          <Text style={[styles.resetButtonText, isDarkMode && { color: "#AAA" }]}>Reset Filters</Text>
        </TouchableOpacity>
      )}
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
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 12,
  },
  categoryHint: {
    fontSize: 12,
    color: "#666",
    marginBottom: 8,
    fontStyle: "italic",
  },
  typeFilters: {
    flexDirection: "row",
    flexWrap: "wrap",
    width: "100%",
  },
  typeChip: {
    backgroundColor: "#f0f0f0",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 8,
    minWidth: 80,
    alignItems: "center",
  },
  selectedTypeChip: {
    backgroundColor: "#3498db",
  },
  typeChipText: {
    fontSize: 14,
    color: "#333",
  },
  selectedTypeChipText: {
    color: "#fff",
    fontWeight: "bold",
  },
  categoryFilters: {
    flexDirection: "row",
    paddingBottom: 8,
  },
  sortHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sortOptionsContainer: {
    marginTop: 8,
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
  directionIndicator: {
    marginLeft: 6,
  },
  resetButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f0f0f0",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginTop: 8,
    alignSelf: "center",
  },
  resetButtonText: {
    fontSize: 12,
    color: "#666",
    marginLeft: 4,
  },
})

export default TransactionFilters
