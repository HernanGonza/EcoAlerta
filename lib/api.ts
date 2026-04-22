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
    const error = await response.json()
    throw new Error(error.error || 'Error al enviar el registro')
  }
console.log('URL:', `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/universal-create`)
console.log('Token:', session?.access_token ? 'tiene token' : 'sin token')
  return response.json()
}