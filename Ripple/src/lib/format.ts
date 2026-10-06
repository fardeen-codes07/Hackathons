export const formatNumber = (value: number) => new Intl.NumberFormat("en-US").format(value)

export const formatCurrency = (value: number) => value === 0 ? "₹0" : `₹${formatNumber(Math.round(value / 1000))}K`

export const formatPercent = (value: number) => `${Math.round(value)}%`

export function formatSimulationClock(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const remaining = minutes % 60
  return `T+${String(hours).padStart(2, "0")}:${String(remaining).padStart(2, "0")}`
}

export function titleCase(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1)
}
