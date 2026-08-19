import { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Image,
  FlatList,
  StatusBar,
} from "react-native";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import BottomSheet, { BottomSheetView } from "@gorhom/bottom-sheet";
import { useAuth } from "../lib/authContext";
import { useLocation } from "../hooks/useLocation";
import { useNetwork } from "../hooks/useNetwork";
import { useTheme } from "../hooks/useTheme";
import { supabase } from "../lib/supabase";
import { addToQueue } from "../lib/offlineQueue";
import { createRecord } from "../lib/api";
import AudioRecorder from "../components/AudioRecorder";
import MapaUbicacion from "../components/MapaUbicacion";
import SelectorFechaHora from "../components/SelectorFechaHora";
import FondoDegradado from "../components/FondoDegradado";

const TABLA = "plan_provincial_manejo_fuego";

const TIPOS_INCENDIO = [
  { key: "FORESTAL", icon: "leaf" },
  { key: "INTERFASE", icon: "home" },
  { key: "PASTIZAL", icon: "sunny" },
  { key: "URBANO", icon: "business" },
];

interface FormState {
  nombre_incendio: string;
  fecha_inicio: string;
  hora_inicio: string;
  fecha_finalizacion: string | null;
  vegetacion_afectada: string;
  hectareas_consumidas: string;
}

const initialForm = (): FormState => ({
  nombre_incendio: "",
  fecha_inicio: new Date().toISOString().split("T")[0],
  hora_inicio: new Date().toTimeString().split(" ")[0],
  fecha_finalizacion: null,
  vegetacion_afectada: "",
  hectareas_consumidas: "",
});

type SheetType = "enviado" | "offline" | "error" | null;

