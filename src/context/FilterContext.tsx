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

  // Initialization state
  isInitialized: boolean
  hasSavedSelection: boolean
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

  // Initialization tracking
  const [isInitialized, setIsInitialized] = useState(false)
  const [hasSavedSelection, setHasSavedSelection] = useState(false)

  // FIXED: Load saved selections immediately on mount
  useEffect(() => {
    const initializeContext = async () => {
      try {
        console.log("FilterContext: Initializing and loading saved selections...")

        const savedAccountIds = await AccountPersistenceService.loadSelectedAccounts()

        if (savedAccountIds.length > 0) {
          console.log("FilterContext: Found saved account selection:", savedAccountIds)
          setSelectedAccounts(savedAccountIds)
          setHasSavedSelection(true)
        } else {
          console.log("FilterContext: No saved account selection found")
          setHasSavedSelection(false)
        }
      } catch (error) {
        console.error("FilterContext: Error loading saved account selection:", error)
        setHasSavedSelection(false)
      } finally {
        setIsInitialized(true)
        console.log("FilterContext: Initialization complete")
      }
    }

    initializeContext()
  }, [])

  // FIXED: Validate saved selections when accounts are loaded
  useEffect(() => {
    if (accounts.length > 0 && isInitialized) {
      console.log("FilterContext: Validating saved account selection against loaded accounts...")
      console.log("FilterContext: Current selected accounts:", selectedAccounts)
      console.log(
        "FilterContext: Available account IDs:",
        accounts.map((acc) => acc.id),
      )

      if (selectedAccounts.length > 0) {
        const validAccountIds = AccountPersistenceService.validateAccountIds(selectedAccounts, accounts)

        if (validAccountIds.length !== selectedAccounts.length) {
          console.log("FilterContext: Some saved accounts are no longer valid")
          console.log(
            "FilterContext: Invalid accounts:",
            selectedAccounts.filter((id) => !validAccountIds.includes(id)),
          )
          console.log("FilterContext: Valid accounts:", validAccountIds)

          if (validAccountIds.length === 0) {
            console.log("FilterContext: No valid accounts found, clearing selection")
            setSelectedAccounts([])
            setHasSavedSelection(false)
            // Clear the invalid saved selection
            AccountPersistenceService.saveSelectedAccounts([])
          } else {
            console.log("FilterContext: Updating to valid accounts only:", validAccountIds)
            setSelectedAccounts(validAccountIds)
            // Save the corrected selection
            AccountPersistenceService.saveSelectedAccounts(validAccountIds)
          }
        } else {
          console.log("FilterContext: All saved accounts are valid")
        }
      }
    }
  }, [accounts, isInitialized])

  // FIXED: Auto-select first account if no valid selection exists after validation
  useEffect(() => {
    if (accounts.length > 0 && isInitialized && selectedAccounts.length === 0 && !hasSavedSelection) {
      console.log("FilterContext: No valid account selection, auto-selecting first available account")
      const firstAccountId = accounts[0].id
      console.log("FilterContext: Auto-selecting account:", firstAccountId)
      handleAccountsChange([firstAccountId])
    }
  }, [accounts, isInitialized, selectedAccounts, hasSavedSelection])

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
    setHasSavedSelection(accountIds.length > 0)

    // Save selected accounts to persistent storage
    await AccountPersistenceService.saveSelectedAccounts(accountIds)
  }

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
    isInitialized,
    hasSavedSelection,
  }

  return <FilterContext.Provider value={value}>{children}</FilterContext.Provider>
}
