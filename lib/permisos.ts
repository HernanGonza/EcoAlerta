import { supabase } from './supabase'

export interface FormularioAsignado {
  id: string
  nombre: string
  descripcion: string | null
  slug: string
  esEditor: boolean
  area: {
    id: string
    key: string
    nombre: string
  } | null
}

export async function getFormulariosAsignados(): Promise<FormularioAsignado[]> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  // La RLS de usuarios_formularios deja pasar "user_id = auth.uid() OR is_admin()":
  // para cuentas admin devolvería las asignaciones de TODOS los usuarios si no
  // filtramos explícitamente acá.
  const { data, error } = await supabase
    .from('usuarios_formularios')
    .select(`
      es_editor,
      formulario:formularios!inner (
        id, nombre, descripcion, slug,
        area:areas ( id, key, nombre )
      )
    `)
    .eq('user_id', user.id)
    .eq('formulario.activo', true)

  if (error) throw error

  return (data ?? [])
    .filter((fila: any) => fila.es_editor && fila.formulario)
    .map((fila: any) => ({
      id: fila.formulario.id,
      nombre: fila.formulario.nombre,
      descripcion: fila.formulario.descripcion,
      slug: fila.formulario.slug,
      esEditor: fila.es_editor,
      area: fila.formulario.area ?? null,
    }))
}
