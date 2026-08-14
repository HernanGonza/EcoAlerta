import { useState, useEffect, useRef } from 'react'
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform, StatusBar, Image, ScrollView, Animated
} from 'react-native'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useAuth } from '../lib/authContext'
import { useTheme } from '../hooks/useTheme'
import FondoDegradado from '../components/FondoDegradado'

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
  const opacidad = useRef(new Animated.Value(0)).current

  useEffect(() => {
    Animated.timing(opacidad, { toValue: 1, duration: 600, useNativeDriver: true }).start()
  }, [])

  useEffect(() => {
    if (session) router.replace('/inicio')
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
    <FondoDegradado style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}>
      <StatusBar barStyle={C.statusBar} backgroundColor="transparent" translucent />
      <Animated.View style={{ flex: 1, opacity: opacidad }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.centerWrap}>
            <View style={styles.topSection}>
              <Image
                source={require('../assets/images/ECODATOS-Blanco_Color.png')}
                style={styles.logo}
                resizeMode="contain"
              />
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
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      </Animated.View>
    </FondoDegradado>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 40 },
  centerWrap: { position: 'relative', marginTop: 50 },
  topSection: { position: 'absolute', bottom: '100%', left: 0, right: 0, alignItems: 'center', marginBottom: 8 },
  logo: { width: 220, height: 215 },
  card: { borderRadius: 24, padding: 28 },
  cardTitle: { fontSize: 20, fontWeight: 'normal', marginBottom: 20 },
  errorBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 10, padding: 12, marginBottom: 16 },
  errorText: { fontSize: 13, flex: 1 },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, marginBottom: 14, paddingHorizontal: 14, borderWidth: 1 },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, fontSize: 16, paddingVertical: 14 },
  eyeBtn: { padding: 4 },
  loginBtn: { borderRadius: 12, padding: 16, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 8 },
  loginBtnDisabled: { opacity: 0.6 },
  loginBtnText: { fontSize: 16, fontWeight: 'normal' },
})