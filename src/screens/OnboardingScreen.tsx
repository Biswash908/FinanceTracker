"use client"

import type React from "react"
import { useState, useRef } from "react"
import { View, Text, StyleSheet, FlatList, Dimensions, TouchableOpacity, Image, Animated } from "react-native"
import { useTheme } from "../context/ThemeContext"
import { MaterialIcons } from "@expo/vector-icons"

interface OnboardingScreenProps {
  onComplete: () => void
}

const { width, height } = Dimensions.get("window")

const OnboardingScreen: React.FC<OnboardingScreenProps> = ({ onComplete }) => {
  const { isDarkMode } = useTheme()
  const [currentIndex, setCurrentIndex] = useState(0)
  const flatListRef = useRef<FlatList>(null)
  const scrollX = useRef(new Animated.Value(0)).current

  const onboardingData = [
    {
      id: "1",
      title: "Track Your Finances",
      description: "Connect your bank accounts and track all your transactions in one place.",
      image: "/placeholder.svg?height=300&width=300",
    },
    {
      id: "2",
      title: "Analyze Spending",
      description: "See where your money goes with detailed categorization and analytics.",
      image: "/placeholder.svg?height=300&width=300",
    },
    {
      id: "3",
      title: "Secure & Private",
      description: "Your financial data is encrypted and never shared with third parties.",
      image: "/placeholder.svg?height=300&width=300",
    },
  ]

  const handleNext = () => {
    if (currentIndex < onboardingData.length - 1) {
      flatListRef.current?.scrollToIndex({
        index: currentIndex + 1,
        animated: true,
      })
    } else {
      onComplete()
    }
  }

  const handleSkip = () => {
    onComplete()
  }

  const handleViewableItemsChanged = useRef(({ viewableItems }) => {
    if (viewableItems.length > 0) {
      setCurrentIndex(viewableItems[0].index)
    }
  }).current

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50,
  }).current

  return (
    <View style={[styles.container, isDarkMode && { backgroundColor: "#121212" }]}>
      <FlatList
        ref={flatListRef}
        data={onboardingData}
        renderItem={({ item }) => (
          <View style={styles.slide}>
            <View style={styles.imageContainer}>
              <Image source={{ uri: item.image }} style={styles.image} />
            </View>
            <View style={styles.contentContainer}>
              <Text style={[styles.title, isDarkMode && { color: "#FFF" }]}>{item.title}</Text>
              <Text style={[styles.description, isDarkMode && { color: "#AAA" }]}>{item.description}</Text>
            </View>
          </View>
        )}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.id}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], {
          useNativeDriver: false,
        })}
        onViewableItemsChanged={handleViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
      />

      {/* Indicators */}
      <View style={styles.indicatorContainer}>
        {onboardingData.map((_, index) => {
          const inputRange = [(index - 1) * width, index * width, (index + 1) * width]

          const dotWidth = scrollX.interpolate({
            inputRange,
            outputRange: [8, 16, 8],
            extrapolate: "clamp",
          })

          const opacity = scrollX.interpolate({
            inputRange,
            outputRange: [0.3, 1, 0.3],
            extrapolate: "clamp",
          })

          return (
            <Animated.View
              key={index.toString()}
              style={[
                styles.indicator,
                { width: dotWidth, opacity },
                isDarkMode ? { backgroundColor: "#3498db" } : { backgroundColor: "#3498db" },
              ]}
            />
          )
        })}
      </View>

      {/* Bottom Navigation */}
      <View style={styles.bottomNavigation}>
        <TouchableOpacity
          style={[styles.nextButton, isDarkMode && { backgroundColor: "#2C5282" }]}
          onPress={handleNext}
        >
          <Text style={styles.nextButtonText}>
            {currentIndex === onboardingData.length - 1 ? "Get Started" : "Next"}
          </Text>
          <MaterialIcons name="arrow-forward" size={20} color="#FFF" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
          <Text style={[styles.skipText, isDarkMode && { color: "#AAA" }]}>Skip</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  slide: {
    width,
    height,
    paddingHorizontal: 40,
    paddingTop: height * 0.1, // Start content from top 10%
  },
  imageContainer: {
    flex: 0.4, // Take 40% of available space
    justifyContent: "center",
    alignItems: "center",
  },
  image: {
    width: width * 0.6,
    height: width * 0.6,
    borderRadius: 20,
  },
  contentContainer: {
    flex: 0.3, // Take 30% of available space for content
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 20,
    textAlign: "center",
  },
  description: {
    fontSize: 18,
    color: "#666",
    textAlign: "center",
    lineHeight: 26,
    paddingHorizontal: 20,
  },
  indicatorContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    position: "absolute",
    bottom: height * 0.25, // Position indicators above bottom navigation
    width: "100%",
  },
  indicator: {
    height: 10,
    borderRadius: 5,
    backgroundColor: "#3498db",
    marginHorizontal: 6,
  },
  bottomNavigation: {
    position: "absolute",
    bottom: 60,
    left: 0,
    right: 0,
    alignItems: "center",
    paddingHorizontal: 40,
  },
  nextButton: {
    backgroundColor: "#3498db",
    paddingHorizontal: 40,
    paddingVertical: 16,
    borderRadius: 30,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    width: "80%",
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  nextButtonText: {
    color: "#FFF",
    fontSize: 18,
    fontWeight: "600",
    marginRight: 8,
  },
  skipButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  skipText: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
  },
})

export default OnboardingScreen
