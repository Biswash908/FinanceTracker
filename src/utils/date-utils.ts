/**
 * Format a date object to YYYY-MM-DD string
 */
export const formatDateToString = (date: Date): string => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

/**
 * Get the first day of the current month
 */
export const getFirstDayOfMonth = (): string => {
  const now = new Date()
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
  return formatDateToString(firstDay)
}

/**
 * Get the current date as YYYY-MM-DD
 */
export const getCurrentDate = (): string => {
  return formatDateToString(new Date())
}

/**
 * Get date range for a specific period
 */
export const getDateRangeForPeriod = (period: string): { startDate: string; endDate: string } => {
  const now = new Date()
  const endDate = formatDateToString(now)
  let startDate: string

  switch (period) {
    case "today":
      startDate = endDate
      break

    case "yesterday":
      const yesterday = new Date(now)
      yesterday.setDate(yesterday.getDate() - 1)
      startDate = formatDateToString(yesterday)
      break

    case "this_week":
      // Get first day of current week (Sunday)
      const firstDayOfWeek = new Date(now)
      const day = now.getDay() // 0 = Sunday, 1 = Monday, etc.
      firstDayOfWeek.setDate(now.getDate() - day)
      startDate = formatDateToString(firstDayOfWeek)
      break

    case "this_month":
      // Get first day of current month
      startDate = formatDateToString(new Date(now.getFullYear(), now.getMonth(), 1))
      break

    case "this_year":
      // Get first day of current year
      startDate = formatDateToString(new Date(now.getFullYear(), 0, 1))
      break

    case "last_year":
      // Get first day of last year
      const lastYearStart = new Date(now.getFullYear() - 1, 0, 1)
      const lastYearEnd = new Date(now.getFullYear() - 1, 11, 31)
      startDate = formatDateToString(lastYearStart)
      return { startDate, endDate: formatDateToString(lastYearEnd) }

    case "last_3_years":
      // Get first day of 3 years ago
      const threeYearsAgo = new Date(now.getFullYear() - 3, 0, 1)
      startDate = formatDateToString(threeYearsAgo)
      break

    default:
      // Default to this month
      startDate = formatDateToString(new Date(now.getFullYear(), now.getMonth(), 1))
  }

  return { startDate, endDate }
}
