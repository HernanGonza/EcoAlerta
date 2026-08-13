import { supabase } from './supabase'

export async function createRecord(tabla: string, record: any) {
  const { data: { session } } = await supabase.auth.getSession()

  const response = await fetch(`${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/universal-create`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session?.access_token ?? process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY}`,
      'apikey': process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
    },
    body: JSON.stringify({ t: tabla, data: record }),
  })

  if (!response.ok) {
    const bodyText = await response.text()
    console.error(`[createRecord] ${tabla} -> HTTP ${response.status}:`, bodyText)
    let mensaje = `Error al enviar el registro (${response.status})`
    try {
      const parsed = JSON.parse(bodyText)
      mensaje = parsed.error || parsed.message || mensaje
    } catch {
      if (bodyText) mensaje = bodyText
    }
    throw new Error(mensaje)
  }

  return response.json()
}