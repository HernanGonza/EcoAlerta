import { Stack, usePathname, useRouter } from 'expo-router'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { AuthProvider, useAuth } from '../lib/authContext'
import { FormulariosProvider } from '../lib/formulariosContext'
import { useSync } from '../hooks/useSync'
import { useNetwork } from '../hooks/useNetwork'
import { useEffect } from 'react'
import { Platform } from 'react-native'
import * as SystemUI from 'expo-system-ui'

function SyncManager({ children }: { children: React.ReactNode }) {
  useSync()
  return <>{children}</>
}

// Si la sesión se pierde (cierre de sesión manual, token inválido) en cualquier
// pantalla, volvemos a /login. Centralizado acá para no repetirlo en cada pantalla.
function SessionGuard({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth()
  const { isConnected } = useNetwork()
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    if (loading || session) return
    if (!isConnected) return // sin red no forzamos: puede haber trabajo offline pendiente
    if (pathname === '/login' || pathname === '/') return
    router.replace('/login')
  }, [session, loading, isConnected, pathname, router])

  return <>{children}</>
}

export default function RootLayout() {
  useEffect(() => {
    if (Platform.OS === 'android') {
      SystemUI.setBackgroundColorAsync('#36382E')
    }
  }, [])

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
          <FormulariosProvider>
            <SyncManager>
              <SessionGuard>
                <Stack screenOptions={{ headerShown: false }} />
              </SessionGuard>
            </SyncManager>
          </FormulariosProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  )
}