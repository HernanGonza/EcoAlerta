import { useEffect, useRef } from 'react'
import { useRouter } from 'expo-router'
import { View, Image, StyleSheet, Animated } from 'react-native'
import * as SplashScreen from 'expo-splash-screen'
import { useAuth } from '../lib/authContext'
import { useNetwork } from '../hooks/useNetwork'
import { useTheme } from '../hooks/useTheme'
import FondoDegradado from '../components/FondoDegradado'

SplashScreen.preventAutoHideAsync()

const DURACION = 4000

export default function Index() {
  const { session, loading } = useAuth()
  const { isConnected } = useNetwork()
  const { colores: C } = useTheme()
  const router = useRouter()
  const progreso = useRef(new Animated.Value(0)).current

  useEffect(() => {
    SplashScreen.hideAsync()

    Animated.timing(progreso, {
      toValue: 1,
      duration: DURACION,
      useNativeDriver: false,
    }).start()
  }, [])

  useEffect(() => {
    if (loading || isConnected === null) return

    const timer = setTimeout(async () => {
      if (session || !isConnected) {
        router.replace('/inicio')
      } else {
        router.replace('/login')
      }
    }, DURACION)

    return () => clearTimeout(timer)
  }, [session, loading, isConnected])

  const width = progreso.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  })

  return (
    <FondoDegradado style={styles.container}>
      <Image
        source={require('../assets/images/splash-ministerio.png')}
        style={styles.image}
        resizeMode="contain"
      />

      <View style={styles.barraContainer}>
        <Animated.View style={[styles.barra, { width, backgroundColor: C.naranja }]} />
      </View>
    </FondoDegradado>
  )
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: 280,
    height: 118,
    marginBottom: 28,
  },
  barraContainer: {
    width: 280,
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  barra: {
    height: '100%',
    borderRadius: 2,
  },
})
