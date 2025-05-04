import React from 'react';
import { SafeAreaView } from 'react-native';
import TransactionsScreen from './src/screens/transactions';

export default function App() {
  return (
    <SafeAreaView style={{ flex: 1 }}>
      <TransactionsScreen />
    </SafeAreaView>
  );
}
