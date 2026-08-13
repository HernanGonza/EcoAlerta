import AsyncStorage from '@react-native-async-storage/async-storage'

const QUEUE_KEY = 'offline_queue'

export interface QueuedReport {
  id: string
  tabla: string
  data: any
  fotos: string[]
  audios: string[]
  fotosBucket?: string
  audiosBucket?: string
  timestamp: number
}

export async function addToQueue(report: QueuedReport) {
  const existing = await getQueue()
  existing.push(report)
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(existing))
}

export async function getQueue(): Promise<QueuedReport[]> {
  const raw = await AsyncStorage.getItem(QUEUE_KEY)
  return raw ? JSON.parse(raw) : []
}

export async function removeFromQueue(id: string) {
  const existing = await getQueue()
  const filtered = existing.filter(r => r.id !== id)
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(filtered))
}
