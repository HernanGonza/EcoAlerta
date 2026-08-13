import { useLocalSearchParams } from 'expo-router'
import { FORMULARIOS } from '../../formularios/registry'
import FormularioDinamico from '../../formularios/FormularioDinamico'

export default function FormularioPorSlug() {
  const { slug } = useLocalSearchParams<{ slug: string }>()

  const PantallaEspecifica = slug ? FORMULARIOS[slug] : undefined
  if (PantallaEspecifica) return <PantallaEspecifica />

  return <FormularioDinamico slug={slug!} />
}
