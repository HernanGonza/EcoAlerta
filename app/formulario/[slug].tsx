import { ActivityIndicator } from 'react-native'
import { useLocalSearchParams } from 'expo-router'
import { FORMULARIOS } from '../../formularios/registry'
import FormularioDinamico from '../../formularios/FormularioDinamico'
import { useTheme } from '../../hooks/useTheme'
import FondoDegradado from '../../components/FondoDegradado'

export default function FormularioPorSlug() {
  const { slug } = useLocalSearchParams<{ slug: string }>()
  const { colores: C } = useTheme()

  if (!slug) {
    return (
      <FondoDegradado style={{ justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={C.naranja} />
      </FondoDegradado>
    )
  }

  const PantallaEspecifica = FORMULARIOS[slug]
  if (PantallaEspecifica) return <PantallaEspecifica />

  return <FormularioDinamico slug={slug} />
}
