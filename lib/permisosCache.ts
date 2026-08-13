import AsyncStorage from '@react-native-async-storage/async-storage'
import { FormularioAsignado } from './permisos'

const KEY_PREFIX = 'formularios_asignados_'

export async function guardarFormulariosCache(userId: string, formularios: FormularioAsignado[]) {
  await AsyncStorage.setItem(KEY_PREFIX + userId, JSON.stringify(formularios))
}

export async function leerFormulariosCache(userId: string): Promise<FormularioAsignado[] | null> {
  const raw = await AsyncStorage.getItem(KEY_PREFIX + userId)
  return raw ? JSON.parse(raw) : null
}
