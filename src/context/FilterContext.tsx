"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import { getFirstDayOfMonth, getCurrentDate } from "../utils/date-utils"
import { AccountPersistenceService } from "../services/account-persistence"

interface FilterContextType {
  // Date range state
  startDate: string
  endDate: string
  setStartDate: (date: string) => void
  setEndDate: (date: string) => void
  handleDateRangeChange: (startDate: string, endDate: string) => void

  // Account selection state
  selectedAccounts: string[]
  setSelectedAccounts: (accounts: string[]) => void
  handleAccountsChange: (accountIds: string[]) => void

  // Accounts data
  accounts: any[]
  setAccounts: (accounts: any[]) => void
}

const FilterContext = createContext<FilterContextType | undefined>(undefined)

export const useFilters = () => {
  const context = useContext(FilterContext)
  if (!context) {
    throw new Error("useFilters must be used within a FilterProvider")
  }
  return context
}

interface FilterProviderProps {
  children: ReactNode
}

export const FilterProvider: React.FC<FilterProviderProps> = ({ children }) => {
  // Date range state
  const [startDate, setStartDate] = useState(getFirstDayOfMonth())
  const [endDate, setEndDate] = useState(getCurrentDate())

  // Account selection state
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([])
  const [accounts, setAccounts] = useState<any[]>([])

  // Handle date range changes
  const handleDateRangeChange = (newStartDate: string, newEndDate: string) => {
    console.log(`FilterContext: Date range changed to ${newStartDate} - ${newEndDate}`)
    setStartDate(newStartDate)
    setEndDate(newEndDate)
  }

  // Handle account selection changes
  const handleAccountsChange = async (accountIds: string[]) => {
    console.log("FilterContext: Selected account IDs:", accountIds)
    setSelectedAccounts(accountIds)

    // Save selected accounts to persistent storage
    await AccountPersistenceService.saveSelectedAccounts(accountIds)
  }

  // Load saved account selection on mount
  useEffect(() => {
    const loadSavedAccountSelection = async () => {
      try {
        const savedAccountIds = await AccountPersistenceService.loadSelectedAccounts()
        if (savedAccountIds.length > 0 && accounts.length > 0) {
          // Validate that saved accounts still exist
          const validAccountIds = AccountPersistenceService.validateAccountIds(savedAccountIds, accounts)
          if (validAccountIds.length > 0) {
            console.log("FilterContext: Restoring saved account selection:", validAccountIds)
            setSelectedAccounts(validAccountIds)
          }
        }
      } catch (error) {
        console.error("Error loading saved account selection:", error)
      }
    }

    if (accounts.length > 0) {
      loadSavedAccountSelection()
    }
  }, [accounts])

  const value: FilterContextType = {
    startDate,
    endDate,
    setStartDate,
    setEndDate,
    handleDateRangeChange,
    selectedAccounts,
    setSelectedAccounts,
    handleAccountsChange,
    accounts,
    setAccounts,
  }

  return <FilterContext.Provider value={value}>{children}</FilterContext.Provider>
}
