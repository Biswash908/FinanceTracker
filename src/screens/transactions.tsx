"use client"

import { useState } from "react"
import { View, Text, FlatList, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView, Platform } from "react-native"
import { BEARER_TOKEN, ENTITY_ID, ACCOUNT_ID } from "@env"
import DateTimePicker from "@react-native-community/datetimepicker"

export default function TransactionsScreen() {
  const [categorized, setCategorized] = useState(null)
  const [selectedMain, setSelectedMain] = useState(null)
  const [selectedSub, setSelectedSub] = useState(null)
  const [loading, setLoading] = useState(false)
  const [totals, setTotals] = useState({ income: 0, expense: 0 })
  const [filteredTotals, setFilteredTotals] = useState({ income: 0, expense: 0 })

  // Date filter state
  const [startDate, setStartDate] = useState(new Date(1990, 0, 1))
  const [endDate, setEndDate] = useState(new Date(2025, 11, 31))
  const [showStartPicker, setShowStartPicker] = useState(false)
  const [showEndPicker, setShowEndPicker] = useState(false)
  const [error, setError] = useState(null)

  const sendPostRequest = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch("https://sandbox.leantech.me/data/v1/transactions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${BEARER_TOKEN}`,
          "Content-Type": "application/json",
          Scope: "api",
        },
        body: JSON.stringify({
          entity_id: ENTITY_ID,
          account_id: ACCOUNT_ID,
        }),
      })

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`)
      }

      const data = await response.json()

      if (data.payload && data.payload.transactions) {
        const categorized = categorizeTransactions(data.payload.transactions)
        setCategorized(categorized)
      } else {
        setError("Invalid response format: missing transactions data")
      }
    } catch (error) {
      console.error("Error:", error)
      setError(`Error: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const categorizeTransactions = (transactions) => {
    const categorized = {
      income: [],
      expense: {
        groceries: [],
        dining: [],
        utilities: [],
        entertainment: [],
        shopping: [],
        health_education: [],
        transport: [],
        charity: [],
        rent_services: [],
        other: [],
      },
    }

    let totalIncome = 0
    let totalExpense = 0
    let filteredIncome = 0
    let filteredExpense = 0

    const isInDateRange = (dateStr) => {
      const txnDate = new Date(dateStr)
      return txnDate >= startDate && txnDate <= endDate
    }

    transactions.forEach((txn) => {
      const desc = txn.description.toLowerCase()
      const amt = txn.amount
      const isInRange = isInDateRange(txn.timestamp)

      // Process all transactions for all-time totals
      if (amt > 0) {
        categorized.income.push(txn)
        totalIncome += amt
        if (isInRange) filteredIncome += amt
      } else {
        const absAmt = Math.abs(amt)
        totalExpense += absAmt
        if (isInRange) filteredExpense += absAmt

        const match = (keywords) => keywords.some((k) => desc.includes(k))

        if (match(["carrefour", "madina", "hypermarket", "7-eleven", "lulu", "choithram", "danube", "foodstuff"])) {
          categorized.expense.groceries.push(txn)
        } else if (
          match([
            "restaurant",
            "sushi",
            "zomato",
            "noodle",
            "caribou",
            "starbucks",
            "bento",
            "subway",
            "zaater",
            "mcdonalds",
            "pizza",
          ])
        ) {
          categorized.expense.dining.push(txn)
        } else if (match(["etisalat", "gov", "vat", "utility", "smart", "dubai smart"])) {
          categorized.expense.utilities.push(txn)
        } else if (match(["netflix", "cinema", "cine", "playstation", "uber", "facebk", "nintendo"])) {
          categorized.expense.entertainment.push(txn)
        } else if (
          match(["amazon", "zara", "nike", "under armour", "uniqlo", "top shop", "body shop", "abercrombie"])
        ) {
          categorized.expense.shopping.push(txn)
        } else if (match(["school", "university", "nursery", "prometric", "education", "american school", "gems"])) {
          categorized.expense.health_education.push(txn)
        } else if (match(["atm", "swansea", "esso", "petrol", "transport", "convenience", "dvla"])) {
          categorized.expense.transport.push(txn)
        } else if (match(["yalla", "zakat", "charity", "romanian", "donate"])) {
          categorized.expense.charity.push(txn)
        } else if (match(["rent", "installment", "stcpay", "development authority", "loan"])) {
          categorized.expense.rent_services.push(txn)
        } else {
          categorized.expense.other.push(txn)
        }
      }
    })

    setTotals({ income: totalIncome, expense: totalExpense })
    setFilteredTotals({ income: filteredIncome, expense: filteredExpense })

    return categorized
  }

  const formatDate = (date) => {
    const day = date.getDate().toString().padStart(2, "0")
    const month = (date.getMonth() + 1).toString().padStart(2, "0")
    const year = date.getFullYear()
    return `${year}-${month}-${day}`
  }

  const onStartDateChange = (event, selectedDate) => {
    setShowStartPicker(false)
    if (selectedDate) {
      setStartDate(selectedDate)
      if (categorized) {
        const allTransactions = [...categorized.income, ...Object.values(categorized.expense).flat()]
        setCategorized(categorizeTransactions(allTransactions))
      }
    }
  }

  const onEndDateChange = (event, selectedDate) => {
    setShowEndPicker(false)
    if (selectedDate) {
      setEndDate(selectedDate)
      if (categorized) {
        const allTransactions = [...categorized.income, ...Object.values(categorized.expense).flat()]
        setCategorized(categorizeTransactions(allTransactions))
      }
    }
  }

  const renderTransactions = (transactions) => (
    <ScrollView style={styles.scrollBox} nestedScrollEnabled={true} keyboardShouldPersistTaps="handled">
      {transactions.map((txn, idx) => (
        <Text key={idx} style={styles.transactionText}>
          {new Date(txn.timestamp).toLocaleDateString()} - {txn.description.substring(0, 40)}
          {txn.description.length > 40 ? "..." : ""} - {txn.amount.toFixed(2)} {txn.currency_code}
        </Text>
      ))}
    </ScrollView>
  )

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <TouchableOpacity style={styles.button} onPress={sendPostRequest}>
        <Text style={styles.buttonText}>Fetch Transactions</Text>
      </TouchableOpacity>

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <View style={styles.summaryContainer}>
        <Text style={styles.summaryTitle}>Transaction Summary</Text>
        <Text style={styles.summaryText}>All-time Income: {totals.income.toFixed(2)} AED</Text>
        <Text style={styles.summaryText}>All-time Expenses: {totals.expense.toFixed(2)} AED</Text>
        <Text style={styles.summaryText}>Balance: {(totals.income - totals.expense).toFixed(2)} AED</Text>
      </View>

      <View style={styles.dateFilterContainer}>
        <Text style={styles.filterTitle}>Filter by Date Range</Text>

        <View style={styles.dateRow}>
          <Text style={styles.dateLabel}>From:</Text>
          <TouchableOpacity style={styles.dateButton} onPress={() => setShowStartPicker(true)}>
            <Text>{formatDate(startDate)}</Text>
          </TouchableOpacity>

          {showStartPicker && (
            <DateTimePicker
              value={startDate}
              mode="date"
              display="default"
              onChange={onStartDateChange}
              minimumDate={new Date(1990, 0, 1)}
              maximumDate={new Date(2025, 11, 31)}
            />
          )}
        </View>

        <View style={styles.dateRow}>
          <Text style={styles.dateLabel}>To:</Text>
          <TouchableOpacity style={styles.dateButton} onPress={() => setShowEndPicker(true)}>
            <Text>{formatDate(endDate)}</Text>
          </TouchableOpacity>

          {showEndPicker && (
            <DateTimePicker
              value={endDate}
              mode="date"
              display="default"
              onChange={onEndDateChange}
              minimumDate={new Date(1990, 0, 1)}
              maximumDate={new Date(2025, 11, 31)}
            />
          )}
        </View>

        <View style={styles.filteredSummary}>
          <Text style={styles.summaryText}>Filtered Income: {filteredTotals.income.toFixed(2)} AED</Text>
          <Text style={styles.summaryText}>Filtered Expenses: {filteredTotals.expense.toFixed(2)} AED</Text>
          <Text style={styles.summaryText}>
            Filtered Balance: {(filteredTotals.income - filteredTotals.expense).toFixed(2)} AED
          </Text>
        </View>
      </View>

      {loading && <ActivityIndicator size="large" color="#0000ff" style={{ marginTop: 20 }} />}

      {categorized && (
        <>
          <TouchableOpacity
            style={styles.categoryHeader}
            onPress={() => {
              setSelectedMain(selectedMain === "income" ? null : "income")
              setSelectedSub(null)
            }}
          >
            <Text style={styles.categoryText}>
              INCOME ({categorized.income.length}) - {filteredTotals.income.toFixed(2)} AED
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.categoryHeader}
            onPress={() => {
              setSelectedMain(selectedMain === "expense" ? null : "expense")
              setSelectedSub(null)
            }}
          >
            <Text style={styles.categoryText}>EXPENSES - {filteredTotals.expense.toFixed(2)} AED</Text>
          </TouchableOpacity>

          {selectedMain === "expense" &&
            Object.entries(categorized.expense).map(([sub, txns]) => (
              <TouchableOpacity
                key={sub}
                style={styles.subCategoryHeader}
                onPress={() => setSelectedSub(selectedSub === sub ? null : sub)}
              >
                <Text style={styles.subCategoryText}>
                  {sub.replace("_", " ").toUpperCase()} ({txns.length}) -{" "}
                  {txns.reduce((sum, txn) => sum + Math.abs(txn.amount), 0).toFixed(2)} AED
                </Text>
              </TouchableOpacity>
            ))}

          <View style={styles.box}>
            {selectedMain === "income" && renderTransactions(categorized.income)}
            {selectedMain === "expense" && selectedSub && renderTransactions(categorized.expense[selectedSub])}
          </View>
        </>
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#ffffff",
    padding: 20,
    paddingBottom: 50,
  },
  button: {
    backgroundColor: "#007bff",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  buttonText: {
    color: "#ffffff",
    fontWeight: "bold",
  },
  errorContainer: {
    backgroundColor: "#ffeeee",
    padding: 10,
    borderRadius: 6,
    marginTop: 10,
    borderWidth: 1,
    borderColor: "#ffcccc",
  },
  errorText: {
    color: "#cc0000",
  },
  summaryContainer: {
    marginTop: 20,
    padding: 15,
    backgroundColor: "#f5f5f5",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 8,
  },
  summaryText: {
    fontSize: 14,
    marginBottom: 4,
  },
  dateFilterContainer: {
    marginTop: 20,
    padding: 15,
    backgroundColor: "#f5f5f5",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  filterTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 10,
  },
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  dateLabel: {
    width: 50,
    fontSize: 14,
  },
  dateButton: {
    flex: 1,
    padding: 10,
    backgroundColor: "#ffffff",
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#cccccc",
  },
  filteredSummary: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
  },
  categoryHeader: {
    backgroundColor: "#e0e0e0",
    padding: 10,
    borderRadius: 6,
    marginTop: 10,
  },
  categoryText: {
    fontWeight: "bold",
  },
  subCategoryHeader: {
    backgroundColor: "#f0f0f0",
    padding: 8,
    paddingLeft: 20,
    borderRadius: 6,
    marginTop: 5,
  },
  subCategoryText: {
    fontSize: 13,
  },
  box: {
    backgroundColor: "#f9f9f9",
    borderRadius: 10,
    marginTop: 15,
    maxHeight: 300,
    overflow: "hidden",
  },
  scrollBox: {
    padding: 10,
  },
  transactionText: {
    fontSize: 12,
    paddingVertical: 2,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
  },
})
