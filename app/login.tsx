import { useState, useEffect } from 'react'
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform, StatusBar, Image, ScrollView
} from 'react-native'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useAuth } from '../lib/authContext'
import { useTheme } from '../hooks/useTheme'

export default function Login() {
  const { signIn, session } = useAuth()
  const { colores: C } = useTheme()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const insets = useSafeAreaInsets()

  useEffect(() => {
    if (session) router.replace('/formulario')
  }, [session, router])

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Completá email y contraseña')
      return
    }
    setError('')
    setLoading(true)
    try {
      await signIn(email, password)
    } catch (error: any) {
      setError('Email o contraseña incorrectos')
    } finally {
      setLoading(false)
    }
  }

  return (
    <View style={[styles.container, { backgroundColor: C.fondo, paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <StatusBar barStyle={C.statusBar} backgroundColor={C.fondo} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.topSection}>
            <Image
              source={require('../assets/images/iso - redondo.png')}
              style={styles.logo}
              resizeMode="contain"
            />
            <Text style={[styles.appName, { color: C.texto }]}>EcoAlerta</Text>
          </View>

          <View style={[styles.card, { backgroundColor: C.fondoCard }]}>
            <Text style={[styles.cardTitle, { color: C.texto }]}>Iniciar sesión</Text>

            {error ? (
              <View style={[styles.errorBanner, { backgroundColor: C.offlineBg }]}>
                <Ionicons name="alert-circle-outline" size={18} color={C.crema} />
                <Text style={[styles.errorText, { color: C.crema }]}>{error}</Text>
              </View>
            ) : null}

            <View style={[styles.inputWrapper, { backgroundColor: C.fondoInput, borderColor: C.borde }]}>
              <Ionicons name="mail-outline" size={20} color={C.verde} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: C.texto }]}
                placeholder="Email"
                placeholderTextColor={C.textoTenue}
                value={email}
                onChangeText={(v) => { setEmail(v); setError('') }}
                autoCapitalize="none"
                keyboardType="email-address"
                returnKeyType="next"
              />
            </View>

            <View style={[styles.inputWrapper, { backgroundColor: C.fondoInput, borderColor: C.borde }]}>
              <Ionicons name="lock-closed-outline" size={20} color={C.verde} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: C.texto }]}
                placeholder="Contraseña"
                placeholderTextColor={C.textoTenue}
                value={password}
                onChangeText={(v) => { setPassword(v); setError('') }}
                secureTextEntry={!showPassword}
                returnKeyType="done"
                onSubmitEditing={handleLogin}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={C.textoTenue} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.loginBtn, { backgroundColor: C.naranja }, loading && styles.loginBtnDisabled]}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading
                ? <Text style={[styles.loginBtnText, { color: C.fondoCard }]}>Ingresando...</Text>
                : <>
                    <Ionicons name="log-in-outline" size={20} color={C.fondoCard} />
                    <Text style={[styles.loginBtnText, { color: C.fondoCard }]}>Ingresar</Text>
                  </>
              }
            </TouchableOpacity>
          </View>

          <View style={{ flex: 1, minHeight: 60 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 40 },
  topSection: { alignItems: 'center', marginBottom: 40 },
  logo: { width: 100, height: 100, marginBottom: 12 },
  appName: { fontSize: 32, fontWeight: '800', letterSpacing: 1 },
  card: { borderRadius: 24, padding: 28 },
  cardTitle: { fontSize: 20, fontWeight: '700', marginBottom: 20 },
  errorBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 10, padding: 12, marginBottom: 16 },
  errorText: { fontSize: 13, flex: 1 },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, marginBottom: 14, paddingHorizontal: 14, borderWidth: 1 },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, fontSize: 16, paddingVertical: 14 },
  eyeBtn: { padding: 4 },
  loginBtn: { borderRadius: 12, padding: 16, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 8 },
  loginBtnDisabled: { opacity: 0.6 },
  loginBtnText: { fontSize: 16, fontWeight: '700' },
})