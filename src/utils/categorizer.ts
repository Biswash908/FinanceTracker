// Categories for expense classification
export const categories = {
    food: [
      "restaurant",
      "food",
      "grocery",
      "carrefour",
      "danube",
      "choithram",
      "sushi",
      "pizza",
      "mcdonalds",
      "starbucks",
      "coffee",
      "zomato",
      "subway",
      "noodle",
      "zuma",
      "zaatar",
    ],
    shopping: [
      "shop",
      "store",
      "market",
      "amazon",
      "amzn",
      "uniqlo",
      "zara",
      "nike",
      "body shop",
      "armour",
      "abercrombie",
      "purchase",
    ],
    entertainment: ["cinema", "movie", "netflix", "playstation", "nintendo", "game", "entertainment"],
    utilities: ["etisalat", "du", "utility", "utilities", "telecom", "mobile", "phone", "internet", "virgin"],
    transport: ["taxi", "uber", "careem", "transport", "transportation", "fuel", "gas", "petrol", "esso"],
    education: ["school", "university", "college", "education", "academy", "course", "prometric", "exam"],
    health: ["hospital", "clinic", "doctor", "medical", "pharmacy", "health", "healthcare", "insurance", "bupa"],
    charity: ["charity", "donation", "zakat", "give"],
    housing: ["rent", "housing", "accommodation", "property", "real estate"],
    other: [],
  }
  
  /**
   * Categorize a transaction based on its description
   */
  export const categorizeTransaction = (description: string): string => {
    description = description.toLowerCase()
  
    for (const [category, keywords] of Object.entries(categories)) {
      for (const keyword of keywords) {
        if (description.includes(keyword.toLowerCase())) {
          return category
        }
      }
    }
    return "other"
  }
  
  /**
   * Calculate financial summary from transactions
   */
  export const calculateFinancials = (transactions: any[]) => {
    let income = 0
    let expenses = 0
    const categoryTotals = Object.keys(categories).reduce((acc, cat) => {
      acc[cat] = 0
      return acc
    }, {} as {[key: string]: number})
  
    transactions.forEach((transaction) => {
      const amount = Number.parseFloat(transaction.amount)
  
      // Income is positive, expenses are negative
      if (amount > 0) {
        income += amount
      } else if (amount < 0) {
        expenses += Math.abs(amount)
  
        // Categorize and add to category total
        const category = categorizeTransaction(transaction.description)
        categoryTotals[category] += Math.abs(amount)
      }
    })
  
    return { income, expenses, balance: income - expenses, categoryTotals }
  }
  