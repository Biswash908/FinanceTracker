"use client"

import type React from "react"
import { useState, useEffect, useCallback } from "react"
import { View, Text, StyleSheet, ActivityIndicator } from "react-native"

interface ProgressiveLoaderProps {
  data: any[]
  renderItem: (item: any, index: number) => React.ReactNode
  batchSize?: number
  loadingDelay?: number
  placeholder?: React.ReactNode
  onLoadComplete?: () => void
}

export const ProgressiveLoader: React.FC<ProgressiveLoaderProps> = ({
  data,
  renderItem,
  batchSize = 10,
  loadingDelay = 50,
  placeholder,
  onLoadComplete,
}) => {
  const [loadedCount, setLoadedCount] = useState(0)
  const [isLoading, setIsLoading] = useState(false)

  const loadNextBatch = useCallback(() => {
    if (loadedCount >= data.length) {
      onLoadComplete?.()
      return
    }

    setIsLoading(true)

    setTimeout(() => {
      setLoadedCount((prev) => Math.min(prev + batchSize, data.length))
      setIsLoading(false)
    }, loadingDelay)
  }, [loadedCount, data.length, batchSize, loadingDelay, onLoadComplete])

  useEffect(() => {
    if (loadedCount < data.length) {
      loadNextBatch()
    }
  }, [loadNextBatch, loadedCount, data.length])

  useEffect(() => {
    // Reset when data changes
    setLoadedCount(0)
  }, [data])

  const visibleData = data.slice(0, loadedCount)

  return (
    <View style={styles.container}>
      {visibleData.map((item, index) => (
        <View key={index}>{renderItem(item, index)}</View>
      ))}

      {isLoading && loadedCount < data.length && (
        <View style={styles.loadingContainer}>
          {placeholder || (
            <>
              <ActivityIndicator size="small" color="#3498db" />
              <Text style={styles.loadingText}>
                Loading... ({loadedCount}/{data.length})
              </Text>
            </>
          )}
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  loadingText: {
    marginLeft: 8,
    fontSize: 14,
    color: "#666",
  },
})
