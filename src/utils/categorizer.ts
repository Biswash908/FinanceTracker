// Update the calculateFinancials function to handle pending transactions correctly
export const categorizeTransaction = (description: string, isPending?: boolean): string => {
  // If no description is provided, consider it uncategorized
  if (!description || description.trim() === "") {
    return "other"
  }

  description = description.toLowerCase()

  // Check for deposit patterns first
  if (
    /deposit|credit|transfer in|money received|incoming|refund|cashback|reimbursement|returned|money back/i.test(
      description,
    )
  ) {
    return "deposit"
  }

  // Check for salary/income patterns
  if (/salary|wage|payroll|income|bonus|commission|freelance|consulting|contract payment/i.test(description)) {
    return "income"
  }

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

export const calculateFinancials = (transactions) => {
  console.log(`Calculating financials for ${transactions?.length || 0} transactions`)

  let income = 0
  let expenses = 0
  let pendingAmount = 0
  const categoryTotals = {}
  const inflowCategories = {}
  const expenseCategories = {}

  // Check if transactions is an array before using forEach
  if (Array.isArray(transactions) && transactions.length > 0) {
    transactions.forEach((transaction) => {
      if (!transaction) return // Skip null or undefined transactions

      const amount = Number.parseFloat(transaction.amount || 0)
      const isPending = transaction.pending === true
      const description = transaction.description || ""

      // Only process transactions with non-zero amounts
      if (amount === 0) return

      // Determine if this is an inflow or outflow based on amount sign
      const isInflow = amount > 0

      // Get the appropriate category
      const category = categorizeTransaction(description, isPending)

      if (isPending) {
        // Track pending transactions separately
        pendingAmount += Math.abs(amount)

        // Add to the appropriate category based on transaction type
        if (isInflow) {
          inflowCategories[category] = (inflowCategories[category] || 0) + amount
        } else {
          expenseCategories[category] = (expenseCategories[category] || 0) + Math.abs(amount)
        }

        // For backward compatibility
        categoryTotals[category] = (categoryTotals[category] || 0) + Math.abs(amount)
      } else {
        // Non-pending transactions
        if (isInflow) {
          // Add to income
          income += amount

          // Add to inflow categories ONLY
          inflowCategories[category] = (inflowCategories[category] || 0) + amount

          // Don't add inflows to categoryTotals (it's meant for expenses only)
        } else {
          // Add to expenses
          const absAmount = Math.abs(amount)
          expenses += absAmount

          // Add to expense categories ONLY
          expenseCategories[category] = (expenseCategories[category] || 0) + absAmount

          // For backward compatibility
          categoryTotals[category] = (categoryTotals[category] || 0) + absAmount
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
  console.log(`Inflow categories:`, Object.keys(inflowCategories))
  console.log(`Expense categories:`, Object.keys(expenseCategories))

  return {
    income,
    expenses,
    balance,
    pendingAmount,
    categoryTotals,
    inflowCategories,
    expenseCategories,
  }
}
