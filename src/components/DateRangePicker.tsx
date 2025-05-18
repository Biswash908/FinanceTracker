"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { View, Text, StyleSheet, TouchableOpacity, Platform } from "react-native"
import DateTimePicker from "@react-native-community/datetimepicker"
import { useTheme } from "../context/ThemeContext"

interface DateRangePickerProps {
  startDate: string
  endDate: string
  onDateRangeChange: (startDate: string, endDate: string) => void
}

const DateRangePicker: React.FC<DateRangePickerProps> = ({ startDate, endDate, onDateRangeChange }) => {
  const { isDarkMode } = useTheme()
  const [showStartDatePicker, setShowStartDatePicker] = useState(false)
  const [showEndDatePicker, setShowEndDatePicker] = useState(false)
  const [localStartDate, setLocalStartDate] = useState(new Date(startDate))
  const [localEndDate, setLocalEndDate] = useState(new Date(endDate))

  // Add a ref to track if the date was changed by a preset button
  const isPresetSelection = useRef(false)
  // Add a ref to track the last manual selection
  const lastManualSelection = useRef({ start: startDate, end: endDate })
  // Add a ref to track if we're currently in the middle of a date update
  const isUpdatingDates = useRef(false)

  // Update local dates when props change, but only if it wasn't triggered by this component
  useEffect(() => {
    try {
      // Skip if we're in the middle of updating dates to avoid loops
      if (isUpdatingDates.current) {
        isUpdatingDates.current = false
        return
      }

      // Only update if the dates have changed from external sources
      if (startDate !== formatDateToString(localStartDate) || endDate !== formatDateToString(localEndDate)) {
        console.log(`DateRangePicker: External date change detected: ${startDate} to ${endDate}`)
        setLocalStartDate(new Date(startDate))
        setLocalEndDate(new Date(endDate))
        lastManualSelection.current = { start: startDate, end: endDate }
      }
    } catch (error) {
      console.error("Error updating local dates:", error)
    }
  }, [startDate, endDate])

  // Format date for display
  const formatDateForDisplay = (dateString: string): string => {
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    } catch (error) {
      console.error("Error formatting date:", error, dateString)
      return dateString
    }
  }

  // Format date to YYYY-MM-DD
  const formatDateToString = (date: Date): string => {
    try {
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, "0")
      const day = String(date.getDate()).padStart(2, "0")
      return `${year}-${month}-${day}`
    } catch (error) {
      console.error("Error formatting date to string:", error)
      const now = new Date()
      const year = now.getFullYear()
      const month = String(now.getMonth() + 1).padStart(2, "0")
      const day = String(now.getDate()).padStart(2, "0")
      return `${year}-${month}-${day}`
    }
  }

  const onChangeStartDate = (event, selectedDate) => {
    setShowStartDatePicker(Platform.OS === "ios")

    if (selectedDate) {
      // Set flag to indicate we're updating dates
      isUpdatingDates.current = true

      setLocalStartDate(selectedDate)
      const formattedDate = formatDateToString(selectedDate)

      const endDateObj = new Date(endDate)
      if (selectedDate > endDateObj) {
        // If selected start date is after current end date, update end date too
        const newEndDate = formattedDate
        setLocalEndDate(selectedDate)
        lastManualSelection.current = {
          start: formattedDate,
          end: newEndDate,
        }
        console.log(`DatePicker: Manual date change: ${formattedDate} to ${newEndDate} (start > end)`)
        onDateRangeChange(formattedDate, newEndDate)
      } else {
        lastManualSelection.current = {
          start: formattedDate,
          end: endDate,
        }
        console.log(`DatePicker: Manual date change: ${formattedDate} to ${endDate} (start date only)`)
        onDateRangeChange(formattedDate, endDate)
      }
    }
  }

  const onChangeEndDate = (event, selectedDate) => {
    setShowEndDatePicker(Platform.OS === "ios")

    if (selectedDate) {
      // Set flag to indicate we're updating dates
      isUpdatingDates.current = true

      setLocalEndDate(selectedDate)
      const formattedDate = formatDateToString(selectedDate)

      const startDateObj = new Date(startDate)
      if (selectedDate < startDateObj) {
        // If selected end date is before current start date, update start date too
        const newStartDate = formattedDate
        setLocalStartDate(selectedDate)
        lastManualSelection.current = {
          start: newStartDate,
          end: formattedDate,
        }
        console.log(`DatePicker: Manual date change: ${newStartDate} to ${formattedDate} (end < start)`)
        onDateRangeChange(newStartDate, formattedDate)
      } else {
        lastManualSelection.current = {
          start: startDate,
          end: formattedDate,
        }
        console.log(`DatePicker: Manual date change: ${startDate} to ${formattedDate} (end date only)`)
        onDateRangeChange(startDate, formattedDate)
      }
    }
  }

  // Predefined date ranges
  const dateRanges = [
    {
      label: "Today",
      getRange: () => {
        const now = new Date()
        const today = formatDateToString(now)
        return {
          start: today,
          end: today,
        }
      },
    },
    {
      label: "This Month",
      getRange: () => {
        const now = new Date()
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
        return {
          start: formatDateToString(firstDay),
          end: formatDateToString(now),
        }
      },
    },
    {
      label: "Last Month",
      getRange: () => {
        const now = new Date()
        const firstDay = new Date(now.getFullYear(), now.getMonth() - 1, 1)
        const lastDay = new Date(now.getFullYear(), now.getMonth(), 0)
        return {
          start: formatDateToString(firstDay),
          end: formatDateToString(lastDay),
        }
      },
    },
    {
      label: "Last 3 Months",
      getRange: () => {
        const now = new Date()
        const threeMonthsAgo = new Date(now)
        threeMonthsAgo.setMonth(now.getMonth() - 3)
        return {
          start: formatDateToString(threeMonthsAgo),
          end: formatDateToString(now),
        }
      },
    },
    {
      label: "This Year",
      getRange: () => {
        const now = new Date()
        const firstDay = new Date(now.getFullYear(), 0, 1)
        return {
          start: formatDateToString(firstDay),
          end: formatDateToString(now),
        }
      },
    },
    {
      label: "Last Year",
      getRange: () => {
        const now = new Date()
        const firstDay = new Date(now.getFullYear() - 1, 0, 1)
        const lastDay = new Date(now.getFullYear() - 1, 11, 31)
        return {
          start: formatDateToString(firstDay),
          end: formatDateToString(lastDay),
        }
      },
    },
  ]

  return (
    <View style={[styles.container, isDarkMode && { backgroundColor: "#1E1E1E", borderColor: "#333" }]}>
      <View style={styles.header}>
        <Text style={[styles.title, isDarkMode && { color: "#DDD" }]}>Date Range</Text>
        <View style={styles.quickFilters}>
          {dateRanges.map((range, index) => (
            <TouchableOpacity
              key={`range-${index}`}
              style={[styles.quickFilterButton, isDarkMode && { backgroundColor: "#333" }]}
              onPress={() => {
                try {
                  // Set flag to indicate we're updating dates
                  isUpdatingDates.current = true

                  const { start, end } = range.getRange()
                  console.log(`Quick filter: ${range.label}, ${start} to ${end}`)

                  // Update local dates
                  setLocalStartDate(new Date(start))
                  setLocalEndDate(new Date(end))

                  // Call the parent callback
                  onDateRangeChange(start, end)
                } catch (error) {
                  console.error(`Error applying ${range.label} filter:`, error)
                }
              }}
            >
              <Text style={[styles.quickFilterText, isDarkMode && { color: "#DDD" }]}>{range.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.dateContainer}>
        <View style={styles.dateRow}>
          <Text style={[styles.dateLabel, isDarkMode && { color: "#AAA" }]}>From:</Text>
          <TouchableOpacity
            style={[styles.dateButton, isDarkMode && { backgroundColor: "#2A2A2A" }]}
            onPress={() => setShowStartDatePicker(true)}
          >
            <Text style={[styles.dateButtonText, isDarkMode && { color: "#FFF" }]}>
              {formatDateForDisplay(formatDateToString(localStartDate))}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.dateRow}>
          <Text style={[styles.dateLabel, isDarkMode && { color: "#AAA" }]}>To:</Text>
          <TouchableOpacity
            style={[styles.dateButton, isDarkMode && { backgroundColor: "#2A2A2A" }]}
            onPress={() => setShowEndDatePicker(true)}
          >
            <Text style={[styles.dateButtonText, isDarkMode && { color: "#FFF" }]}>
              {formatDateForDisplay(formatDateToString(localEndDate))}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Date Pickers */}
      {showStartDatePicker && (
        <DateTimePicker
          value={localStartDate}
          mode="date"
          display={Platform.OS === "ios" ? "spinner" : "default"}
          onChange={onChangeStartDate}
          maximumDate={new Date()}
        />
      )}

      {showEndDatePicker && (
        <DateTimePicker
          value={localEndDate}
          mode="date"
          display={Platform.OS === "ios" ? "spinner" : "default"}
          onChange={onChangeEndDate}
          minimumDate={localStartDate}
          maximumDate={new Date()}
        />
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
  header: {
    marginBottom: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  quickFilters: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 8,
  },
  quickFilterButton: {
    backgroundColor: "#f0f0f0",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
  },
  quickFilterText: {
    fontSize: 12,
    color: "#3498db",
  },
  dateContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  dateLabel: {
    fontSize: 14,
    marginRight: 8,
    color: "#555",
  },
  dateButton: {
    backgroundColor: "#f5f5f5",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    minWidth: 100,
  },
  dateButtonText: {
    fontSize: 14,
    color: "#333",
  },
})

export default DateRangePicker