export default function PlanProvincialManejoFuego() {
  const { session } = useAuth();
  const router = useRouter();
  const { colores: C } = useTheme();
  const { location, error: locationError, loading: locationLoading, retry } = useLocation();
  const { isConnected } = useNetwork();
  const [audios, setAudios] = useState<string[]>([]);
  const [fotos, setFotos] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState<FormState>(initialForm());
  const [sheetType, setSheetType] = useState<SheetType>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [coordsOverride, setCoordsOverride] = useState<{ lat: number; lng: number } | null>(null);
  const [mapaDragging, setMapaDragging] = useState(false);

  const bottomSheetRef = useRef<BottomSheet>(null);

  const abrirSheet = useCallback((tipo: SheetType) => {
    setSheetType(tipo);
    bottomSheetRef.current?.expand();
  }, []);

  const cerrarSheet = useCallback(() => {
    bottomSheetRef.current?.close();
    setSheetType(null);
  }, []);

  const updateField = (key: keyof FormState, value: string | null) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ["images"] as ImagePicker.MediaType[],
      quality: 0.7,
    });
    if (!result.canceled) setFotos((prev) => [...prev, result.assets[0].uri]);
  };

  const uploadFoto = async (uri: string): Promise<string> => {
    const userId = session?.user?.id ?? "anonimo";
    const filename = `${userId}/${Date.now()}_${Math.random().toString(36).slice(2)}.jpeg`;
    const { data: { session: currentSession } } = await supabase.auth.getSession();
    const token = currentSession?.access_token ?? process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;
    const response = await fetch(uri);
    const blob = await response.blob();
    const uploadResponse = await fetch(
      `${process.env.EXPO_PUBLIC_SUPABASE_URL}/storage/v1/object/fotos_incendios/${filename}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "image/jpeg",
          "x-upsert": "false",
        },
        body: blob,
      }
    );
    const result = await uploadResponse.json();
    if (!uploadResponse.ok) throw new Error(result.message ?? "Error subiendo foto");
    return `${process.env.EXPO_PUBLIC_SUPABASE_URL}/storage/v1/object/public/fotos_incendios/${filename}`;
  };

  const uploadAudio = async (uri: string): Promise<string> => {
    const userId = session?.user?.id ?? "anonimo";
    const filename = `${userId}/${Date.now()}_${Math.random().toString(36).slice(2)}.m4a`;
    const { data: { session: currentSession } } = await supabase.auth.getSession();
    const token = currentSession?.access_token ?? process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;
    const response = await fetch(uri);
    const blob = await response.blob();
    const uploadResponse = await fetch(
      `${process.env.EXPO_PUBLIC_SUPABASE_URL}/storage/v1/object/audios_incendios/${filename}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "audio/m4a",
          "x-upsert": "false",
        },
        body: blob,
      }
    );
    const result = await uploadResponse.json();
    if (!uploadResponse.ok) throw new Error(result.message ?? "Error subiendo audio");
    return `${process.env.EXPO_PUBLIC_SUPABASE_URL}/storage/v1/object/public/audios_incendios/${filename}`;
  };

  const handleSubmit = async () => {
    if (!location) {
      setErrorMsg("Necesitás activar la ubicación para enviar el reporte");
      abrirSheet("error");
      return;
    }
    if (!form.nombre_incendio) {
      setErrorMsg("Seleccioná el tipo de incendio");
      abrirSheet("error");
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
        latitud_decimal: coordsOverride?.lat ?? location.latitud_decimal,
        longitud_decimal: coordsOverride?.lng ?? location.longitud_decimal,
        latitud_dms: coordsOverride ? `${coordsOverride.lat.toFixed(6)}` : location.latitud_dms,
longitud_dms: coordsOverride ? `${coordsOverride.lng.toFixed(6)}` : location.longitud_dms,
        fotos: fotosUrls,
        audios: audiosUrls,
        activo: true,
      };
      if (isConnected) {
        await createRecord(TABLA, record);
        setForm(initialForm());
        setFotos([]);
        setAudios([]);
        abrirSheet("enviado");
      } else {
        await addToQueue({
          id: Date.now().toString(),
          tabla: TABLA,
          data: record,
          fotos,
          audios,
          fotosBucket: "fotos_incendios",
          audiosBucket: "audios_incendios",
          timestamp: Date.now(),
        });
        setForm(initialForm());
        setFotos([]);
        setAudios([]);
        abrirSheet("offline");
      }
    } catch (error: any) {
      setErrorMsg(error.message ?? "Ocurrió un error al enviar");
      abrirSheet("error");
    } finally {
      setSubmitting(false);
    }
  };

  const renderSheetContent = () => {
    if (sheetType === "enviado") return (
      <View style={styles.sheetContent}>
        <View style={[styles.sheetIconCircle, { backgroundColor: "#1a3a1a" }]}>
          <Ionicons name="checkmark-circle" size={48} color={C.verde} />
        </View>
        <Text style={[styles.sheetTitle, { color: C.texto }]}>Registro guardado</Text>
        <Text style={[styles.sheetSubtitle, { color: C.textoSub }]}>El reporte fue registrado correctamente en el sistema.</Text>
        <TouchableOpacity
          style={[styles.sheetBtn, { backgroundColor: C.fondoInput, borderWidth: 1, borderColor: C.oliva, justifyContent: "center", alignItems: "center", paddingHorizontal: 48 }]}
          onPress={() => router.replace('/inicio')}
        >
          <Text style={[styles.sheetBtnText, { color: C.oliva }]}>Volver a formularios</Text>
        </TouchableOpacity>
      </View>
    );

    if (sheetType === "offline") return (
      <View style={styles.sheetContent}>
        <View style={[styles.sheetIconCircle, { backgroundColor: "#3a2a1a" }]}>
          <Ionicons name="cloud-offline" size={48} color={C.crema} />
        </View>
        <Text style={[styles.sheetTitle, { color: C.texto }]}>Guardado sin conexión</Text>
        <Text style={[styles.sheetSubtitle, { color: C.textoSub }]}>El reporte se guardó localmente y se enviará automáticamente cuando vuelva la conexión.</Text>
        <TouchableOpacity style={[styles.sheetBtn, { backgroundColor: C.naranja }]} onPress={cerrarSheet}>
          <Text style={[styles.sheetBtnText, { color: C.fondoCard }]}>Entendido</Text>
        </TouchableOpacity>
      </View>
    );

    if (sheetType === "error") return (
      <View style={styles.sheetContent}>
        <View style={[styles.sheetIconCircle, { backgroundColor: "#3a1a1a" }]}>
          <Ionicons name="alert-circle" size={48} color="#ff6b6b" />
        </View>
        <Text style={[styles.sheetTitle, { color: C.texto }]}>Hubo un problema</Text>
        <Text style={[styles.sheetSubtitle, { color: C.textoSub }]}>{errorMsg}</Text>
        <TouchableOpacity style={[styles.sheetBtn, { backgroundColor: C.fondoInput }]} onPress={cerrarSheet}>
          <Text style={[styles.sheetBtnText, { color: C.texto }]}>Cerrar</Text>
        </TouchableOpacity>
      </View>
    );

    return null;
  };

  if (locationLoading) {
    return (
      <FondoDegradado style={styles.centered}>
        <StatusBar barStyle={C.statusBar} backgroundColor="transparent" translucent />
        <ActivityIndicator size="large" color={C.naranja} />
        <Text style={[styles.loadingText, { color: C.texto }]}>Obteniendo ubicación...</Text>
        <Text style={[styles.loadingSubtext, { color: C.textoSub }]}>La ubicación es obligatoria para continuar</Text>
      </FondoDegradado>
    );
  }

  if (locationError) {
    return (
      <FondoDegradado style={styles.centered}>
        <StatusBar barStyle={C.statusBar} backgroundColor="transparent" translucent />
        <View style={[styles.errorIcon, { backgroundColor: C.fondoCard }]}>
          <Ionicons name="location-outline" size={48} color={C.naranja} />
        </View>
        <Text style={[styles.errorTitle, { color: C.texto }]}>Ubicación desactivada</Text>
        <Text style={[styles.errorText, { color: C.textoSub }]}>{locationError}</Text>
        <TouchableOpacity style={[styles.retryBtn, { backgroundColor: C.naranja }]} onPress={retry}>
          <Ionicons name="refresh" size={18} color={C.fondoCard} />
          <Text style={[styles.retryBtnText, { color: C.fondoCard }]}>Reintentar</Text>
        </TouchableOpacity>
      </FondoDegradado>
    );
  }

  return (
    <FondoDegradado>
      <StatusBar barStyle={C.statusBar} backgroundColor="transparent" translucent />

      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
        scrollEnabled={!mapaDragging}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={[styles.headerGreeting, { color: C.texto }]}>
              Hola, {session?.user?.user_metadata?.full_name ?? session?.user?.email ?? "Anónimo"}
            </Text>
            <Text style={[styles.headerSub, { color: C.textoSub }]}>Nuevo reporte de incendio</Text>
          </View>
          <TouchableOpacity style={[styles.logoutBtn, { backgroundColor: C.fondoCard }]} onPress={() => router.replace('/inicio')}>
            <Ionicons name="arrow-back" size={20} color={C.naranja} />
          </TouchableOpacity>
        </View>

        {/* Banner offline */}
        {!isConnected && (
          <View style={[styles.offlineBanner, { backgroundColor: C.offlineBg }]}>
            <Ionicons name="cloud-offline-outline" size={18} color={C.crema} />
            <Text style={[styles.offlineText, { color: C.crema }]}>Sin conexión — se guardará localmente</Text>
          </View>
        )}

        {/* Tipo de incendio */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="flame-outline" size={18} color={C.naranja} />
            <Text style={[styles.sectionTitle, { color: C.texto }]}>Tipo de incendio *</Text>
          </View>
          <View style={styles.tiposGrid}>
            {TIPOS_INCENDIO.map((tipo) => (
              <TouchableOpacity
                key={tipo.key}
                style={[
                  styles.tipoBtn,
                  { backgroundColor: C.fondoCard, borderColor: C.borde },
                  form.nombre_incendio === tipo.key && { backgroundColor: C.naranja, borderColor: C.naranja },
                ]}
                onPress={() => updateField("nombre_incendio", tipo.key)}
              >
                <Ionicons
                  name={tipo.icon as any}
                  size={22}
                  color={form.nombre_incendio === tipo.key ? C.fondoCard : C.oliva}
                />
                <Text style={[
                  styles.tipoBtnText,
                  { color: C.oliva },
                  form.nombre_incendio === tipo.key && { color: C.fondoCard },
                ]}>
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
            <Text style={[styles.sectionTitle, { color: C.texto }]}>Fecha y hora</Text>
          </View>
          <View style={styles.row}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <SelectorFechaHora modo="date" valor={form.fecha_inicio} onChange={(v) => updateField("fecha_inicio", v)} />
            </View>
            <View style={{ flex: 1 }}>
              <SelectorFechaHora modo="time" valor={form.hora_inicio} onChange={(v) => updateField("hora_inicio", v)} />
            </View>
          </View>
        </View>

        {/* Vegetación */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="leaf-outline" size={18} color={C.naranja} />
            <Text style={[styles.sectionTitle, { color: C.texto }]}>Vegetación afectada</Text>
          </View>
          <View style={[styles.inputWrapper, { backgroundColor: C.fondoCard, borderColor: C.borde }]}>
            <TextInput
              style={[styles.input, { paddingLeft: 14, color: C.texto }]}
              value={form.vegetacion_afectada}
              onChangeText={(v) => updateField("vegetacion_afectada", v)}
              placeholder="Describí la vegetación afectada"
              placeholderTextColor={C.textoTenue}
            />
          </View>
        </View>

        {/* Hectáreas */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="resize-outline" size={18} color={C.naranja} />
            <Text style={[styles.sectionTitle, { color: C.texto }]}>Hectáreas afectadas</Text>
          </View>
          <View style={[styles.inputWrapper, { backgroundColor: C.fondoCard, borderColor: C.borde }]}>
            <TextInput
              style={[styles.input, { paddingLeft: 14, color: C.texto }]}
              value={form.hectareas_consumidas}
              onChangeText={(v) => updateField("hectareas_consumidas", v)}
              placeholder="Estimación en hectáreas"
              placeholderTextColor={C.textoTenue}
              keyboardType="numeric"
            />
          </View>
        </View>

        {/* Ubicación GPS */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="location" size={18} color={C.naranja} />
            <Text style={[styles.sectionTitle, { color: C.texto }]}>Ubicación GPS</Text>
          </View>
          {location && (
            <MapaUbicacion
              latitud={location.latitud_decimal}
              longitud={location.longitud_decimal}
              onCoordsChange={(lat, lng) => setCoordsOverride({ lat, lng })}
              onDragStart={() => setMapaDragging(true)}
              onDragEnd={() => setMapaDragging(false)}
            />
          )}
          <View style={[styles.locationBox, { marginTop: 10, backgroundColor: C.fondoCard, borderColor: C.borde }]}>
            <View style={styles.locationRow}>
              <Ionicons name="navigate-outline" size={16} color={C.verde} />
              <Text style={[styles.locationText, { color: C.textoSub }]}>
                Lat: {coordsOverride ? `${coordsOverride.lat.toFixed(6)}°` : location?.latitud_dms}
              </Text>
            </View>
            <View style={styles.locationRow}>
              <Ionicons name="navigate-outline" size={16} color={C.verde} />
              <Text style={[styles.locationText, { color: C.textoSub }]}>
                Lon: {coordsOverride ? `${coordsOverride.lng.toFixed(6)}°` : location?.longitud_dms}
              </Text>
            </View>
            <View style={[styles.locationRow, { marginTop: 4 }]}>
              <View style={[styles.gpsActiveDot, { backgroundColor: C.verde }]} />
              <Text style={[styles.gpsActiveText, { color: C.verde }]}>
                {coordsOverride ? "Ubicación ajustada manualmente" : "GPS activo en tiempo real"}
              </Text>
            </View>
          </View>
        </View>

        {/* Fotos */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="camera-outline" size={18} color={C.naranja} />
            <Text style={[styles.sectionTitle, { color: C.texto }]}>Fotos <Text style={[styles.count, { color: C.textoSub }]}>({fotos.length})</Text></Text>
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
          <TouchableOpacity style={[styles.addBtn, { backgroundColor: C.fondoCard, borderColor: C.naranja }]} onPress={pickImage}>
            <Ionicons name="camera" size={20} color={C.naranja} />
            <Text style={[styles.addBtnText, { color: C.naranja }]}>Tomar foto</Text>
          </TouchableOpacity>
        </View>

        {/* Audio */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="mic-outline" size={18} color={C.naranja} />
            <Text style={[styles.sectionTitle, { color: C.texto }]}>Notas de voz <Text style={[styles.count, { color: C.textoSub }]}>({audios.length})</Text></Text>
          </View>
          <AudioRecorder
            audios={audios}
            onAdd={(uri) => setAudios((prev) => [...prev, uri])}
            onRemove={(index) => setAudios((prev) => prev.filter((_, i) => i !== index))}
          />
        </View>

        {/* Botón enviar */}
        <TouchableOpacity
          style={[styles.submitBtn, { backgroundColor: C.naranja }, submitting && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator size="small" color={C.fondoCard} />
          ) : (
            <>
              <Ionicons name={isConnected ? "send" : "save"} size={20} color={C.fondoCard} />
              <Text style={[styles.submitBtnText, { color: C.fondoCard }]}>
                {isConnected ? "Enviar reporte" : "Guardar offline"}
              </Text>
            </>
          )}
        </TouchableOpacity>

        <View style={{ height: 48 }} />
      </ScrollView>

      {/* Bottom Sheet */}
      <BottomSheet
  ref={bottomSheetRef}
  index={-1}
  snapPoints={["50%"]}
  enablePanDownToClose
  onClose={() => setSheetType(null)}
  backgroundStyle={{ backgroundColor: C.fondoCard }}
  handleIndicatorStyle={{ backgroundColor: C.oliva }}
  enableOverDrag={false}
  animateOnMount={false}
  style={{ display: sheetType ? 'flex' : 'none' }}
>
  <BottomSheetView style={{ flex: 1 }}>
    {sheetType ? renderSheetContent() : <View />}
  </BottomSheetView>
</BottomSheet>
    </FondoDegradado>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center", padding: 32 },
  loadingText: { fontSize: 16, fontWeight: "600", marginTop: 16 },
  loadingSubtext: { fontSize: 13, marginTop: 8, textAlign: "center" },
  errorIcon: { width: 90, height: 90, borderRadius: 45, justifyContent: "center", alignItems: "center", marginBottom: 16 },
  errorTitle: { fontSize: 20, fontWeight: "normal", marginBottom: 8 },
  errorText: { fontSize: 14, textAlign: "center", marginBottom: 24 },
  retryBtn: { borderRadius: 12, paddingHorizontal: 24, paddingVertical: 14, flexDirection: "row", alignItems: "center", gap: 8 },
  retryBtnText: { fontSize: 16, fontWeight: "normal" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingTop: 56, paddingBottom: 20 },
  headerGreeting: { fontSize: 20, fontWeight: "normal" },
  headerSub: { fontSize: 13, marginTop: 2 },
  logoutBtn: { width: 40, height: 40, borderRadius: 20, justifyContent: "center", alignItems: "center" },
  offlineBanner: { flexDirection: "row", alignItems: "center", gap: 8, marginHorizontal: 20, borderRadius: 10, padding: 12, marginBottom: 8 },
  offlineText: { fontSize: 13, flex: 1 },
  section: { marginHorizontal: 20, marginBottom: 20 },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 },
  sectionTitle: { fontSize: 15, fontWeight: "600" },
  count: { fontWeight: "400" },
  tiposGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  tipoBtn: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12, borderWidth: 1.5, minWidth: "45%" },
  tipoBtnText: { fontSize: 13, fontWeight: "600" },
  row: { flexDirection: "row" },
  inputWrapper: { flexDirection: "row", alignItems: "center", borderRadius: 12, paddingHorizontal: 12, borderWidth: 1 },
  inputIcon: { marginRight: 8 },
  input: { flex: 1, fontSize: 15, paddingVertical: 13 },
  locationBox: { borderRadius: 12, padding: 14, borderWidth: 1 },
  locationRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 },
  locationText: { fontSize: 14 },
  gpsActiveDot: { width: 8, height: 8, borderRadius: 4 },
  gpsActiveText: { fontSize: 12 },
  fotoContainer: { position: "relative", marginRight: 10 },
  miniatura: { width: 80, height: 80, borderRadius: 10 },
  fotoBorrar: { position: "absolute", top: 4, right: 4, backgroundColor: "rgba(0,0,0,0.7)", borderRadius: 10, width: 20, height: 20, alignItems: "center", justifyContent: "center" },
  addBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 12, padding: 14, borderWidth: 1.5, borderStyle: "dashed" },
  addBtnText: { fontSize: 15, fontWeight: "600" },
  submitBtn: { marginHorizontal: 20, borderRadius: 14, padding: 18, flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 10, marginTop: 8 },
  submitBtnDisabled: { opacity: 0.5 },
  submitBtnText: { fontSize: 17, fontWeight: "normal" },
  sheetContent: { flex: 1, alignItems: "center", padding: 28, paddingTop: 16, paddingBottom: 32 },
  sheetIconCircle: { width: 80, height: 80, borderRadius: 40, justifyContent: "center", alignItems: "center", marginBottom: 16 },
  sheetTitle: { fontSize: 22, fontWeight: "normal", marginBottom: 8, textAlign: "center" },
  sheetSubtitle: { fontSize: 14, textAlign: "center", lineHeight: 22, marginBottom: 24 },
  sheetBtn: { borderRadius: 12, paddingHorizontal: 32, paddingVertical: 14 },
  sheetBtnText: { fontSize: 16, fontWeight: "normal" },
});
