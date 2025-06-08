/**
 * Maps Lean's categories to UI-friendly categories
 * Lean Categories: https://www.leantech.me/product/financial-insights
 */

// Lean's predefined categories
export const LEAN_CATEGORIES = {
  BANK_FEES_AND_CHARGES: "BANK_FEES_AND_CHARGES",
  CHARITY: "CHARITY",
  EDUCATION: "EDUCATION",
  ENTERTAINMENT: "ENTERTAINMENT",
  GOVERNMENT: "GOVERNMENT",
  GROCERIES: "GROCERIES",
  HEALTH_AND_WELLBEING: "HEALTH_AND_WELLBEING",
  LOANS_AND_INVESTMENT: "LOANS_AND_INVESTMENT",
  RENT_AND_SERVICES: "RENT_AND_SERVICES",
  RESTAURANTS_DINING: "RESTAURANTS_DINING",
  RETAIL: "RETAIL",
  SALARY_AND_REVENUE: "SALARY_AND_REVENUE",
  TRANSFER: "TRANSFER",
  TRANSPORT: "TRANSPORT",
  TRAVEL: "TRAVEL",
  OTHER: "OTHER",
} as const

// UI categories used in your app
export const UI_CATEGORIES = {
  FOOD: "food",
  SHOPPING: "shopping",
  ENTERTAINMENT: "entertainment",
  UTILITIES: "utilities",
  TRANSPORT: "transport",
  EDUCATION: "education",
  HEALTH: "health",
  CHARITY: "charity",
  HOUSING: "housing",
  INCOME: "income",
  DEPOSIT: "deposit",
  OTHER: "other",
} as const

/**
 * Maps Lean's categories to your existing UI categories
 */
export const mapLeanCategoryToUI = (leanCategory: string | null): string => {
  if (!leanCategory) {
    return UI_CATEGORIES.OTHER
  }

  const categoryMap: Record<string, string> = {
    [LEAN_CATEGORIES.GROCERIES]: UI_CATEGORIES.FOOD,
    [LEAN_CATEGORIES.RESTAURANTS_DINING]: UI_CATEGORIES.FOOD,
    [LEAN_CATEGORIES.RETAIL]: UI_CATEGORIES.SHOPPING,
    [LEAN_CATEGORIES.ENTERTAINMENT]: UI_CATEGORIES.ENTERTAINMENT,
    [LEAN_CATEGORIES.TRAVEL]: UI_CATEGORIES.ENTERTAINMENT,
    [LEAN_CATEGORIES.RENT_AND_SERVICES]: UI_CATEGORIES.UTILITIES,
    [LEAN_CATEGORIES.TRANSPORT]: UI_CATEGORIES.TRANSPORT,
    [LEAN_CATEGORIES.EDUCATION]: UI_CATEGORIES.EDUCATION,
    [LEAN_CATEGORIES.HEALTH_AND_WELLBEING]: UI_CATEGORIES.HEALTH,
    [LEAN_CATEGORIES.CHARITY]: UI_CATEGORIES.CHARITY,
    [LEAN_CATEGORIES.SALARY_AND_REVENUE]: UI_CATEGORIES.INCOME,
    [LEAN_CATEGORIES.LOANS_AND_INVESTMENT]: UI_CATEGORIES.INCOME,
    [LEAN_CATEGORIES.TRANSFER]: UI_CATEGORIES.DEPOSIT,
    [LEAN_CATEGORIES.BANK_FEES_AND_CHARGES]: UI_CATEGORIES.OTHER,
    [LEAN_CATEGORIES.GOVERNMENT]: UI_CATEGORIES.OTHER,
    [LEAN_CATEGORIES.OTHER]: UI_CATEGORIES.OTHER,
  }

  return categoryMap[leanCategory.toUpperCase()] || UI_CATEGORIES.OTHER
}

/**
 * Categorizes a transaction using Lean's categorization data
 * Falls back to manual categorization if Lean data is not available
 */
export const categorizeTransaction = (transaction: any, isPending?: boolean): string => {
  // If transaction has Lean categorization data, use it
  if (transaction.lean_category) {
    console.log(
      `Using Lean category: ${transaction.lean_category} (confidence: ${transaction.lean_category_confidence})`,
    )
    return mapLeanCategoryToUI(transaction.lean_category)
  }

  // Fallback to manual categorization for older transactions or when Lean data is unavailable
  const description = transaction.description || transaction.lean_description || ""

  // If no description is provided, consider it uncategorized
  if (!description || description.trim() === "") {
    return UI_CATEGORIES.OTHER
  }

  const descriptionLower = description.toLowerCase()

  // Check for deposit patterns first
  if (
    /deposit|credit|transfer in|money received|incoming|refund|cashback|reimbursement|returned|money back/i.test(
      description,
    )
  ) {
    return UI_CATEGORIES.DEPOSIT
  }

  // Check for salary/income patterns
  if (/salary|wage|payroll|income|bonus|commission|freelance|consulting|contract payment/i.test(description)) {
    return UI_CATEGORIES.INCOME
  }

  // Check if this is a refund or reversal
  const isRefundOrReversal = /refund|reversal|reimbursement|cashback|returned|money\s+back/i.test(description)

  // Define category keywords for fallback
  const categories = {
    [UI_CATEGORIES.FOOD]: [
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
    [UI_CATEGORIES.SHOPPING]: [
      "shop",
      "store",
      "mall",
      "retail",
      "amazon",
      "ebay",
      "clothing",
      "fashion",
      "purchase",
      "online",
    ],
    [UI_CATEGORIES.ENTERTAINMENT]: [
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
    [UI_CATEGORIES.UTILITIES]: [
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
    [UI_CATEGORIES.TRANSPORT]: [
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
    [UI_CATEGORIES.EDUCATION]: [
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
    [UI_CATEGORIES.HEALTH]: [
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
    [UI_CATEGORIES.CHARITY]: ["donation", "donate", "charity", "nonprofit", "ngo", "foundation", "giving"],
    [UI_CATEGORIES.HOUSING]: [
      "rent",
      "mortgage",
      "apartment",
      "house",
      "housing",
      "accommodation",
      "property",
      "real estate",
      "home",
    ],
  }

  // If it's a refund or reversal, try to determine the original category
  if (isRefundOrReversal) {
    // Check each category for keywords
    for (const [category, keywords] of Object.entries(categories)) {
      if (keywords.some((keyword) => descriptionLower.includes(keyword))) {
        console.log(`Categorized refund/reversal "${description}" as ${category}`)
        return category
      }
    }

    // If we couldn't determine a specific category for the refund, use "other"
    console.log(`Couldn't determine specific category for refund/reversal "${description}", using "other"`)
    return UI_CATEGORIES.OTHER
  }

  // Regular categorization for non-refund transactions
  for (const [category, keywords] of Object.entries(categories)) {
    if (keywords.some((keyword) => descriptionLower.includes(keyword))) {
      return category
    }
  }

  // Default category
  return UI_CATEGORIES.OTHER
}

/**
 * Calculate financial summary with Lean categorization
 */
export const calculateFinancials = (transactions: any[]) => {
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

      // Only process transactions with non-zero amounts
      if (amount === 0) return

      // Determine if this is an inflow or outflow based on amount sign
      const isInflow = amount > 0

      // Get the appropriate category using Lean categorization
      const category = categorizeTransaction(transaction, isPending)

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
