"use client"

import type React from "react"
import { useRef, useState, useEffect } from "react"
import { View, StyleSheet, Animated, PanResponder } from "react-native"

interface CustomScrollbarProps {
  scrollViewRef: React.RefObject<any>
  contentHeight: number
  containerHeight: number
  scrollY: Animated.Value
  isDarkMode?: boolean
  setScrollEnabled?: (enabled: boolean) => void
}

const CustomScrollbar = ({
  scrollViewRef,
  contentHeight,
  containerHeight,
  scrollY,
  isDarkMode = false,
  setScrollEnabled,
}: CustomScrollbarProps) => {
  const [isScrolling, setIsScrolling] = useState(false)
  const lastTouchY = useRef(0)
  const scrollYValue = useRef(0)

  // Calculate the scrollbar size based on the ratio of container to content
  const scrollIndicatorHeight = Math.max(
    40, // Minimum size for easy grabbing
    (containerHeight / Math.max(contentHeight, 1)) * containerHeight,
  )

  // Calculate the maximum scroll distance and indicator offset
  const maxScroll = Math.max(0, contentHeight - containerHeight)
  const maxIndicatorOffset = Math.max(0, containerHeight - scrollIndicatorHeight)

  // Keep track of the scroll position
  useEffect(() => {
    const listener = scrollY.addListener(({ value }) => {
      scrollYValue.current = value
    })
    return () => scrollY.removeListener(listener)
  }, [scrollY])

  // Map the scroll position to the indicator position
  const indicatorTranslateY = scrollY.interpolate({
    inputRange: [0, maxScroll],
    outputRange: [0, maxIndicatorOffset],
    extrapolate: "clamp",
  })

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        setIsScrolling(true)
        lastTouchY.current = evt.nativeEvent.locationY

        // Disable FlatList scrolling when scrollbar is being dragged
        if (setScrollEnabled) {
          setScrollEnabled(false)
        }

        // Jump to touched position
        const touchY = evt.nativeEvent.locationY
        const scrollRatio = touchY / containerHeight
        const newScrollY = scrollRatio * maxScroll

        scrollViewRef.current?.scrollToOffset({
          offset: Math.max(0, Math.min(newScrollY, maxScroll)),
          animated: false,
        })
      },
      onPanResponderMove: (evt, gestureState) => {
        const dy = gestureState.dy
        const moveRatio = dy / containerHeight
        const scrollDelta = moveRatio * maxScroll

        scrollViewRef.current?.scrollToOffset({
          offset: Math.max(0, Math.min(scrollYValue.current + scrollDelta, maxScroll)),
          animated: false,
        })

        lastTouchY.current = evt.nativeEvent.locationY
      },
      onPanResponderRelease: () => {
        setIsScrolling(false)

        // Re-enable FlatList scrolling when scrollbar is released
        if (setScrollEnabled) {
          setScrollEnabled(true)
        }
      },
      onPanResponderTerminate: () => {
        setIsScrolling(false)

        // Re-enable FlatList scrolling when scrollbar interaction is terminated
        if (setScrollEnabled) {
          setScrollEnabled(true)
        }
      },
    }),
  ).current

  // Don't show scrollbar if content fits in container
  if (contentHeight <= containerHeight) return null

  return (
    <View style={[styles.scrollbarContainer, { height: containerHeight }]}>
      <View style={styles.scrollbarTrack} />
      <Animated.View
        {...panResponder.panHandlers}
        style={[
          styles.scrollIndicator,
          {
            height: scrollIndicatorHeight,
            transform: [{ translateY: indicatorTranslateY }],
            backgroundColor: isDarkMode
              ? isScrolling
                ? "rgba(255, 255, 255, 0.9)"
                : "rgba(255, 255, 255, 0.6)"
              : isScrolling
                ? "rgba(0, 0, 0, 0.9)"
                : "rgba(0, 0, 0, 0.6)",
          },
        ]}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  scrollbarContainer: {
    position: "absolute",
    right: 0,
    width: 20,
    backgroundColor: "transparent",
    justifyContent: "center",
    zIndex: 100,
  },
  scrollbarTrack: {
    position: "absolute",
    right: 6,
    width: 8,
    height: "100%",
    borderRadius: 4,
    backgroundColor: "rgba(0, 0, 0, 0.1)",
  },
  scrollIndicator: {
    width: 8,
    borderRadius: 4,
    alignSelf: "flex-end",
    right: 6,
  },
})

export default CustomScrollbar
