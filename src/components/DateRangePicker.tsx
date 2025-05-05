import React from "react"
import { View, Text, StyleSheet, TouchableOpacity, Platform } from "react-native"
import DateTimePicker from "@react-native-community/datetimepicker"

interface DateRangePickerProps {
  startDate: string
  endDate: string
  showStartDatePicker: boolean
  showEndDatePicker: boolean
  setShowStartDatePicker: (show: boolean) => void
  setShowEndDatePicker: (show: boolean) => void
  onChangeStartDate: (event: any, date?: Date) => void
  onChangeEndDate: (event: any, date?: Date) => void
}

const DateRangePicker = ({
  startDate,
  endDate,
  showStartDatePicker,
  showEndDatePicker,
  setShowStartDatePicker,
  setShowEndDatePicker,
  onChangeStartDate,
  onChangeEndDate,
}: DateRangePickerProps) => {
  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <Text style={styles.label}>From:</Text>
        <TouchableOpacity 
          style={styles.dateButton} 
          onPress={() => setShowStartDatePicker(true)}
        >
          <Text style={styles.dateText}>{startDate}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.row}>
        <Text style={styles.label}>To:</Text>
        <TouchableOpacity 
          style={styles.dateButton} 
          onPress={() => setShowEndDatePicker(true)}
        >
          <Text style={styles.dateText}>{endDate}</Text>
        </TouchableOpacity>
      </View>

      {showStartDatePicker && (
        <DateTimePicker
          value={new Date(startDate)}
          mode="date"
          display={Platform.OS === "ios" ? "spinner" : "default"}
          onChange={onChangeStartDate}
          minimumDate={new Date("1990-01-01")}
          maximumDate={new Date("2025-12-31")}
        />
      )}

      {showEndDatePicker && (
        <DateTimePicker
          value={new Date(endDate)}
          mode="date"
          display={Platform.OS === "ios" ? "spinner" : "default"}
          onChange={onChangeEndDate}
          minimumDate={new Date(startDate)}
          maximumDate={new Date("2025-12-31")}
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
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  label: {
    fontSize: 16,
    fontWeight: "500",
    color: "#333",
    width: 60,
  },
  dateButton: {
    flex: 1,
    backgroundColor: "#f0f0f0",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: "center",
  },
  dateText: {
    fontSize: 15,
    color: "#333",
    fontWeight: "500",
  },
})

export default DateRangePicker
