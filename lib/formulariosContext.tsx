import { createContext, useContext, useEffect, useState } from 'react'
import { useAuth } from './authContext'
import { useNetwork } from '../hooks/useNetwork'
import { getFormulariosAsignados, FormularioAsignado } from './permisos'
import { guardarFormulariosCache, leerFormulariosCache } from './permisosCache'

interface FormulariosContextType {
  formularios: FormularioAsignado[]
  loading: boolean
}

const FormulariosContext = createContext<FormulariosContextType>({ formularios: [], loading: true })

export function FormulariosProvider({ children }: { children: React.ReactNode }) {
  const { session } = useAuth()
  const { isConnected } = useNetwork()
  const [formularios, setFormularios] = useState<FormularioAsignado[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const userId = session?.user?.id
    if (!userId) {
      setFormularios([])
      setLoading(false)
      return
    }
    if (isConnected === null) return

    let cancelado = false
    setLoading(true)

    const cargar = async () => {
      if (!isConnected) {
        try {
          const cache = await leerFormulariosCache(userId)
          if (!cancelado) setFormularios(cache ?? [])
        } catch (e) {
          console.error('[formularios] no se pudo leer la caché offline:', e)
        } finally {
          if (!cancelado) setLoading(false)
        }
        return
      }

      try {
        const data = await getFormulariosAsignados()
        if (cancelado) return
        setFormularios(data)
        setLoading(false)
        guardarFormulariosCache(userId, data)
      } catch (e) {
        console.error('[formularios] falló la carga por red, uso caché:', e)
        try {
          const cache = await leerFormulariosCache(userId)
          if (!cancelado) setFormularios(cache ?? [])
        } catch (e2) {
          console.error('[formularios] no se pudo leer la caché offline:', e2)
        } finally {
          if (!cancelado) setLoading(false)
        }
      }
    }

    cargar().catch((e) => {
      console.error('[formularios] fallo inesperado cargando formularios:', e)
      if (!cancelado) setLoading(false)
    })

    return () => {
      cancelado = true
    }
  }, [session?.user?.id, isConnected])

  return (
    <FormulariosContext.Provider value={{ formularios, loading }}>
      {children}
    </FormulariosContext.Provider>
  )
}

export const useFormularios = () => useContext(FormulariosContext)
