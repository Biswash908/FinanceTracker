/**
 * Uses Lean's categories directly without mapping to custom UI categories
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

// Category descriptions for UI display
export const CATEGORY_DESCRIPTIONS = {
  BANK_FEES_AND_CHARGES: "Bank fees and charges",
  CHARITY: "Charitable causes",
  EDUCATION: "Education (school, university, courses)",
  ENTERTAINMENT: "Entertainment (cinema, Netflix)",
  GOVERNMENT: "Government (taxes, fines)",
  GROCERIES: "Food shopping",
  HEALTH_AND_WELLBEING: "Health (prescriptions, wellbeing, yoga)",
  LOANS_AND_INVESTMENT: "Loans and investments (dividends, loan repayments)",
  RENT_AND_SERVICES: "Household utilities and rent",
  RESTAURANTS_DINING: "Dining and takeaways",
  RETAIL: "Shopping",
  SALARY_AND_REVENUE: "Income sources",
  TRANSFER: "Money movements (transfers, cash withdrawals)",
  TRANSPORT: "Domestic travel (metro, cabs)",
  TRAVEL: "International travel (hotels, flights)",
  OTHER: "Uncategorized",
}

/**
 * Format a Lean category for display
 */
export const formatCategoryName = (category: string | null): string => {
  if (!category) return "Other"

  // Convert from UPPER_SNAKE_CASE to Title Case With Spaces
  return category
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ")
}

/**
 * Get category color based on Lean category
 */
export const getCategoryColor = (category: string | null): string => {
  if (!category) return "#AAAAAA"

  const categoryColors = {
    BANK_FEES_AND_CHARGES: "#607D8B", // Blue Grey
    CHARITY: "#E91E63", // Pink
    EDUCATION: "#9C27B0", // Purple
    ENTERTAINMENT: "#673AB7", // Deep Purple
    GOVERNMENT: "#3F51B5", // Indigo
    GROCERIES: "#4CAF50", // Green
    HEALTH_AND_WELLBEING: "#00BCD4", // Cyan
    LOANS_AND_INVESTMENT: "#009688", // Teal
    RENT_AND_SERVICES: "#FF5722", // Deep Orange
    RESTAURANTS_DINING: "#FF9800", // Orange
    RETAIL: "#FFC107", // Amber
    SALARY_AND_REVENUE: "#8BC34A", // Light Green
    TRANSFER: "#2196F3", // Blue
    TRANSPORT: "#03A9F4", // Light Blue
    TRAVEL: "#CDDC39", // Lime
    OTHER: "#9E9E9E", // Grey
  }

  return categoryColors[category] || "#9E9E9E"
}

/**
 * Get category emoji based on Lean category
 */
export const getCategoryEmoji = (category: string | null): string => {
  if (!category) return "📋"

  const categoryEmojis = {
    BANK_FEES_AND_CHARGES: "🏦",
    CHARITY: "❤️",
    EDUCATION: "📚",
    ENTERTAINMENT: "🎬",
    GOVERNMENT: "🏛️",
    GROCERIES: "🛒",
    HEALTH_AND_WELLBEING: "🏥",
    LOANS_AND_INVESTMENT: "📈",
    RENT_AND_SERVICES: "🏠",
    RESTAURANTS_DINING: "🍔",
    RETAIL: "🛍️",
    SALARY_AND_REVENUE: "💰",
    TRANSFER: "💸",
    TRANSPORT: "🚗",
    TRAVEL: "✈️",
    OTHER: "📋",
  }

  return categoryEmojis[category] || "📋"
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
    return transaction.lean_category
  }

  // Fallback to manual categorization for older transactions or when Lean data is unavailable
  const description = transaction.description || transaction.lean_description || ""

  // If no description is provided, consider it uncategorized
  if (!description || description.trim() === "") {
    return LEAN_CATEGORIES.OTHER
  }

  const descriptionLower = description.toLowerCase()

  // Check for deposit patterns first
  if (
    /deposit|credit|transfer in|money received|incoming|refund|cashback|reimbursement|returned|money back/i.test(
      description,
    )
  ) {
    return LEAN_CATEGORIES.TRANSFER
  }

  // Check for salary/income patterns
  if (/salary|wage|payroll|income|bonus|commission|freelance|consulting|contract payment/i.test(description)) {
    return LEAN_CATEGORIES.SALARY_AND_REVENUE
  }

  // Define category keywords for fallback
  const categories = {
    [LEAN_CATEGORIES.GROCERIES]: ["grocery", "supermarket", "food", "market", "fruit", "vegetable", "bakery"],
    [LEAN_CATEGORIES.RESTAURANTS_DINING]: [
      "restaurant",
      "cafe",
      "coffee",
      "meal",
      "pizza",
      "burger",
      "dining",
      "takeaway",
      "food delivery",
    ],
    [LEAN_CATEGORIES.RETAIL]: [
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
    [LEAN_CATEGORIES.ENTERTAINMENT]: [
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
    ],
    [LEAN_CATEGORIES.RENT_AND_SERVICES]: [
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
      "rent",
      "mortgage",
      "apartment",
      "house",
      "housing",
      "accommodation",
      "property",
    ],
    [LEAN_CATEGORIES.TRANSPORT]: [
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
    [LEAN_CATEGORIES.EDUCATION]: [
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
    [LEAN_CATEGORIES.HEALTH_AND_WELLBEING]: [
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
      "wellness",
      "gym",
      "fitness",
      "spa",
    ],
    [LEAN_CATEGORIES.CHARITY]: ["donation", "donate", "charity", "nonprofit", "ngo", "foundation", "giving"],
    [LEAN_CATEGORIES.TRAVEL]: [
      "hotel",
      "flight",
      "airline",
      "booking",
      "airbnb",
      "travel",
      "vacation",
      "holiday",
      "trip",
      "tour",
    ],
    [LEAN_CATEGORIES.BANK_FEES_AND_CHARGES]: [
      "fee",
      "charge",
      "interest",
      "overdraft",
      "bank charge",
      "service fee",
      "maintenance fee",
    ],
    [LEAN_CATEGORIES.GOVERNMENT]: [
      "tax",
      "fine",
      "penalty",
      "government",
      "license",
      "permit",
      "registration",
      "court",
    ],
    [LEAN_CATEGORIES.LOANS_AND_INVESTMENT]: [
      "loan",
      "investment",
      "dividend",
      "stock",
      "bond",
      "mutual fund",
      "repayment",
      "interest",
    ],
  }

  // Check each category for keywords
  for (const [category, keywords] of Object.entries(categories)) {
    if (keywords.some((keyword) => descriptionLower.includes(keyword))) {
      return category
    }
  }

  // Default category
  return LEAN_CATEGORIES.OTHER
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
