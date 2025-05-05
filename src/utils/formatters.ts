/**
 * Format a date string to YYYY-MM-DD
 */
export const formatDate = (dateString: string): string => {
    const date = new Date(dateString)
    return date.toISOString().split("T")[0]
  }
  
  /**
   * Format a currency amount with 2 decimal places and currency code
   */
  export const formatCurrency = (amount: number | string, currency: string = "AED"): string => {
    const numAmount = typeof amount === "string" ? parseFloat(amount) : amount
    return `${Math.abs(numAmount).toFixed(2)} ${currency}`
  }
  
  /**
   * Truncate a string to a maximum length and add ellipsis if needed
   */
  export const truncateText = (text: string, maxLength: number = 40): string => {
    return text.length > maxLength ? text.substring(0, maxLength) + "..." : text
  }
  