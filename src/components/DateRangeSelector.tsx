"use client"

import type React from "react"
import { Text, StyleSheet, TouchableOpacity, ScrollView } from "react-native"

interface DateRangeSelectorProps {
  selectedRange: string
  onRangeChange: (range: string) => void
  isDarkMode: boolean
}

const DateRangeSelector: React.FC<DateRangeSelectorProps> = ({ selectedRange, onRangeChange, isDarkMode }) => {
  const dateRanges = [
    { id: "today", label: "Today" },
    { id: "yesterday", label: "Yesterday" },
    { id: "this_week", label: "This Week" },
    { id: "this_month", label: "This Month" },
    { id: "this_year", label: "This Year" },
    { id: "last_year", label: "Last Year" },
    { id: "last_3_years", label: "Last 3 Years" },
  ]

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
    >
      {dateRanges.map((range) => (
        <TouchableOpacity
          key={range.id}
          style={[
            styles.rangeButton,
            selectedRange === range.id && styles.selectedRangeButton,
            isDarkMode && { backgroundColor: "#2A2A2A", borderColor: "#444" },
            selectedRange === range.id && isDarkMode && { backgroundColor: "#2C5282", borderColor: "#2C5282" },
          ]}
          onPress={() => onRangeChange(range.id)}
        >
          <Text
            style={[
              styles.rangeText,
              selectedRange === range.id && styles.selectedRangeText,
              isDarkMode && { color: "#AAA" },
              selectedRange === range.id && isDarkMode && { color: "#FFF" },
            ]}
          >
            {range.label}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
  },
  contentContainer: {
    paddingRight: 16,
  },
  rangeButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#f0f0f0",
    marginRight: 8,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  selectedRangeButton: {
    backgroundColor: "#3498db",
    borderColor: "#3498db",
  },
  rangeText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#666",
  },
  selectedRangeText: {
    color: "#fff",
  },
})

export default DateRangeSelector
