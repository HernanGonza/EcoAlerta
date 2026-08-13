import { useEffect, useRef } from 'react'
import { useRouter } from 'expo-router'
import { View, Image, StyleSheet, Animated } from 'react-native'
import * as SplashScreen from 'expo-splash-screen'
import { useAuth } from '../lib/authContext'
import { useNetwork } from '../hooks/useNetwork'

SplashScreen.preventAutoHideAsync()

const DURACION = 4000

export default function Index() {
  const { session, loading } = useAuth()
  const { isConnected } = useNetwork()
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
    <View style={styles.container}>
      <Image
        source={require('../assets/images/splash.png')}
        style={styles.image}
        resizeMode="contain"
      />

      <View style={styles.barraContainer}>
        <Animated.View style={[styles.barra, { width }]} />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#36382E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: 300,
  },
  barraContainer: {
    position: 'absolute',
    bottom: 60,
    left: 40,
    right: 40,
    height: 3,
    backgroundColor: '#4a4d40',
    borderRadius: 2,
    overflow: 'hidden',
  },
  barra: {
    height: '100%',
    backgroundColor: '#FF751F',
    borderRadius: 2,
  },
})