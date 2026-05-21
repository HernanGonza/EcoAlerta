import { Stack } from 'expo-router'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { AuthProvider } from '../lib/authContext'
import { useSync } from '../hooks/useSync'
import { useEffect } from 'react'
import { Platform } from 'react-native'
import * as SystemUI from 'expo-system-ui'

function SyncManager({ children }: { children: React.ReactNode }) {
  useSync()
  return <>{children}</>
}

export default function RootLayout() {
  useEffect(() => {
    if (Platform.OS === 'android') {
      SystemUI.setBackgroundColorAsync('#36382E')
    }
  }, [])

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <SyncManager>
          <Stack screenOptions={{ headerShown: false }} />
        </SyncManager>
      </AuthProvider>
    </SafeAreaProvider>
  )
}