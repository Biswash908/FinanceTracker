"use client"

import type React from "react"
import { useRef, useState, useEffect } from "react"
import { View, StyleSheet, PanResponder, Animated } from "react-native"

interface CustomScrollbarProps {
  scrollViewRef: React.RefObject<any>
  contentHeight: number
  containerHeight: number
  scrollY: Animated.Value
  isDarkMode: boolean
  setScrollEnabled?: (enabled: boolean) => void
}

const CustomScrollbar = ({
  scrollViewRef,
  contentHeight,
  containerHeight,
  scrollY,
  isDarkMode,
  setScrollEnabled,
}: CustomScrollbarProps) => {
  // Calculate scrollbar height based on content and container ratio
  const scrollbarHeight = Math.max(
    30, // Minimum scrollbar height
    (containerHeight / contentHeight) * containerHeight,
  )

  // Calculate the maximum scrollbar position
  const maxScrollbarPosition = containerHeight - scrollbarHeight

  // State to track scrollbar position
  const [scrollbarPosition, setScrollbarPosition] = useState(0)

  // State to track if we're currently dragging
  const [isDragging, setIsDragging] = useState(false)

  // Reference to store the starting position for dragging
  const startDragY = useRef(0)
  const startScrollbarPos = useRef(0)
  const lastScrollPosition = useRef(0)

  // Update scrollbar position based on scroll position when not dragging
  useEffect(() => {
    const listener = scrollY.addListener(({ value }) => {
      // Store the last scroll position
      lastScrollPosition.current = value

      if (!isDragging) {
        // Calculate the position of the scrollbar based on scroll position
        const maxScroll = Math.max(1, contentHeight - containerHeight)
        const newPosition = (value / maxScroll) * maxScrollbarPosition

        // Ensure scrollbar position stays within bounds
        const boundedPosition = Math.max(0, Math.min(newPosition, maxScrollbarPosition))
        setScrollbarPosition(boundedPosition)
      }
    })

    return () => {
      scrollY.removeListener(listener)
    }
  }, [scrollY, contentHeight, containerHeight, maxScrollbarPosition, isDragging])

  // Create pan responder for dragging the scrollbar
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        // Start dragging
        setIsDragging(true)
        if (setScrollEnabled) setScrollEnabled(false)

        // Store the starting touch position and current scrollbar position
        startDragY.current = evt.nativeEvent.pageY
        startScrollbarPos.current = scrollbarPosition
      },
      onPanResponderMove: (evt) => {
        // Calculate how far we've dragged from the starting position
        const dragDelta = evt.nativeEvent.pageY - startDragY.current

        // Calculate new scrollbar position based on the drag delta
        const newScrollbarPosition = Math.max(0, Math.min(startScrollbarPos.current + dragDelta, maxScrollbarPosition))

        // Update scrollbar position
        setScrollbarPosition(newScrollbarPosition)

        // Calculate corresponding scroll position for the list
        const scrollRatio = newScrollbarPosition / maxScrollbarPosition
        const newScrollPosition = scrollRatio * (contentHeight - containerHeight)

        // Scroll the list to the new position
        if (scrollViewRef.current) {
          scrollViewRef.current.scrollToOffset({
            offset: newScrollPosition,
            animated: false,
          })
        }
      },
      onPanResponderRelease: () => {
        // End dragging
        setIsDragging(false)
        if (setScrollEnabled) setScrollEnabled(true)
      },
      onPanResponderTerminate: () => {
        // End dragging if terminated
        setIsDragging(false)
        if (setScrollEnabled) setScrollEnabled(true)
      },
    }),
  ).current

  // Handle track click to jump to position
  const handleTrackPress = (evt) => {
    if (isDragging) return

    // Get the y position of the click relative to the track
    const clickY = evt.nativeEvent.locationY

    // Calculate the new scrollbar position
    const newScrollbarPosition = Math.max(0, Math.min(clickY - scrollbarHeight / 2, maxScrollbarPosition))

    // Update scrollbar position
    setScrollbarPosition(newScrollbarPosition)

    // Calculate corresponding scroll position for the list
    const scrollRatio = newScrollbarPosition / maxScrollbarPosition
    const newScrollPosition = scrollRatio * (contentHeight - containerHeight)

    // Scroll the list to the new position
    if (scrollViewRef.current) {
      scrollViewRef.current.scrollToOffset({
        offset: newScrollPosition,
        animated: true,
      })
    }
  }

  return (
    <View
      style={[
        styles.scrollbarContainer,
        { height: containerHeight },
        isDarkMode && { backgroundColor: "rgba(255,255,255,0.05)" },
      ]}
      onStartShouldSetResponder={() => true}
      onResponderGrant={handleTrackPress}
    >
      {/* Scrollbar track */}
      <View style={styles.scrollbarTrack}>
        {/* Scrollbar thumb */}
        <Animated.View
          {...panResponder.panHandlers}
          style={[
            styles.scrollbarThumb,
            {
              height: scrollbarHeight,
              transform: [{ translateY: scrollbarPosition }],
            },
            isDarkMode && { backgroundColor: "#666" },
          ]}
        />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  scrollbarContainer: {
    position: "absolute",
    right: 0,
    width: 10,
    backgroundColor: "rgba(0,0,0,0.03)",
    borderTopLeftRadius: 10,
    borderBottomLeftRadius: 10,
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
  },
  scrollbarTrack: {
    flex: 1,
    width: 10,
    alignItems: "center",
    justifyContent: "flex-start",
  },
  scrollbarThumb: {
    width: 10,
    backgroundColor: "#999",
    borderRadius: 5,
    position: "absolute",
  },
})

export default CustomScrollbar
