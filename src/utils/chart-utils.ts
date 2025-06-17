/**
 * Generate nice scale intervals that end with 0 or 5
 */
export const generateNiceScale = (maxValue: number, steps = 5): number[] => {
  if (maxValue === 0) return [0]

  // Calculate the rough step size
  const roughStep = maxValue / steps

  // Find the magnitude (power of 10)
  const magnitude = Math.pow(10, Math.floor(Math.log10(roughStep)))

  // Normalize the rough step to 1-10 range
  const normalizedStep = roughStep / magnitude

  // Choose a nice step size
  let niceStep: number
  if (normalizedStep <= 1) niceStep = 1
  else if (normalizedStep <= 2) niceStep = 2
  else if (normalizedStep <= 2.5) niceStep = 2.5
  else if (normalizedStep <= 5) niceStep = 5
  else niceStep = 10

  // Convert back to actual step size
  const actualStep = niceStep * magnitude

  // Generate the scale
  const scale: number[] = []
  let current = 0

  while (current <= maxValue || scale.length < 2) {
    scale.push(current)
    current += actualStep

    // Safety check to prevent infinite loops
    if (scale.length > 10) break
  }

  // Ensure we have at least the max value covered
  if (scale[scale.length - 1] < maxValue) {
    scale.push(scale[scale.length - 1] + actualStep)
  }

  return scale.reverse() // Return in descending order for Y-axis
}

/**
 * Format currency values for chart labels
 */
export const formatChartLabel = (amount: number): string => {
  if (amount >= 1000000) {
    const millions = amount / 1000000
    return millions % 1 === 0 ? `${millions}M` : `${millions.toFixed(1)}M`
  }
  if (amount >= 1000) {
    const thousands = amount / 1000
    return thousands % 1 === 0 ? `${thousands}K` : `${thousands.toFixed(1)}K`
  }
  return amount.toString()
}
