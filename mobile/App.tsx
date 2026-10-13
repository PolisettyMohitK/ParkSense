import { useEffect, useState } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { StatusBar } from 'expo-status-bar'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { queryClient } from './src/api/queryClient'
import { loadOccupancyNotifications } from './src/notifications'
import { AuthProvider } from './src/store/AuthContext'
import { ThemeProvider } from './src/theme/ThemeProvider'
import RootNavigator from './src/navigation/RootNavigator'

export default function App() {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    // Restore the notification preference before screens start reading it.
    loadOccupancyNotifications().finally(() => setReady(true))
  }, [])

  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <ThemeProvider>
          <AuthProvider>
            <StatusBar style="auto" />
            {ready ? <RootNavigator /> : null}
          </AuthProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </QueryClientProvider>
  )
}
