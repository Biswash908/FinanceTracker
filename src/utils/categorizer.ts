/**
 * Categorize a transaction based on its description
 */
export const categorizeTransaction = (description: string): string => {
  description = description.toLowerCase()

  // Define category keywords
  const categories = {
    food: ["restaurant", "cafe", "coffee", "grocery", "food", "meal", "pizza", "burger", "bakery", "supermarket"],
    shopping: ["shop", "store", "mall", "retail", "amazon", "ebay", "clothing", "fashion", "purchase"],
    entertainment: ["movie", "cinema", "theater", "netflix", "spotify", "game", "entertainment", "concert", "ticket"],
    utilities: ["electric", "water", "gas", "internet", "phone", "bill", "utility", "utilities"],
    transport: ["uber", "lyft", "taxi", "transport", "bus", "train", "metro", "fuel", "gas station", "parking"],
    education: ["school", "college", "university", "course", "class", "tuition", "education", "book", "learning"],
    health: ["doctor", "hospital", "medical", "pharmacy", "health", "dental", "clinic", "medicine"],
    charity: ["donation", "donate", "charity", "nonprofit", "ngo"],
    housing: ["rent", "mortgage", "apartment", "house", "housing", "accommodation", "property"],
  }

  // Check each category
  for (const [category, keywords] of Object.entries(categories)) {
    if (keywords.some((keyword) => description.includes(keyword))) {
      return category
    }
  }

  // Default category
  return "other"
}

// Update the calculateFinancials function to be more robust with undefined data
export const calculateFinancials = (transactions) => {
  console.log(`Calculating financials for ${transactions?.length || 0} transactions`)

  let income = 0
  let expenses = 0
  const categoryTotals = {}

  // Check if transactions is an array before using forEach
  if (Array.isArray(transactions) && transactions.length > 0) {
    transactions.forEach((transaction) => {
      if (!transaction) return // Skip null or undefined transactions

      const amount = Number.parseFloat(transaction.amount || 0)

      if (amount > 0) {
        income += amount
        // Add to income category
        categoryTotals["income"] = (categoryTotals["income"] || 0) + amount
      } else if (amount < 0) {
        expenses += Math.abs(amount)

        // Categorize and add to category totals
        const category = categorizeTransaction(transaction.description || "")
        categoryTotals[category] = (categoryTotals[category] || 0) + Math.abs(amount)
      }
    })
  } else {
    console.warn("calculateFinancials received invalid transactions data:", typeof transactions)
  }

  const balance = income - expenses

  console.log(`Calculated: Income=${income.toFixed(2)}, Expenses=${expenses.toFixed(2)}`)

  return {
    income,
    expenses,
    balance,
    categoryTotals,
  }
}
