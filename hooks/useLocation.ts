import { useState, useEffect, useCallback } from 'react'
import * as Location from 'expo-location'
import { decimalToDMS } from '../lib/coordinates'

export interface LocationData {
  latitud_decimal: number
  longitud_decimal: number
  latitud_dms: string
  longitud_dms: string
}

export function useLocation() {
  const [location, setLocation] = useState<LocationData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [retryCount, setRetryCount] = useState(0)

  useEffect(() => {
    let subscription: Location.LocationSubscription | null = null
    let interval: ReturnType<typeof setInterval> | null = null
    let cancelled = false

    const start = async () => {
      setLoading(true)
      setError(null)

      const enabled = await Location.hasServicesEnabledAsync()
      if (!enabled) {
        setError('La ubicación está desactivada. Activala para continuar.')
        setLoading(false)
        return
      }

      const { status } = await Location.requestForegroundPermissionsAsync()
      if (status !== 'granted') {
        setError('Se necesita acceso a la ubicación para usar la app')
        setLoading(false)
        return
      }

      subscription = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, timeInterval: 5000, distanceInterval: 10 },
        (loc) => {
          if (cancelled) return
          setLocation({
            latitud_decimal: loc.coords.latitude,
            longitud_decimal: loc.coords.longitude,
            latitud_dms: decimalToDMS(loc.coords.latitude, true),
            longitud_dms: decimalToDMS(loc.coords.longitude, false),
          })
          setLoading(false)
          setError(null)
        }
      )

      interval = setInterval(async () => {
        if (cancelled) return
        const enabled = await Location.hasServicesEnabledAsync()
        if (!enabled) {
          setError('La ubicación está desactivada. Activala para continuar.')
          setLocation(null)
          subscription?.remove()
          subscription = null
        }
      }, 3000)
    }

    start()

    return () => {
      cancelled = true
      subscription?.remove()
      if (interval) clearInterval(interval)
    }
  }, [retryCount])

  const retry = useCallback(() => {
    setRetryCount(c => c + 1)
  }, [])

  return { location, error, loading, retry }
}