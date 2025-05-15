import React, { useRef, useState, useEffect } from "react"
import { View, StyleSheet, TouchableOpacity, PanResponder, Animated } from "react-native"

interface CustomScrollbarProps {
  scrollViewRef: React.RefObject<any>
  contentHeight: number
  containerHeight: number
  scrollY: Animated.Value
  isDarkMode: boolean
  setScrollEnabled: (enabled: boolean) => void
}

const CustomScrollbar = ({
  scrollViewRef,
  contentHeight,
  containerHeight,
  scrollY,
  isDarkMode,
  setScrollEnabled,
}: CustomScrollbarProps) => {
  // Calculate the scrollbar height based on the ratio of container to content
  const scrollRatio = containerHeight / contentHeight
  const scrollbarHeight = Math.max(containerHeight * scrollRatio, 40) // Minimum height of 40
  
  // Calculate the maximum scroll position
  const maxScrollPosition = contentHeight - containerHeight
  const maxScrollbarPosition = containerHeight - scrollbarHeight
  
  // State for tracking drag
  const [isDragging, setIsDragging] = useState(false)
  const [scrollbarPosition, setScrollbarPosition] = useState(0)
  
  // Animated value for scrollbar position
  const scrollbarY = useRef(new Animated.Value(0)).current
  
  // Update scrollbar position when scrollY changes
  useEffect(() => {
    const scrollListener = scrollY.addListener(({ value }) => {
      // Only update if not currently dragging
      if (!isDragging) {
        // Calculate scrollbar position based on scroll position
        const newPosition = (value / maxScrollPosition) * maxScrollbarPosition
        // Ensure position is within bounds
        const boundedPosition = Math.max(0, Math.min(newPosition, maxScrollbarPosition))
        // Update scrollbar position
        scrollbarY.setValue(boundedPosition)
        setScrollbarPosition(boundedPosition)
      }
    })
    
    return () => {
      scrollY.removeListener(scrollListener)
    }
  }, [scrollY, maxScrollPosition, maxScrollbarPosition, isDragging])
  
  // Create pan responder for handling drag gestures
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        setIsDragging(true)
        setScrollEnabled(false)
        scrollbarY.setOffset(scrollbarPosition)
        scrollbarY.setValue(0)
      },
      onPanResponderMove: (_, gestureState) => {
        // Calculate new position based on drag
        let newPosition = scrollbarPosition + gestureState.dy
        
        // Ensure position is within bounds
        newPosition = Math.max(0, Math.min(newPosition, maxScrollbarPosition))
        
        // Update scrollbar position
        scrollbarY.setValue(gestureState.dy)
        
        // Calculate corresponding scroll position
        const scrollPosition = (newPosition / maxScrollbarPosition) * maxScrollPosition
        
        // Scroll the list to the calculated position
        if (scrollViewRef.current) {
          scrollViewRef.current.scrollToOffset({ offset: scrollPosition, animated: false })
        }
      },
      onPanResponderRelease: () => {
        scrollbarY.flattenOffset()
        setScrollbarPosition(scrollbarY.__getValue())
        setIsDragging(false)
        setScrollEnabled(true)
      },
      onPanResponderTerminate: () => {
        scrollbarY.flattenOffset()
        setScrollbarPosition(scrollbarY.__getValue())
        setIsDragging(false)
        setScrollEnabled(true)
      },
    })
  ).current
  
  // Function to scroll to top
  const scrollToTop = () => {
    if (scrollViewRef.current) {
      scrollViewRef.current.scrollToOffset({ offset: 0, animated: true })
    }
  }
  
  // Function to scroll to bottom
  const scrollToBottom = () => {
    if (scrollViewRef.current) {
      scrollViewRef.current.scrollToOffset({ offset: maxScrollPosition, animated: true })
    }
  }
  
  return (
    <View style={[styles.scrollbarContainer, isDarkMode && { backgroundColor: 'rgba(255,255,255,0.05)' }]}>
      {/* Top scroll button */}
      <TouchableOpacity
        style={[styles.scrollButton, isDarkMode && { backgroundColor: '#333' }]}
        onPress={scrollToTop}
      >
        <View style={styles.arrowUp} />
      </TouchableOpacity>
      
      {/* Scrollbar track */}
      <View style={[styles.scrollbarTrack, isDarkMode && { backgroundColor: 'rgba(255,255,255,0.1)' }]}>
        {/* Scrollbar thumb */}
        <Animated.View
          {...panResponder.panHandlers}
          style={[
            styles.scrollbarThumb,
            {
              height: scrollbarHeight,
              transform: [{ translateY: scrollbarY }],
            },
            isDragging && styles.scrollbarThumbActive,
            isDarkMode && { backgroundColor: isDragging ? '#3498db' : '#555' },
          ]}
        />
      </View>
      
      {/* Bottom scroll button */}
      <TouchableOpacity
        style={[styles.scrollButton, isDarkMode && { backgroundColor: '#333' }]}
        onPress={scrollToBottom}
      >
        <View style={styles.arrowDown} />
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  scrollbarContainer: {
    position: 'absolute',
    right: 2,
    top: 0,
    bottom: 0,
    width: 20,
    backgroundColor: 'rgba(0,0,0,0.03)',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  scrollButton: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 2,
  },
  arrowUp: {
    width: 0,
    height: 0,
    borderLeftWidth: 4,
    borderRightWidth: 4,
    borderBottomWidth: 6,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#666',
  },
  arrowDown: {
    width: 0,
    height: 0,
    borderLeftWidth: 4,
    borderRightWidth: 4,
    borderTopWidth: 6,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#666',
  },
  scrollbarTrack: {
    flex: 1,
    width: 4,
    backgroundColor: 'rgba(0,0,0,0.1)',
    borderRadius: 2,
    marginVertical: 4,
  },
  scrollbarThumb: {
    width: 8,
    backgroundColor: '#bbb',
    borderRadius: 4,
    position: 'absolute',
    left: -2,
  },
  scrollbarThumbActive: {
    backgroundColor: '#3498db',
    width: 10,
    left: -3,
  },
})

export default CustomScrollbar