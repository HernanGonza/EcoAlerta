import AsyncStorage from '@react-native-async-storage/async-storage'

const META_PREFIX = 'formulario_meta_'
const FK_PREFIX = 'fk_opciones_'

export async function guardarMetadataCache(slug: string, meta: any) {
  await AsyncStorage.setItem(META_PREFIX + slug, JSON.stringify(meta))
}

export async function leerMetadataCache(slug: string): Promise<any | null> {
  const raw = await AsyncStorage.getItem(META_PREFIX + slug)
  return raw ? JSON.parse(raw) : null
}

export async function guardarOpcionesFKCache(tabla: string, opciones: any[]) {
  await AsyncStorage.setItem(FK_PREFIX + tabla, JSON.stringify(opciones))
}

export async function leerOpcionesFKCache(tabla: string): Promise<any[] | null> {
  const raw = await AsyncStorage.getItem(FK_PREFIX + tabla)
  return raw ? JSON.parse(raw) : null
}
