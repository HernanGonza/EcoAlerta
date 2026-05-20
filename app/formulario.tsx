import { useState, useEffect } from "react";
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, Alert, ActivityIndicator, Image, FlatList, StatusBar,
} from "react-native";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../lib/authContext";
import { useLocation } from "../hooks/useLocation";
import { useNetwork } from "../hooks/useNetwork";
import { supabase } from "../lib/supabase";
import { addToQueue } from "../lib/offlineQueue";
import { createRecord } from "../lib/api";
import AudioRecorder from "../components/AudioRecorder";

const C = {
  naranja: '#FF751F',
  verde: '#7C9885',
  oliva: '#B5B682',
  carbon: '#36382E',
  crema: '#FFEE93',
  carbonLight: '#4a4d40',
  carbonDark: '#2a2c24',
  carbonMid: '#3d3f36',
}

const TIPOS_INCENDIO = [
  { key: "FORESTAL", icon: "leaf" },
  { key: "INTERFASE", icon: "home" },
  { key: "PASTIZAL", icon: "sunny" },
  { key: "URBANO", icon: "business" },
]

interface FormState {
  nombre_incendio: string
  fecha_inicio: string
  hora_inicio: string
  fecha_finalizacion: string | null
  vegetacion_afectada: string
  hectareas_consumidas: string
}

const initialForm = (): FormState => ({
  nombre_incendio: "",
  fecha_inicio: new Date().toISOString().split("T")[0],
  hora_inicio: new Date().toTimeString().split(" ")[0],
  fecha_finalizacion: null,
  vegetacion_afectada: "",
  hectareas_consumidas: "",
})

