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
      image: "https://placeholder.com/wp-content/uploads/2018/10/placeholder.png",
    },
    {
      id: "2",
      title: "Analyze Spending",
      description: "See where your money goes with detailed categorization and analytics.",
      image: "https://placeholder.com/wp-content/uploads/2018/10/placeholder.png",
    },
    {
      id: "3",
      title: "Secure & Private",
      description: "Your financial data is encrypted and never shared with third parties.",
      image: "https://placeholder.com/wp-content/uploads/2018/10/placeholder.png",
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
      <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
        <Text style={[styles.skipText, isDarkMode && { color: "#AAA" }]}>Skip</Text>
      </TouchableOpacity>

      <FlatList
        ref={flatListRef}
        data={onboardingData}
        renderItem={({ item }) => (
          <View style={styles.slide}>
            <Image source={{ uri: item.image }} style={styles.image} />
            <Text style={[styles.title, isDarkMode && { color: "#FFF" }]}>{item.title}</Text>
            <Text style={[styles.description, isDarkMode && { color: "#AAA" }]}>{item.description}</Text>
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

      <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
        <Text style={styles.nextButtonText}>{currentIndex === onboardingData.length - 1 ? "Get Started" : "Next"}</Text>
        <MaterialIcons name="arrow-forward" size={20} color="#FFF" />
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  skipButton: {
    position: "absolute",
    top: 50,
    right: 20,
    zIndex: 1,
  },
  skipText: {
    fontSize: 16,
    color: "#666",
  },
  slide: {
    width,
    height,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  image: {
    width: width * 0.7,
    height: width * 0.7,
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 20,
    textAlign: "center",
  },
  description: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    lineHeight: 24,
  },
  indicatorContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    position: "absolute",
    bottom: 100,
    width: "100%",
  },
  indicator: {
    height: 8,
    borderRadius: 4,
    backgroundColor: "#3498db",
    marginHorizontal: 4,
  },
  nextButton: {
    position: "absolute",
    bottom: 40,
    right: 40,
    backgroundColor: "#3498db",
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 30,
    flexDirection: "row",
    alignItems: "center",
  },
  nextButtonText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "600",
    marginRight: 8,
  },
})

export default OnboardingScreen
