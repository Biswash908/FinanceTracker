/**
 * Utility functions for date handling
 */

/**
 * Format a date object to YYYY-MM-DD string
 */
export const formatDateToString = (date: Date): string => {
    try {
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, "0")
      const day = String(date.getDate()).padStart(2, "0")
      return `${year}-${month}-${day}`
    } catch (error) {
      console.error("Error formatting date to string:", error)
      return new Date().toISOString().split("T")[0]
    }
  }
  
  /**
   * Format a date string for display (e.g., "Jan 1, 2023")
   */
  export const formatDateForDisplay = (dateString: string): string => {
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    } catch (error) {
      console.error("Error formatting date for display:", error, dateString)
      return dateString
    }
  }
  
  /**
   * Parse a date string to a Date object
   */
  export const parseDate = (dateString: string): Date => {
    try {
      // Handle YYYY-MM-DD format
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
        const [year, month, day] = dateString.split("-").map(Number)
        // Note: month is 0-indexed in JavaScript Date
        return new Date(year, month - 1, day)
      }
  
      // Default parsing
      return new Date(dateString)
    } catch (error) {
      console.error("Error parsing date:", error, dateString)
      return new Date()
    }
  }
  
  /**
   * Check if a date string is valid
   */
  export const isValidDateString = (dateString: string): boolean => {
    try {
      const date = new Date(dateString)
      return !isNaN(date.getTime())
    } catch {
      return false
    }
  }
  
  /**
   * Get the first day of the current month
   */
  export const getFirstDayOfMonth = (): string => {
    const now = new Date()
    return formatDateToString(new Date(now.getFullYear(), now.getMonth(), 1))
  }
  
  /**
   * Get the current date as a string
   */
  export const getCurrentDate = (): string => {
    return formatDateToString(new Date())
  }
  