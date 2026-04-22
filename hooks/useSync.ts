import { useEffect } from 'react'
import { useNetwork } from './useNetwork'
import { getQueue, removeFromQueue } from '../lib/offlineQueue'
import { supabase } from '../lib/supabase'

export function useSync() {
  const { isConnected } = useNetwork()

  useEffect(() => {
    if (!isConnected) return
    syncQueue()
  }, [isConnected])

  const syncQueue = async () => {
    const queue = await getQueue()
    if (queue.length === 0) return

    for (const item of queue) {
      try {
        let fotosUrls: string[] = []

        for (const uri of item.fotos) {
          const filename = `anonimo/${Date.now()}_${Math.random().toString(36).slice(2)}.jpeg`
          const response = await fetch(uri)
          const blob = await response.blob()
          const { error } = await supabase.storage
            .from('fotos_incendios')
            .upload(filename, blob, { contentType: 'image/jpeg' })
          if (!error) {
            const { data } = supabase.storage.from('fotos_incendios').getPublicUrl(filename)
            fotosUrls.push(data.publicUrl)
          }
        }

        const { error } = await supabase
          .from('plan_provincial_manejo_fuego')
          .insert({ ...item.data, fotos: JSON.stringify(fotosUrls) })

        if (!error) await removeFromQueue(item.id)
      } catch (e) {
        console.error(`[SYNC] Error:`, e)
      }
    }
  }
}
