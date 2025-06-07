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
  selectedType: string[]
  setSelectedType: (type: string[]) => void
  onResetFilters?: () => void
}

const TransactionFilters: React.FC<TransactionFiltersProps> = ({
  selectedCategory,
  setSelectedCategory,
  selectedType,
  setSelectedType,
  onResetFilters,
}) => {
  const { isDarkMode } = useTheme()
  const [isProcessingCategoryChange, setIsProcessingCategoryChange] = useState(false)
  const [isProcessingTypeChange, setIsProcessingTypeChange] = useState(false)

  // Sort categories alphabetically (except "All" which stays first)
  const categoryFilters = [
    "All",
    ...[
      "Charity",
      "Deposit", // Added deposit category
      "Education",
      "Entertainment",
      "Food",
      "Health",
      "Housing",
      "Income",
      "Other",
      "Shopping",
      "Transport",
      "Utilities",
    ].sort(),
  ]

  // Changed "Income" to "Inflow" in transaction types
  const transactionTypes = ["All", "Inflow", "Expense", "Pending"]

  // Handle transaction type selection
  const handleTypePress = useCallback(
    (type: string) => {
      if (isProcessingTypeChange) {
        console.log("Skipping type change - already processing")
        return
      }

      setIsProcessingTypeChange(true)
      console.log(`Type selection changed: ${type}`)

      if (type === "All") {
        // If "All" is clicked, deselect everything else and select only "All"
        setSelectedType(["All"])
      } else {
        // If any other type is clicked
        const newSelectedTypes = [...selectedType]

        // If "All" is currently selected, remove it when selecting a specific type
        if (newSelectedTypes.includes("All")) {
          newSelectedTypes.splice(newSelectedTypes.indexOf("All"), 1)
        }

        // Toggle the selected type
        if (newSelectedTypes.includes(type)) {
          // If this is the only selected type, don't deselect it
          if (newSelectedTypes.length === 1) {
            // If trying to deselect the last type, switch to "All"
            setSelectedType(["All"])
            setIsProcessingTypeChange(false)
            return
          }

          // Remove the type
          const filteredTypes = newSelectedTypes.filter((t) => t !== type)
          setSelectedType(filteredTypes)
        } else {
          // Add the type
          setSelectedType([...newSelectedTypes, type])
        }
      }

      // Reset the processing flag after a delay
      setTimeout(() => {
        setIsProcessingTypeChange(false)
      }, 300)
    },
    [selectedType, setSelectedType, isProcessingTypeChange],
  )

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

  const isTypeSelected = (type: string) => {
    return selectedType.includes(type)
  }

  return (
    <View style={[styles.container, isDarkMode && { backgroundColor: "#1E1E1E", borderColor: "#333" }]}>
      {/* Transaction Type Filter - Now horizontal scrollable */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, isDarkMode && { color: "#DDD" }]}>Transaction Type</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.typeFiltersScroll}
          contentContainerStyle={styles.typeFiltersContent}
        >
          {transactionTypes.map((type) => (
            <TouchableOpacity
              key={type}
              style={[
                styles.typeChip,
                isTypeSelected(type) && styles.selectedTypeChip,
                isDarkMode && { backgroundColor: "#333" },
                isTypeSelected(type) && isDarkMode && { backgroundColor: "#2C5282" },
              ]}
              onPress={() => handleTypePress(type)}
            >
              <Text
                style={[
                  styles.typeChipText,
                  isTypeSelected(type) && styles.selectedTypeChipText,
                  isDarkMode && { color: "#DDD" },
                ]}
              >
                {type}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Category Filter - Now vertical */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, isDarkMode && { color: "#DDD" }]}>Category</Text>
        <Text style={[styles.categoryHint, isDarkMode && { color: "#AAA" }]}>
          Tap multiple categories to filter by more than one
        </Text>
        <View style={styles.categoryFiltersGrid}>
          {categoryFilters.map((category) => (
            <CategoryBadge
              key={category}
              category={category}
              isSelected={isCategorySelected(category)}
              onPress={() => handleCategoryPress(category)}
            />
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
  typeFiltersScroll: {
    flexDirection: "row",
  },
  typeFiltersContent: {
    paddingRight: 16,
  },
  typeChip: {
    backgroundColor: "#f0f0f0",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
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
  categoryFiltersGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 8,
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