"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { View, Text, StyleSheet, TouchableOpacity, Platform } from "react-native"
import DateTimePicker from "@react-native-community/datetimepicker"

interface DateRangePickerProps {
  startDate: string
  endDate: string
  onDateRangeChange: (startDate: string, endDate: string) => void
}

const DateRangePicker: React.FC<DateRangePickerProps> = ({ startDate, endDate, onDateRangeChange }) => {
  const [showStartDatePicker, setShowStartDatePicker] = useState(false)
  const [showEndDatePicker, setShowEndDatePicker] = useState(false)
  const [localStartDate, setLocalStartDate] = useState(new Date(startDate))
  const [localEndDate, setLocalEndDate] = useState(new Date(endDate))

  // Update local dates when props change
  useEffect(() => {
    try {
      setLocalStartDate(new Date(startDate))
      setLocalEndDate(new Date(endDate))
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
      return date.toISOString().split("T")[0]
    } catch (error) {
      console.error("Error formatting date to string:", error)
      return new Date().toISOString().split("T")[0]
    }
  }

  const onChangeStartDate = (event, selectedDate) => {
    setShowStartDatePicker(Platform.OS === "ios")

    if (selectedDate) {
      setLocalStartDate(selectedDate)
      const formattedDate = formatDateToString(selectedDate)
      console.log("New start date selected:", formattedDate)

      // Ensure end date is not before start date
      const endDateObj = new Date(endDate)
      if (selectedDate > endDateObj) {
        const newEndDate = formatDateToString(selectedDate)
        console.log("Adjusting end date to match start date:", newEndDate)
        setLocalEndDate(selectedDate) // Update local end date
        onDateRangeChange(formattedDate, newEndDate)
      } else {
        onDateRangeChange(formattedDate, endDate)
      }
    }
  }

  const onChangeEndDate = (event, selectedDate) => {
    setShowEndDatePicker(Platform.OS === "ios")

    if (selectedDate) {
      setLocalEndDate(selectedDate)
      const formattedDate = formatDateToString(selectedDate)
      console.log("New end date selected:", formattedDate)

      // Ensure start date is not after end date
      const startDateObj = new Date(startDate)
      if (selectedDate < startDateObj) {
        const newStartDate = formatDateToString(selectedDate)
        console.log("Adjusting start date to match end date:", newStartDate)
        setLocalStartDate(selectedDate) // Update local start date
        onDateRangeChange(newStartDate, formattedDate)
      } else {
        onDateRangeChange(startDate, formattedDate)
      }
    }
  }

  // Predefined date ranges
  const dateRanges = [
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
  ]

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Date Range</Text>
        <View style={styles.quickFilters}>
          {dateRanges.map((range, index) => (
            <TouchableOpacity
              key={`range-${index}`}
              style={styles.quickFilterButton}
              onPress={() => {
                try {
                  const { start, end } = range.getRange()
                  console.log(`Quick filter: ${range.label}, ${start} to ${end}`)
                  onDateRangeChange(start, end)
                } catch (error) {
                  console.error(`Error applying ${range.label} filter:`, error)
                }
              }}
            >
              <Text style={styles.quickFilterText}>{range.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.dateContainer}>
        <View style={styles.dateRow}>
          <Text style={styles.dateLabel}>From:</Text>
          <TouchableOpacity style={styles.dateButton} onPress={() => setShowStartDatePicker(true)}>
            <Text style={styles.dateButtonText}>{formatDateForDisplay(startDate)}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.dateRow}>
          <Text style={styles.dateLabel}>To:</Text>
          <TouchableOpacity style={styles.dateButton} onPress={() => setShowEndDatePicker(true)}>
            <Text style={styles.dateButtonText}>{formatDateForDisplay(endDate)}</Text>
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
          minimumDate={new Date(startDate)}
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
