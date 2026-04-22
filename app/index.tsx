import { useEffect } from 'react'
import { useRouter } from 'expo-router'
import { View, ActivityIndicator } from 'react-native'
import { useAuth } from '../lib/authContext'
import { useNetwork } from '../hooks/useNetwork'

export default function Index() {
  const { session, loading } = useAuth()
  const { isConnected } = useNetwork()
  const router = useRouter()

  useEffect(() => {
    if (loading || isConnected === null) return

    if (session) {
      router.replace('/formulario')
    } else if (!isConnected) {
      router.replace('/formulario')
    } else {
      router.replace('/login')
    }
  }, [session, loading, isConnected])

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#1a1a1a' }}>
      <ActivityIndicator size="large" color="#2d7a3a" />
    </View>
  )
}