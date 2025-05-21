/**
 * Categorize a transaction based on its description and pending status
 */
export const categorizeTransaction = (description: string, isPending?: boolean): string => {
  // If no description is provided, consider it uncategorized
  if (!description || description.trim() === "") {
    return "other"
  }

  description = description.toLowerCase()

  // Check if this is a refund or reversal
  const isRefundOrReversal = /refund|reversal|reimbursement|cashback|returned|money\s+back/i.test(description)

  // Define category keywords
  const categories = {
    food: [
      "restaurant",
      "cafe",
      "coffee",
      "grocery",
      "food",
      "meal",
      "pizza",
      "burger",
      "bakery",
      "supermarket",
      "dining",
    ],
    shopping: ["shop", "store", "mall", "retail", "amazon", "ebay", "clothing", "fashion", "purchase", "online"],
    entertainment: [
      "movie",
      "cinema",
      "theater",
      "netflix",
      "spotify",
      "disney",
      "hulu",
      "hbo",
      "game",
      "entertainment",
      "concert",
      "ticket",
      "subscription",
      "streaming",
      "music",
      "video",
      "play",
      "show",
    ],
    utilities: [
      "electric",
      "water",
      "gas",
      "internet",
      "phone",
      "bill",
      "utility",
      "utilities",
      "broadband",
      "telecom",
    ],
    transport: [
      "uber",
      "lyft",
      "taxi",
      "transport",
      "bus",
      "train",
      "metro",
      "fuel",
      "gas station",
      "parking",
      "car",
      "vehicle",
    ],
    education: [
      "school",
      "college",
      "university",
      "course",
      "class",
      "tuition",
      "education",
      "book",
      "learning",
      "study",
    ],
    health: [
      "doctor",
      "hospital",
      "medical",
      "pharmacy",
      "health",
      "dental",
      "clinic",
      "medicine",
      "insurance",
      "healthcare",
      "protect plus",
      "premium",
      "coverage",
      "wellness",
    ],
    charity: ["donation", "donate", "charity", "nonprofit", "ngo", "foundation", "giving"],
    housing: ["rent", "mortgage", "apartment", "house", "housing", "accommodation", "property", "real estate", "home"],
  }

  // If it's a refund or reversal, try to determine the original category
  if (isRefundOrReversal) {
    // Check each category for keywords
    for (const [category, keywords] of Object.entries(categories)) {
      if (keywords.some((keyword) => description.includes(keyword))) {
        console.log(`Categorized refund/reversal "${description}" as ${category}`)
        return category
      }
    }

    // If we couldn't determine a specific category for the refund, use "other"
    console.log(`Couldn't determine specific category for refund/reversal "${description}", using "other"`)
    return "other"
  }

  // Regular categorization for non-refund transactions
  for (const [category, keywords] of Object.entries(categories)) {
    if (keywords.some((keyword) => description.includes(keyword))) {
      return category
    }
  }

  // Default category
  return "other"
}

// Update the calculateFinancials function to handle pending transactions correctly
export const calculateFinancials = (transactions) => {
  console.log(`Calculating financials for ${transactions?.length || 0} transactions`)

  let income = 0
  let expenses = 0
  let pendingAmount = 0
  const categoryTotals = {}

  // Check if transactions is an array before using forEach
  if (Array.isArray(transactions) && transactions.length > 0) {
    transactions.forEach((transaction) => {
      if (!transaction) return // Skip null or undefined transactions

      const amount = Number.parseFloat(transaction.amount || 0)
      const isPending = transaction.pending === true
      const description = transaction.description || ""

      // Check if this is a refund or reversal
      const isRefundOrReversal = /refund|reversal|reimbursement|cashback|returned|money\s+back/i.test(
        description.toLowerCase(),
      )

      if (isPending) {
        // Track pending transactions separately
        if (amount < 0) {
          // Only negative amounts (outflows) go to pending
          pendingAmount += Math.abs(amount)
        } else if (amount > 0) {
          // Positive pending amounts (inflows) go to income
          income += amount
        }

        // Categorize pending transactions for the category totals
        let category
        if (amount > 0) {
          // For positive amounts (inflows), check if it's a refund/reversal
          if (isRefundOrReversal) {
            category = categorizeTransaction(description, false)
          } else {
            category = "income"
          }
        } else {
          // For negative amounts (outflows)
          category = categorizeTransaction(description, false)
        }

        // Add to the category for total calculations
        categoryTotals[category] = (categoryTotals[category] || 0) + Math.abs(amount)
      } else {
        // Non-pending transactions
        if (amount > 0) {
          // Add to income
          income += amount

          // For positive amounts (inflows), check if it's a refund/reversal
          if (isRefundOrReversal) {
            const category = categorizeTransaction(description, false)
            categoryTotals[category] = (categoryTotals[category] || 0) + amount
          } else {
            // Add to income category if not a refund/reversal
            categoryTotals["income"] = (categoryTotals["income"] || 0) + amount
          }
        } else if (amount < 0) {
          // Add to expenses (only non-pending expenses)
          expenses += Math.abs(amount)

          // Categorize and add to category totals
          const category = categorizeTransaction(description, false)
          categoryTotals[category] = (categoryTotals[category] || 0) + Math.abs(amount)
        }
      }
    })
  } else {
    console.warn("calculateFinancials received invalid transactions data:", typeof transactions)
  }

  // Calculate balance: income - expenses - pendingAmount
  const balance = income - expenses - pendingAmount

  console.log(
    `Calculated: Income=${income.toFixed(2)}, Expenses=${expenses.toFixed(2)}, Pending=${pendingAmount.toFixed(2)}, Balance=${balance.toFixed(2)}`,
  )

  return {
    income,
    expenses,
    balance,
    pendingAmount,
    categoryTotals,
  }
}
