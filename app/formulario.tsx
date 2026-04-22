import { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Image,
  FlatList,
} from "react-native";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { useAuth } from "../lib/authContext";
import { useLocation } from "../hooks/useLocation";
import { useNetwork } from "../hooks/useNetwork";
import { supabase } from "../lib/supabase";
import { addToQueue } from "../lib/offlineQueue";
import { createRecord } from "../lib/api";
import AudioRecorder from "../components/AudioRecorder";

const TIPOS_INCENDIO = ["FORESTAL", "INTERFASE", "PASTIZAL", "URBANO"];

interface FormState {
  nombre_incendio: string
  fecha_inicio: string
  hora_inicio: string
  fecha_finalizacion: string | null
  vegetacion_afectada: string
  ciudad_temp: string
}

const initialForm = (): FormState => ({
  nombre_incendio: "",
  fecha_inicio: new Date().toISOString().split("T")[0],
  hora_inicio: new Date().toTimeString().split(" ")[0],
  fecha_finalizacion: null,
  vegetacion_afectada: "",
  ciudad_temp: "",
})

export default function Formulario() {
  const { session, signOut } = useAuth();
  const {
    location,
    error: locationError,
    loading: locationLoading,
    retry,
  } = useLocation();
  const { isConnected } = useNetwork();
  const router = useRouter();
  const [audios, setAudios] = useState<string[]>([]);
  const [fotos, setFotos] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState<FormState>(initialForm());

  useEffect(() => {
    if (!session && isConnected) {
      router.replace("/login");
    }
  }, [session, isConnected]);

  const updateField = (key: keyof FormState, value: string | null) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
    });
    if (!result.canceled) {
      setFotos((prev) => [...prev, result.assets[0].uri]);
    }
  };

  const uploadFoto = async (uri: string): Promise<string> => {
    const userId = session?.user?.id ?? "anonimo";
    const filename = `${userId}/${Date.now()}_${Math.random().toString(36).slice(2)}.jpeg`;
    const response = await fetch(uri);
    const blob = await response.blob();
    const { error } = await supabase.storage
      .from("fotos_incendios")
      .upload(filename, blob, { contentType: "image/jpeg" });
    if (error) throw error;
    const { data } = supabase.storage
      .from("fotos_incendios")
      .getPublicUrl(filename);
    return data.publicUrl;
  };

  const uploadAudio = async (uri: string): Promise<string> => {
    const userId = session?.user?.id ?? "anonimo";
    const filename = `${userId}/${Date.now()}_${Math.random().toString(36).slice(2)}.m4a`;
    const response = await fetch(uri);
    const blob = await response.blob();
    const { error } = await supabase.storage
      .from("audios_incendios")
      .upload(filename, blob, { contentType: "audio/m4a" });
    if (error) throw error;
    const { data } = supabase.storage
      .from("audios_incendios")
      .getPublicUrl(filename);
    return data.publicUrl;
  };

  const handleSubmit = async () => {
    if (!location) {
      Alert.alert("Error", "Se necesita la ubicación para enviar el formulario");
      return;
    }
    if (!form.nombre_incendio) {
      Alert.alert("Error", "Seleccioná el tipo de incendio");
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
        ciudad_temp: form.ciudad_temp || null,
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
        Alert.alert("Éxito", "Reporte enviado correctamente");
      } else {
        await addToQueue({
          id: Date.now().toString(),
          data: record,
          fotos,
          audios,
          timestamp: Date.now(),
        });
        Alert.alert(
          "Sin conexión",
          "El reporte se guardó y se enviará cuando haya internet"
        );
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
        <ActivityIndicator size="large" color="#2d7a3a" />
        <Text style={styles.loadingText}>Obteniendo ubicación...</Text>
      </View>
    );
  }

  if (locationError) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{locationError}</Text>
        <TouchableOpacity style={styles.button} onPress={retry}>
          <Text style={styles.buttonText}>Reintentar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>
          Hola,{" "}
          {session?.user?.user_metadata?.full_name ??
            session?.user?.email ??
            "Anónimo"}
        </Text>
        {session && (
          <TouchableOpacity onPress={signOut}>
            <Text style={styles.logoutText}>Salir</Text>
          </TouchableOpacity>
        )}
      </View>

      {!isConnected && (
        <View style={styles.offlineBanner}>
          <Text style={styles.offlineText}>
            Sin conexión — el reporte se guardará localmente
          </Text>
        </View>
      )}

      <Text style={styles.label}>Tipo de incendio *</Text>
      <View style={styles.tiposContainer}>
        {TIPOS_INCENDIO.map((tipo) => (
          <TouchableOpacity
            key={tipo}
            style={[
              styles.tipoBtn,
              form.nombre_incendio === tipo && styles.tipoBtnActive,
            ]}
            onPress={() => updateField("nombre_incendio", tipo)}
          >
            <Text
              style={[
                styles.tipoBtnText,
                form.nombre_incendio === tipo && styles.tipoBtnTextActive,
              ]}
            >
              {tipo}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>Fecha inicio</Text>
      <TextInput
        style={styles.input}
        value={form.fecha_inicio}
        onChangeText={(v) => updateField("fecha_inicio", v)}
        placeholder="YYYY-MM-DD"
        placeholderTextColor="#666"
      />

      <Text style={styles.label}>Hora inicio</Text>
      <TextInput
        style={styles.input}
        value={form.hora_inicio}
        onChangeText={(v) => updateField("hora_inicio", v)}
        placeholder="HH:MM:SS"
        placeholderTextColor="#666"
      />

      <Text style={styles.label}>Vegetación afectada</Text>
      <TextInput
        style={styles.input}
        value={form.vegetacion_afectada}
        onChangeText={(v) => updateField("vegetacion_afectada", v)}
        placeholderTextColor="#666"
        placeholder="Tipo de vegetación"
      />

      <Text style={styles.label}>Ciudad (opcional)</Text>
      <TextInput
        style={styles.input}
        value={form.ciudad_temp ?? ""}
        onChangeText={(v) => updateField("ciudad_temp", v)}
        placeholderTextColor="#666"
        placeholder="Ciudad"
      />

      <View style={styles.locationBox}>
        <Text style={styles.locationLabel}>Ubicación</Text>
        <Text style={styles.locationText}>Lat: {location?.latitud_dms}</Text>
        <Text style={styles.locationText}>Lon: {location?.longitud_dms}</Text>
      </View>

      <Text style={styles.label}>Fotos ({fotos.length})</Text>
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
                onPress={() =>
                  setFotos((prev) => prev.filter((_, i) => i !== index))
                }
              >
                <Text style={styles.fotoBorrarText}>✕</Text>
              </TouchableOpacity>
            </View>
          )}
          style={{ marginBottom: 8 }}
        />
      )}
      <TouchableOpacity style={styles.fotoBtn} onPress={pickImage}>
        <Text style={styles.fotoBtnText}>+ Agregar foto</Text>
      </TouchableOpacity>

      <Text style={styles.label}>Notas de voz ({audios.length})</Text>
      <AudioRecorder
        audios={audios}
        onAdd={(uri) => setAudios((prev) => [...prev, uri])}
        onRemove={(index) =>
          setAudios((prev) => prev.filter((_, i) => i !== index))
        }
      />

      <TouchableOpacity
        style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
        onPress={handleSubmit}
        disabled={submitting}
      >
        <Text style={styles.submitBtnText}>
          {submitting
            ? "Enviando..."
            : isConnected
              ? "Enviar reporte"
              : "Guardar offline"}
        </Text>
      </TouchableOpacity>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#1a1a1a", padding: 16 },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#1a1a1a",
    padding: 24,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 48,
    marginBottom: 16,
  },
  title: { fontSize: 24, fontWeight: "bold", color: "#fff" },
  logoutText: { color: "#ff6b6b", fontSize: 14 },
  label: { color: "#ccc", marginBottom: 6, marginTop: 12, fontSize: 14 },
  input: {
    backgroundColor: "#2a2a2a",
    borderRadius: 8,
    padding: 12,
    color: "#fff",
    fontSize: 16,
  },
  tiposContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 8,
  },
  tipoBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#444",
  },
  tipoBtnActive: { backgroundColor: "#2d7a3a", borderColor: "#2d7a3a" },
  tipoBtnText: { color: "#999", fontSize: 13 },
  tipoBtnTextActive: { color: "#fff" },
  offlineBanner: {
    backgroundColor: "#7a4a2d",
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  offlineText: { color: "#fff", fontSize: 13, textAlign: "center" },
  locationBox: {
    backgroundColor: "#2a2a2a",
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
  },
  locationLabel: { color: "#2d7a3a", fontWeight: "600", marginBottom: 4 },
  locationText: { color: "#ccc", fontSize: 13 },
  fotoBtn: {
    backgroundColor: "#2a2a2a",
    borderRadius: 8,
    padding: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#444",
    borderStyle: "dashed",
    marginTop: 8,
  },
  fotoBtnText: { color: "#2d7a3a", fontSize: 15 },
  submitBtn: {
    backgroundColor: "#2d7a3a",
    borderRadius: 8,
    padding: 16,
    alignItems: "center",
    marginTop: 24,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  button: {
    backgroundColor: "#2d7a3a",
    borderRadius: 8,
    padding: 16,
    alignItems: "center",
    marginTop: 16,
  },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  loadingText: { color: "#ccc", marginTop: 12 },
  errorText: { color: "#ff6b6b", textAlign: "center", marginBottom: 16 },
  fotoContainer: { position: "relative", marginRight: 8 },
  miniatura: { width: 80, height: 80, borderRadius: 8 },
  fotoBorrar: {
    position: "absolute",
    top: 4,
    right: 4,
    backgroundColor: "rgba(0,0,0,0.6)",
    borderRadius: 10,
    width: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  fotoBorrarText: { color: "#fff", fontSize: 11, fontWeight: "bold" },
});