import { useEffect } from 'react'
import { useNetwork } from './useNetwork'
import { getQueue, removeFromQueue } from '../lib/offlineQueue'
import { supabase } from '../lib/supabase'
import { createRecord } from '../lib/api'

export function useSync() {
  const { isConnected } = useNetwork()

  useEffect(() => {
    if (!isConnected) return
    syncQueue().catch((e) => console.error('[SYNC] Fallo general de sincronización:', e))
  }, [isConnected])

  const syncQueue = async () => {
    try {
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
              `${baseUrl}/storage/v1/object/${item.fotosBucket}/${filename}`,
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
              fotosUrls.push(`${baseUrl}/storage/v1/object/public/${item.fotosBucket}/${filename}`)
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
              `${baseUrl}/storage/v1/object/${item.audiosBucket}/${filename}`,
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
              audiosUrls.push(`${baseUrl}/storage/v1/object/public/${item.audiosBucket}/${filename}`)
              console.log(`[SYNC] Audio subido OK`)
            } else {
              console.error(`[SYNC] Error subiendo audio:`, uploadResponse.status)
            }
          }

          // Enviar via Edge Function igual que online
          await createRecord(item.tabla, {
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
    } catch (e) {
      console.error('[SYNC] Error general de sincronización (ej: sesión no disponible sin red):', e)
      // No relanzamos: la cola queda intacta y se reintenta en la próxima reconexión.
    }
  }
}
