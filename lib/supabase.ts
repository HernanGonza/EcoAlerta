import { createClient } from '@supabase/supabase-js'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { AppState, Platform } from 'react-native'

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})

// Recomendación oficial de Supabase para React Native: sin esto, el timer de
// auto-refresh sigue corriendo con supuestos viejos mientras la app está en
// segundo plano (pantalla bloqueada, cambio de app), y al volver intenta
// refrescar con un token ya vencido -> "Invalid Refresh Token: Refresh Token
// Not Found". Pausar/reanudar el refresh según el estado de la app evita eso.
if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') {
      supabase.auth.startAutoRefresh()
    } else {
      supabase.auth.stopAutoRefresh()
    }
  })
}
