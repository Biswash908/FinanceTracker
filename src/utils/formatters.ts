/**
 * Format a date string to YYYY-MM-DD format
 */
export const formatDate = (dateString: string): string => {
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

/**
 * Format currency with symbol
 */
export const formatCurrency = (amount: number, currency = "AED"): string => {
  try {
    return `${Math.abs(amount).toFixed(2)} ${currency}`
  } catch (error) {
    console.error("Error formatting currency:", error)
    return `${amount} ${currency}`
  }
}

/**
 * Truncate long text with ellipsis
 */
export const truncateText = (text: string, maxLength = 40): string => {
  if (!text) return ""
  return text.length > maxLength ? text.substring(0, maxLength) + "..." : text
}

/**
 * Format date to YYYY-MM-DD
 */
export const formatDateToString = (date: Date): string => {
  try {
    return date.toISOString().split("T")[0]
  } catch (error) {
    console.error("Error formatting date to string:", error)
    return new Date().toISOString().split("T")[0]
  }
}

/**
 * Get current date in YYYY-MM-DD format
 */
export const getCurrentDate = (): string => {
  return formatDateToString(new Date())
}

/**
 * Get first day of current month in YYYY-MM-DD format
 */
export const getFirstDayOfMonth = (): string => {
  const now = new Date()
  return formatDateToString(new Date(now.getFullYear(), now.getMonth(), 1))
}