export default function Formulario() {
  const { session, signOut } = useAuth();
  const { location, error: locationError, loading: locationLoading, retry } = useLocation();
  const { isConnected } = useNetwork();
  const router = useRouter();
  const [audios, setAudios] = useState<string[]>([]);
  const [fotos, setFotos] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState<FormState>(initialForm());

  useEffect(() => {
  if (!session && isConnected) router.replace("/login");
}, [session, isConnected, router]);

  const updateField = (key: keyof FormState, value: string | null) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const pickImage = async () => {
  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ['images'] as ImagePicker.MediaType[],
    quality: 0.7,
  });
  if (!result.canceled) setFotos((prev) => [...prev, result.assets[0].uri]);
};

  const uploadFoto = async (uri: string): Promise<string> => {
    const userId = session?.user?.id ?? "anonimo";
    const filename = `${userId}/${Date.now()}_${Math.random().toString(36).slice(2)}.jpeg`;
    const response = await fetch(uri);
    const blob = await response.blob();
    const { error } = await supabase.storage.from("fotos_incendios").upload(filename, blob, { contentType: "image/jpeg" });
    if (error) throw error;
    const { data } = supabase.storage.from("fotos_incendios").getPublicUrl(filename);
    return data.publicUrl;
  };

  const uploadAudio = async (uri: string): Promise<string> => {
    const userId = session?.user?.id ?? "anonimo";
    const filename = `${userId}/${Date.now()}_${Math.random().toString(36).slice(2)}.m4a`;
    const response = await fetch(uri);
    const blob = await response.blob();
    const { error } = await supabase.storage.from("audios_incendios").upload(filename, blob, { contentType: "audio/m4a" });
    if (error) throw error;
    const { data } = supabase.storage.from("audios_incendios").getPublicUrl(filename);
    return data.publicUrl;
  };

  const handleSubmit = async () => {
    if (!location) {
      Alert.alert("Sin ubicación", "Necesitás activar la ubicación para enviar el reporte");
      return;
    }
    if (!form.nombre_incendio) {
      Alert.alert("Campo requerido", "Seleccioná el tipo de incendio");
      return;
    }
    setSubmitting(true);
    try {
      let fotosUrls: string[] = [];
      let audiosUrls: string[] = [];
      if (isConnected) {
        fotosUrls = await Promise.all(fotos.map(uploadFoto));
        audiosUrls = await Promise.all(audios.map(uploadAudio));
      }
      const record = {
  nombre_incendio: form.nombre_incendio,
  fecha_inicio: form.fecha_inicio,
  hora_inicio: form.hora_inicio,
  fecha_finalizacion: form.fecha_finalizacion || null,
  vegetacion_afectada: form.vegetacion_afectada || null,
  hectareas_consumidas: form.hectareas_consumidas || null,
  formulario_id: "2b412292-5909-433f-85ee-81e7eae6ddef",
  user_id: session?.user?.id ?? null,
  created_by: session?.user?.id ?? null,
  latitud_decimal: location.latitud_decimal,
  longitud_decimal: location.longitud_decimal,
  latitud_dms: location.latitud_dms,
  longitud_dms: location.longitud_dms,
  fotos: fotosUrls,
  audios: audiosUrls,
  activo: true,
};
      if (isConnected) {
        await createRecord("plan_provincial_manejo_fuego", record);
        Alert.alert("✅ Enviado", "El reporte fue enviado correctamente");
      } else {
        await addToQueue({ id: Date.now().toString(), data: record, fotos, audios, timestamp: Date.now() });
        Alert.alert("💾 Guardado", "Sin conexión. El reporte se enviará cuando vuelva el internet");
      }
      setForm(initialForm());
      setFotos([]);
      setAudios([]);
    } catch (error: any) {
      Alert.alert("Error", error.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (locationLoading) {
    return (
      <View style={styles.centered}>
        <StatusBar barStyle="light-content" backgroundColor={C.carbonDark} />
        <ActivityIndicator size="large" color={C.naranja} />
        <Text style={styles.loadingText}>Obteniendo ubicación...</Text>
        <Text style={styles.loadingSubtext}>La ubicación es obligatoria para continuar</Text>
      </View>
    );
  }

  if (locationError) {
    return (
      <View style={styles.centered}>
        <StatusBar barStyle="light-content" backgroundColor={C.carbonDark} />
        <View style={styles.errorIcon}>
          <Ionicons name="location-outline" size={48} color={C.naranja} />
        </View>
        <Text style={styles.errorTitle}>Ubicación desactivada</Text>
        <Text style={styles.errorText}>{locationError}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={retry}>
          <Ionicons name="refresh" size={18} color={C.carbon} />
          <Text style={styles.retryBtnText}>Reintentar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <StatusBar barStyle="light-content" backgroundColor={C.carbonDark} />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerGreeting}>
            Hola, {session?.user?.user_metadata?.full_name ?? session?.user?.email ?? 'Anónimo'}
          </Text>
          <Text style={styles.headerSub}>Nuevo reporte de incendio</Text>
        </View>
        {session && (
          <TouchableOpacity style={styles.logoutBtn} onPress={signOut}>
            <Ionicons name="log-out-outline" size={20} color={C.naranja} />
          </TouchableOpacity>
        )}
      </View>

      {/* Banner offline */}
      {!isConnected && (
        <View style={styles.offlineBanner}>
          <Ionicons name="cloud-offline-outline" size={18} color={C.crema} />
          <Text style={styles.offlineText}>Sin conexión — se guardará localmente</Text>
        </View>
      )}

      {/* Tipo de incendio */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="flame-outline" size={18} color={C.naranja} />
          <Text style={styles.sectionTitle}>Tipo de incendio *</Text>
        </View>
        <View style={styles.tiposGrid}>
          {TIPOS_INCENDIO.map((tipo) => (
            <TouchableOpacity
              key={tipo.key}
              style={[styles.tipoBtn, form.nombre_incendio === tipo.key && styles.tipoBtnActive]}
              onPress={() => updateField("nombre_incendio", tipo.key)}
            >
              <Ionicons
                name={tipo.icon as any}
                size={22}
                color={form.nombre_incendio === tipo.key ? C.carbon : C.oliva}
              />
              <Text style={[styles.tipoBtnText, form.nombre_incendio === tipo.key && styles.tipoBtnTextActive]}>
                {tipo.key}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Fecha y hora */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="time-outline" size={18} color={C.naranja} />
          <Text style={styles.sectionTitle}>Fecha y hora</Text>
        </View>
        <View style={styles.row}>
          <View style={[styles.inputWrapper, { flex: 1, marginRight: 8 }]}>
            <Ionicons name="calendar-outline" size={16} color={C.verde} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              value={form.fecha_inicio}
              onChangeText={(v) => updateField("fecha_inicio", v)}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#666"
            />
          </View>
          <View style={[styles.inputWrapper, { flex: 1 }]}>
            <Ionicons name="time-outline" size={16} color={C.verde} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              value={form.hora_inicio}
              onChangeText={(v) => updateField("hora_inicio", v)}
              placeholder="HH:MM:SS"
              placeholderTextColor="#666"
            />
          </View>
        </View>
      </View>

      {/* Vegetación */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="leaf-outline" size={18} color={C.naranja} />
          <Text style={styles.sectionTitle}>Vegetación afectada</Text>
        </View>
        <View style={styles.inputWrapper}>
          <TextInput
            style={[styles.input, { paddingLeft: 14 }]}
            value={form.vegetacion_afectada}
            onChangeText={(v) => updateField("vegetacion_afectada", v)}
            placeholder="Describí la vegetación afectada"
            placeholderTextColor="#666"
          />
        </View>
      </View>

      {/* Hectáreas */}
<View style={styles.section}>
  <View style={styles.sectionHeader}>
    <Ionicons name="resize-outline" size={18} color={C.naranja} />
    <Text style={styles.sectionTitle}>Hectáreas afectadas</Text>
  </View>
  <View style={styles.inputWrapper}>
    <TextInput
      style={[styles.input, { paddingLeft: 14 }]}
      value={form.hectareas_consumidas}
      onChangeText={(v) => updateField("hectareas_consumidas", v)}
      placeholder="Estimación en hectáreas"
      placeholderTextColor="#666"
      keyboardType="numeric"
    />
  </View>
</View>

      {/* Fotos */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="camera-outline" size={18} color={C.naranja} />
          <Text style={styles.sectionTitle}>Fotos <Text style={styles.count}>({fotos.length})</Text></Text>
        </View>
        {fotos.length > 0 && (
          <FlatList
            data={fotos}
            horizontal
            keyExtractor={(item, index) => index.toString()}
            renderItem={({ item, index }) => (
              <View style={styles.fotoContainer}>
                <Image source={{ uri: item }} style={styles.miniatura} />
                <TouchableOpacity
                  style={styles.fotoBorrar}
                  onPress={() => setFotos((prev) => prev.filter((_, i) => i !== index))}
                >
                  <Ionicons name="close" size={12} color="#fff" />
                </TouchableOpacity>
              </View>
            )}
            style={{ marginBottom: 10 }}
            showsHorizontalScrollIndicator={false}
          />
        )}
        <TouchableOpacity style={styles.addBtn} onPress={pickImage}>
          <Ionicons name="camera" size={20} color={C.naranja} />
          <Text style={styles.addBtnText}>Tomar foto</Text>
        </TouchableOpacity>
      </View>

      {/* Audio */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="mic-outline" size={18} color={C.naranja} />
          <Text style={styles.sectionTitle}>Notas de voz <Text style={styles.count}>({audios.length})</Text></Text>
        </View>
        <AudioRecorder
          audios={audios}
          onAdd={(uri) => setAudios((prev) => [...prev, uri])}
          onRemove={(index) => setAudios((prev) => prev.filter((_, i) => i !== index))}
        />
      </View>

      {/* Botón enviar */}
      <TouchableOpacity
        style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
        onPress={handleSubmit}
        disabled={submitting}
      >
        {submitting ? (
          <ActivityIndicator size="small" color={C.carbon} />
        ) : (
          <>
            <Ionicons name={isConnected ? "send" : "save"} size={20} color={C.carbon} />
            <Text style={styles.submitBtnText}>
              {isConnected ? "Enviar reporte" : "Guardar offline"}
            </Text>
          </>
        )}
      </TouchableOpacity>

      <View style={{ height: 48 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.carbonDark },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: C.carbonDark, padding: 32 },
  loadingText: { color: '#fff', fontSize: 16, fontWeight: '600', marginTop: 16 },
  loadingSubtext: { color: C.oliva, fontSize: 13, marginTop: 8, textAlign: 'center' },
  errorIcon: { width: 90, height: 90, borderRadius: 45, backgroundColor: C.carbon, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  errorTitle: { color: '#fff', fontSize: 20, fontWeight: '700', marginBottom: 8 },
  errorText: { color: C.oliva, fontSize: 14, textAlign: 'center', marginBottom: 24 },
  retryBtn: { backgroundColor: C.naranja, borderRadius: 12, paddingHorizontal: 24, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', gap: 8 },
  retryBtnText: { color: C.carbon, fontSize: 16, fontWeight: '700' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 56, paddingBottom: 20 },
  headerGreeting: { fontSize: 20, fontWeight: '700', color: '#fff' },
  headerSub: { fontSize: 13, color: C.oliva, marginTop: 2 },
  logoutBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: C.carbon, justifyContent: 'center', alignItems: 'center' },
  offlineBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#5a3a1a', marginHorizontal: 20, borderRadius: 10, padding: 12, marginBottom: 8 },
  offlineText: { color: C.crema, fontSize: 13, flex: 1 },
  section: { marginHorizontal: 20, marginBottom: 20 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  sectionTitle: { color: '#fff', fontSize: 15, fontWeight: '600' },
  optional: { color: C.oliva, fontWeight: '400', fontSize: 13 },
  count: { color: C.oliva, fontWeight: '400' },
  tiposGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tipoBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12, borderWidth: 1.5, borderColor: C.carbonLight, backgroundColor: C.carbon, minWidth: '45%' },
  tipoBtnActive: { backgroundColor: C.naranja, borderColor: C.naranja },
  tipoBtnText: { color: C.oliva, fontSize: 13, fontWeight: '600' },
  tipoBtnTextActive: { color: C.carbon },
  row: { flexDirection: 'row' },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.carbon, borderRadius: 12, paddingHorizontal: 12, borderWidth: 1, borderColor: C.carbonLight },
  inputIcon: { marginRight: 8 },
  input: { flex: 1, color: '#fff', fontSize: 15, paddingVertical: 13 },
  locationBox: { backgroundColor: C.carbon, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: C.carbonLight },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  locationText: { color: C.oliva, fontSize: 14 },
  gpsActiveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: C.verde },
  gpsActiveText: { color: C.verde, fontSize: 12 },
  fotoContainer: { position: 'relative', marginRight: 10 },
  miniatura: { width: 80, height: 80, borderRadius: 10 },
  fotoBorrar: { position: 'absolute', top: 4, right: 4, backgroundColor: 'rgba(0,0,0,0.7)', borderRadius: 10, width: 20, height: 20, alignItems: 'center', justifyContent: 'center' },
  addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: C.carbon, borderRadius: 12, padding: 14, borderWidth: 1.5, borderColor: C.naranja, borderStyle: 'dashed' },
  addBtnText: { color: C.naranja, fontSize: 15, fontWeight: '600' },
  submitBtn: { marginHorizontal: 20, backgroundColor: C.naranja, borderRadius: 14, padding: 18, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10, marginTop: 8 },
  submitBtnDisabled: { opacity: 0.5 },
  submitBtnText: { color: C.carbon, fontSize: 17, fontWeight: '800' },
})