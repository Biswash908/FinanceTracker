"use client"

import type React from "react"
import { useState } from "react"
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from "react-native"
import { useTheme } from "../context/ThemeContext"
import CategoryBadge from "./CategoryBadge"
import { MaterialIcons } from "@expo/vector-icons"

// Update the interface to use string[] for selectedCategory
interface TransactionFiltersProps {
  selectedCategory: string[]
  setSelectedCategory: (category: string[]) => void
  selectedType: string
  setSelectedType: (type: string) => void
  sortOption: string
  setSortOption: (option: string) => void
  sortDirection: "asc" | "desc"
  setSortDirection: (direction: "asc" | "desc") => void
}

// Update the component to handle multiple category selection
const TransactionFilters: React.FC<TransactionFiltersProps> = ({
  selectedCategory,
  setSelectedCategory,
  selectedType,
  setSelectedType,
  sortOption,
  setSortOption,
  sortDirection,
  setSortDirection,
}) => {
  const { isDarkMode } = useTheme()
  const [showSortOptions, setShowSortOptions] = useState(false)

  // Category filters
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

  // Transaction types
  const transactionTypes = ["All", "Income", "Expense", "Pending"]

  // Sort options
  const sortOptions = [
    { id: "date", label: "Date" },
    { id: "amount", label: "Amount" },
    { id: "category", label: "Category" },
  ]

  // Toggle sort direction
  const toggleSortDirection = () => {
    setSortDirection(sortDirection === "asc" ? "desc" : "asc")
  }

  // Handle category selection
  const handleCategoryPress = (category: string) => {
    if (category === "All") {
      // If "All" is selected, clear all other selections
      setSelectedCategory(["All"])
    } else {
      // If any other category is selected
      const newSelectedCategories = [...selectedCategory]

      // If it's already selected, remove it
      if (newSelectedCategories.includes(category)) {
        const filteredCategories = newSelectedCategories.filter((c) => c !== category)
        // If removing the last category, select "All"
        if (filteredCategories.length === 0 || (filteredCategories.length === 1 && filteredCategories[0] === "All")) {
          setSelectedCategory(["All"])
        } else {
          // Remove "All" if it's in the list and we're selecting specific categories
          setSelectedCategory(filteredCategories.filter((c) => c !== "All"))
        }
      } else {
        // If it's not selected, add it and remove "All" if present
        const withoutAll = newSelectedCategories.filter((c) => c !== "All")
        setSelectedCategory([...withoutAll, category])
      }
    }
  }

  // Check if a category is selected
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
          contentContainerStyle={{ paddingRight: 16 }} // Add right padding to the content
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
                  // If already selected, toggle direction
                  toggleSortDirection()
                } else {
                  // If not selected, select it
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
  },
  typeChip: {
    backgroundColor: "#f0f0f0",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
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
    paddingBottom: 8, // Add padding at the bottom
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
})

export default TransactionFilters
