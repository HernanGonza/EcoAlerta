import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { supabase } from './supabase'
import { Session } from '@supabase/supabase-js'

interface AuthContextType {
  session: Session | null
  loading: boolean
  // Se incrementa cada vez que se pasa de "sin sesión" a "con sesión" (login
  // explícito o apertura de la app con sesión persistida) — no en refrescos de
  // token. Sirve para saber si hay que volver a mostrar la bienvenida.
  loginToken: number
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [loginToken, setLoginToken] = useState(0)
  const habiaSesion = useRef(false)

  useEffect(() => {
    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        setSession(session)
        if (session) {
          habiaSesion.current = true
          setLoginToken((t) => t + 1)
        }
        setLoading(false)
      })
      .catch((e) => {
        // Token de refresh inválido/vencido guardado en el dispositivo (p.ej. de
        // una sesión muy vieja de desarrollo): sin esto, la app queda en loop
        // tirando el mismo error en cada apertura. Lo limpiamos para que arranque
        // en limpio en /login, en vez de repetir el error para siempre.
        if (e?.message?.includes('Refresh Token')) {
          console.warn('[auth] refresh token inválido, limpiando sesión guardada:', e.message)
          supabase.auth.signOut().catch(() => {})
        } else {
          // Sin red y con un token que necesitaba refrescarse: seguimos con lo que
          // haya persistido en el dispositivo en vez de romper el arranque de la app.
          console.error('[auth] getSession falló (posiblemente sin conexión):', e)
        }
        setLoading(false)
      })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session && !habiaSesion.current) {
        setLoginToken((t) => t + 1)
      }
      habiaSesion.current = !!session
    })

    return () => subscription.unsubscribe()
  }, [])

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  }

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{ session, loading, loginToken, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
