import { SafeAreaView } from "react-native"
// Import the TokenTester component for testing
import TokenTester from "./src/screens/transactions"

export default function App() {
  // Temporarily use TokenTester instead of TransactionsScreen
  return (
    <SafeAreaView style={{ flex: 1 }}>
      <TokenTester />
    </SafeAreaView>
  )
}

// Once you find a working scope, switch back to:
// <TransactionsScreen />
