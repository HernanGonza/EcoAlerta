import { useEffect } from 'react'
import { useNetwork } from './useNetwork'
import { getQueue, removeFromQueue } from '../lib/offlineQueue'
import { supabase } from '../lib/supabase'
import { createRecord } from '../lib/api'

export function useSync() {
  const { isConnected } = useNetwork()

  useEffect(() => {
    if (!isConnected) return
    syncQueue()
  }, [isConnected])

  const syncQueue = async () => {
    const queue = await getQueue()
    if (queue.length === 0) return

    console.log(`[SYNC] Sincronizando ${queue.length} items...`)

    const { data: { session } } = await supabase.auth.getSession()
    const token = session?.access_token ?? process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!
    const baseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!

    for (const item of queue) {
      try {
        // Subir fotos con fetch manual
        const fotosUrls: string[] = []
        for (const uri of item.fotos) {
          const filename = `anonimo/${Date.now()}_${Math.random().toString(36).slice(2)}.jpeg`
          const response = await fetch(uri)
          const blob = await response.blob()
          const uploadResponse = await fetch(
            `${baseUrl}/storage/v1/object/fotos_incendios/${filename}`,
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'image/jpeg',
                'x-upsert': 'false',
              },
              body: blob,
            }
          )
          if (uploadResponse.ok) {
            fotosUrls.push(`${baseUrl}/storage/v1/object/public/fotos_incendios/${filename}`)
            console.log(`[SYNC] Foto subida OK`)
          } else {
            console.error(`[SYNC] Error subiendo foto:`, uploadResponse.status)
          }
        }

        // Subir audios con fetch manual
        const audiosUrls: string[] = []
        for (const uri of item.audios) {
          const filename = `anonimo/${Date.now()}_${Math.random().toString(36).slice(2)}.m4a`
          const response = await fetch(uri)
          const blob = await response.blob()
          const uploadResponse = await fetch(
            `${baseUrl}/storage/v1/object/audios_incendios/${filename}`,
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'audio/m4a',
                'x-upsert': 'false',
              },
              body: blob,
            }
          )
          if (uploadResponse.ok) {
            audiosUrls.push(`${baseUrl}/storage/v1/object/public/audios_incendios/${filename}`)
            console.log(`[SYNC] Audio subido OK`)
          } else {
            console.error(`[SYNC] Error subiendo audio:`, uploadResponse.status)
          }
        }

        // Enviar via Edge Function igual que online
        await createRecord('plan_provincial_manejo_fuego', {
          ...item.data,
          fotos: fotosUrls,
          audios: audiosUrls,
        })

        await removeFromQueue(item.id)
        console.log(`[SYNC] Item ${item.id} sincronizado OK`)
      } catch (e) {
        console.error(`[SYNC] Error procesando item ${item.id}:`, e)
        // No removemos — se reintenta la próxima vez que vuelva conexión
      }
    }
  }
}