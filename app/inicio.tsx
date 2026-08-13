import { useEffect, useRef, useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, Animated, ActivityIndicator, StatusBar, ScrollView } from 'react-native'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useTheme } from '../hooks/useTheme'
import { useAuth } from '../lib/authContext'
import { useFormularios } from '../lib/formulariosContext'

const DURACION_BIENVENIDA = 1600

export default function Inicio() {
  const { colores: C } = useTheme()
  const { session, signOut } = useAuth()
  const { formularios, loading } = useFormularios()
  const router = useRouter()

  const [paso, setPaso] = useState<'bienvenida' | 'opciones'>('bienvenida')
  const opacidad = useRef(new Animated.Value(0)).current
  const traslado = useRef(new Animated.Value(16)).current

  const nombre = session?.user?.user_metadata?.full_name ?? session?.user?.email?.split('@')[0] ?? 'Brigadista'

  const animarEntrada = () => {
    opacidad.setValue(0)
    traslado.setValue(16)
    Animated.parallel([
      Animated.timing(opacidad, { toValue: 1, duration: 420, useNativeDriver: true }),
      Animated.timing(traslado, { toValue: 0, duration: 420, useNativeDriver: true }),
    ]).start()
  }

  useEffect(() => {
    if (loading || formularios.length === 0) return
    animarEntrada()
    const timer = setTimeout(() => irAOpciones(), DURACION_BIENVENIDA)
    return () => clearTimeout(timer)
  }, [loading, formularios.length])

  const irAOpciones = () => {
    setPaso((actual) => {
      if (actual === 'opciones') return actual
      Animated.sequence([
        Animated.timing(opacidad, { toValue: 0, duration: 180, useNativeDriver: true }),
      ]).start(() => {
        animarEntrada()
      })
      return 'opciones'
    })
  }

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: C.fondo }]}>
        <StatusBar barStyle={C.statusBar} backgroundColor={C.fondo} />
        <ActivityIndicator size="large" color={C.naranja} />
      </View>
    )
  }

  if (formularios.length === 0) {
    return (
      <View style={[styles.centered, { backgroundColor: C.fondo, padding: 32 }]}>
        <StatusBar barStyle={C.statusBar} backgroundColor={C.fondo} />
        <View style={[styles.iconCircle, { backgroundColor: C.fondoCard }]}>
          <Ionicons name="lock-closed-outline" size={40} color={C.naranja} />
        </View>
        <Text style={[styles.title, { color: C.texto }]}>Sin formularios asignados</Text>
        <Text style={[styles.subtitle, { color: C.textoSub }]}>
          Todavía no tenés ningún área asignada en EcoDatos. Contactá al administrador para que te dé acceso.
        </Text>
        <TouchableOpacity
          style={[styles.btnSecundario, { backgroundColor: C.fondoCard, borderColor: C.borde }]}
          onPress={signOut}
        >
          <Ionicons name="log-out-outline" size={18} color={C.oliva} />
          <Text style={[styles.btnSecundarioText, { color: C.oliva }]}>Cerrar sesión</Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <TouchableOpacity
      activeOpacity={1}
      style={[styles.container, { backgroundColor: C.fondo }]}
      onPress={paso === 'bienvenida' ? irAOpciones : undefined}
    >
      <StatusBar barStyle={C.statusBar} backgroundColor={C.fondo} />

      {paso === 'bienvenida' ? (
        <Animated.View style={[styles.centered, { opacity: opacidad, transform: [{ translateY: traslado }] }]}>
          <View style={[styles.iconCircle, { backgroundColor: C.fondoCard }]}>
            <Ionicons name="hand-right-outline" size={40} color={C.naranja} />
          </View>
          <Text style={[styles.title, { color: C.texto }]}>Hola, {nombre}</Text>
          <Text style={[styles.subtitle, { color: C.textoSub }]}>Vamos a registrar un nuevo reporte</Text>
        </Animated.View>
      ) : (
        <Animated.View style={{ flex: 1, opacity: opacidad, transform: [{ translateY: traslado }] }}>
          <ScrollView contentContainerStyle={styles.opcionesScroll} showsVerticalScrollIndicator={false}>
            <View style={styles.opcionesHeader}>
              <Text style={[styles.opcionesTitle, { color: C.texto }]}>¿Qué querés hacer?</Text>
              <Text style={[styles.opcionesSubtitle, { color: C.textoSub }]}>Elegí el área del reporte</Text>
            </View>

            {formularios.map((f) => (
              <TouchableOpacity
                key={f.id}
                style={[styles.card, { backgroundColor: C.fondoCard, borderColor: C.borde }]}
                onPress={() => router.push(`/formulario/${f.slug}`)}
                activeOpacity={0.8}
              >
                <View style={[styles.cardIcon, { backgroundColor: C.fondoInput }]}>
                  <Ionicons name="document-text-outline" size={22} color={C.naranja} />
                </View>
                <View style={{ flex: 1 }}>
                  {f.area && <Text style={[styles.cardArea, { color: C.textoSub }]}>{f.area.nombre}</Text>}
                  <Text style={[styles.cardTitle, { color: C.texto }]}>{f.nombre}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={C.textoTenue} />
              </TouchableOpacity>
            ))}

            <TouchableOpacity style={styles.cerrarSesion} onPress={signOut}>
              <Ionicons name="log-out-outline" size={16} color={C.textoSub} />
              <Text style={[styles.cerrarSesionText, { color: C.textoSub }]}>Cerrar sesión</Text>
            </TouchableOpacity>
          </ScrollView>
        </Animated.View>
      )}
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  iconCircle: { width: 90, height: 90, borderRadius: 45, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  title: { fontSize: 24, fontWeight: '800', marginBottom: 8, textAlign: 'center' },
  subtitle: { fontSize: 15, textAlign: 'center', lineHeight: 22 },
  btnSecundario: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 12, borderWidth: 1, paddingHorizontal: 20, paddingVertical: 12, marginTop: 24 },
  btnSecundarioText: { fontSize: 15, fontWeight: '600' },
  opcionesScroll: { paddingHorizontal: 24, paddingTop: 72, paddingBottom: 40 },
  opcionesHeader: { marginBottom: 24 },
  opcionesTitle: { fontSize: 26, fontWeight: '800', marginBottom: 6 },
  opcionesSubtitle: { fontSize: 15 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 14, borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 12 },
  cardIcon: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  cardArea: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 },
  cardTitle: { fontSize: 16, fontWeight: '700' },
  cerrarSesion: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'center', marginTop: 16, padding: 8 },
  cerrarSesionText: { fontSize: 13, fontWeight: '600' },
})
