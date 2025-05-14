"use client"

import type React from "react"
import { useRef, useState, useEffect, useMemo } from "react"
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
  const scrollYValue = useRef(0) // ✅ New

  // Update scrollYValue whenever scrollY changes
  useEffect(() => {
    const listenerId = scrollY.addListener(({ value }) => {
      scrollYValue.current = value
    })
    return () => scrollY.removeListener(listenerId)
  }, [scrollY])

  const scrollIndicatorHeight = useMemo(() => {
    return Math.max(
      40,
      (containerHeight / Math.max(contentHeight, 1)) * containerHeight,
    )
  }, [containerHeight, contentHeight])

  const maxScroll = Math.max(0, contentHeight - containerHeight)
  const maxIndicatorOffset = Math.max(0, containerHeight - scrollIndicatorHeight)

  const indicatorTranslateY = useMemo(() => {
    return scrollY.interpolate({
      inputRange: [0, maxScroll],
      outputRange: [0, maxIndicatorOffset],
      extrapolate: "clamp",
    })
  }, [scrollY, maxScroll, maxIndicatorOffset])

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        setIsScrolling(true)
        lastTouchY.current = evt.nativeEvent.locationY
        if (setScrollEnabled) setScrollEnabled(false)

        const touchY = evt.nativeEvent.locationY
        const scrollRatio = (touchY - scrollIndicatorHeight / 2) / maxIndicatorOffset
        const newScrollY = scrollRatio * maxScroll

        scrollViewRef.current?.scrollToOffset({
          offset: Math.max(0, Math.min(newScrollY, maxScroll)),
          animated: false,
        })
      },
      onPanResponderMove: (evt, gestureState) => {
        const dy = gestureState.dy
        const moveRatio = dy / maxIndicatorOffset
        const scrollDelta = moveRatio * maxScroll

        const currentY = scrollYValue.current
        const nextY = Math.max(0, Math.min(currentY + scrollDelta, maxScroll))

        scrollViewRef.current?.scrollToOffset({
          offset: nextY,
          animated: false,
        })

        lastTouchY.current = evt.nativeEvent.locationY
      },
      onPanResponderRelease: () => {
        setIsScrolling(false)
        if (setScrollEnabled) setScrollEnabled(true)
      },
      onPanResponderTerminate: () => {
        setIsScrolling(false)
        if (setScrollEnabled) setScrollEnabled(true)
      },
    }),
  ).current

  if (contentHeight <= containerHeight || containerHeight === 0) return null

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
