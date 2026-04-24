import { useState, useEffect } from 'react'
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, KeyboardAvoidingView, Platform, StatusBar, Image
} from 'react-native'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useAuth } from '../lib/authContext'

const C = {
  naranja: '#FF751F',
  verde: '#7C9885',
  oliva: '#B5B682',
  carbon: '#36382E',
  crema: '#FFEE93',
  carbonLight: '#4a4d40',
  carbonDark: '#2a2c24',
}

export default function Login() {
  const { signIn, session } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const router = useRouter()

  useEffect(() => {
    if (session) router.replace('/formulario')
  }, [session])

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Campos requeridos', 'Completá email y contraseña')
      return
    }
    setLoading(true)
    try {
      await signIn(email, password)
    } catch (error: any) {
      Alert.alert('Error', error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar barStyle="light-content" backgroundColor={C.carbonDark} />

      <View style={styles.topSection}>
        <Image
          source={require('../assets/images/iso - redondo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.appName}>EcoAlerta</Text>
        <Text style={styles.subtitle}>Ministerio de Ecología{'\n'}y Recursos Naturales Renovables</Text>
        <Text style={styles.province}>Misiones</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Iniciar sesión</Text>

        <View style={styles.inputWrapper}>
          <Ionicons name="mail-outline" size={20} color={C.verde} style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor="#666"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
        </View>

        <View style={styles.inputWrapper}>
          <Ionicons name="lock-closed-outline" size={20} color={C.verde} style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Contraseña"
            placeholderTextColor="#666"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
          />
          <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
            <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color="#666" />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.loginBtn, loading && styles.loginBtnDisabled]}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading
            ? <Text style={styles.loginBtnText}>Ingresando...</Text>
            : <>
                <Ionicons name="log-in-outline" size={20} color={C.carbon} />
                <Text style={styles.loginBtnText}>Ingresar</Text>
              </>
          }
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.carbonDark },
  topSection: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 60 },
  logo: { width: 120, height: 120, marginBottom: 16 },
  appName: { fontSize: 36, fontWeight: '800', color: '#fff', letterSpacing: 1 },
  subtitle: { fontSize: 13, color: C.oliva, textAlign: 'center', marginTop: 8, lineHeight: 20 },
  province: { fontSize: 12, color: C.verde, marginTop: 4, letterSpacing: 2, textTransform: 'uppercase' },
  card: {
    backgroundColor: C.carbon,
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: 28, paddingBottom: 48,
  },
  cardTitle: { fontSize: 20, fontWeight: '700', color: '#fff', marginBottom: 24 },
  inputWrapper: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.carbonLight,
    borderRadius: 12, marginBottom: 14,
    paddingHorizontal: 14,
  },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, color: '#fff', fontSize: 16, paddingVertical: 14 },
  eyeBtn: { padding: 4 },
  loginBtn: {
    backgroundColor: C.naranja,
    borderRadius: 12, padding: 16,
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8,
    marginTop: 8,
  },
  loginBtnDisabled: { opacity: 0.6 },
  loginBtnText: { color: C.carbon, fontSize: 16, fontWeight: '700' },
})