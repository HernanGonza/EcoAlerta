import { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Modal,
  FlatList,
  Image,
  StatusBar,
  BackHandler,
} from "react-native";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../lib/authContext";
import { useLocation } from "../hooks/useLocation";
import { useNetwork } from "../hooks/useNetwork";
import { useTheme } from "../hooks/useTheme";
import { supabase } from "../lib/supabase";
import { addToQueue } from "../lib/offlineQueue";
import { createRecord } from "../lib/api";
import { guardarMetadataCache, leerMetadataCache, guardarOpcionesFKCache, leerOpcionesFKCache } from "../lib/formularioMetadataCache";
import MapaUbicacion from "../components/MapaUbicacion";
import AudioRecorder from "../components/AudioRecorder";
import SelectorFechaHora from "../components/SelectorFechaHora";
import FondoDegradado from "../components/FondoDegradado";

const FOTOS_BUCKET = "fotos";
const AUDIOS_BUCKET = "audios";

interface CampoMeta {
  campo: string;
  tipo: string;
  requerido: boolean;
  label: string;
  foreign_table: string | null;
  is_fk: boolean;
}

interface FormularioMeta {
  ok: boolean;
  formulario: { id: string; nombre: string; slug: string; area_id: string };
  fields: CampoMeta[];
}

interface OpcionFK {
  id: string;
  nombre: string;
  departamento_id?: string;
}

// Columnas que la app maneja aparte (ubicación GPS propia, o son de sistema) y no
// se muestran como campos genéricos de texto.
const CAMPOS_EXCLUIDOS = new Set([
  "id",
  "created_at",
  "created_by",
  "user_id",
  "formulario_id",
  "updated_at",
  "geom",
  "geometria",
  "geometry",
  "activo",
  "latitud_decimal",
  "longitud_decimal",
  "latitud_dms",
  "longitud_dms",
  "latitud_gms",
  "longitud_gms",
  "fotos",
  "audios",
  "ciudad_temp",
]);

type TipoCampo = "foreign" | "boolean" | "time" | "date" | "number" | "text";

function tipoDeCampo(f: CampoMeta): TipoCampo {
  if (f.foreign_table) return "foreign";
  if (f.tipo === "boolean") return "boolean";
  if (f.tipo?.includes("time") && !f.tipo.includes("timestamp")) return "time";
  if (f.tipo === "date" || f.tipo?.includes("timestamp")) return "date";
  if (["integer", "numeric", "double precision", "bigint", "smallint", "real"].includes(f.tipo)) return "number";
  return "text";
}

type SheetType = "enviado" | "offline" | "error" | null;

export default function FormularioDinamico({ slug }: { slug: string }) {
  const { session } = useAuth();
  const router = useRouter();
  const { colores: C } = useTheme();
  const { location, error: locationError, loading: locationLoading, retry } = useLocation();
  const { isConnected } = useNetwork();

  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);
  const [meta, setMeta] = useState<FormularioMeta | null>(null);
  const [valores, setValores] = useState<Record<string, any>>({});
  const [opcionesFK, setOpcionesFK] = useState<Record<string, OpcionFK[]>>({});
  const [pickerAbierto, setPickerAbierto] = useState<CampoMeta | null>(null);
  const [busquedaPicker, setBusquedaPicker] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sheetType, setSheetType] = useState<SheetType>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [coordsOverride, setCoordsOverride] = useState<{ lat: number; lng: number } | null>(null);
  const [mapaDragging, setMapaDragging] = useState(false);
  const [fotos, setFotos] = useState<string[]>([]);
  const [audios, setAudios] = useState<string[]>([]);

  // Detecta si esta tabla usa latitud_dms/longitud_dms o latitud_gms/longitud_gms
  const claveDms = useMemo(() => {
    const nombres = new Set((meta?.fields ?? []).map((f) => f.campo));
    return {
      lat: nombres.has("latitud_gms") ? "latitud_gms" : "latitud_dms",
      lng: nombres.has("longitud_gms") ? "longitud_gms" : "longitud_dms",
    };
  }, [meta]);

  const tieneFotos = useMemo(() => (meta?.fields ?? []).some((f) => f.campo === "fotos"), [meta]);
  const tieneAudios = useMemo(() => (meta?.fields ?? []).some((f) => f.campo === "audios"), [meta]);

  const campos = useMemo(
    () => (meta?.fields ?? []).filter((f) => !CAMPOS_EXCLUIDOS.has(f.campo)),
    [meta]
  );

  useEffect(() => {
    if (isConnected === null) return; // esperar a que resuelva conectividad
    let cancelado = false;

    const cargarDesdeCache = async (): Promise<boolean> => {
      const cache = await leerMetadataCache(slug);
      if (!cache) return false;
      if (cancelado) return true;
      setMeta(cache);
      const camposFK: CampoMeta[] = (cache.fields ?? []).filter((f: CampoMeta) => f.foreign_table);
      const datosFK: Record<string, OpcionFK[]> = {};
      for (const f of camposFK) {
        datosFK[f.campo] = (await leerOpcionesFKCache(f.foreign_table!)) ?? [];
      }
      if (!cancelado) setOpcionesFK(datosFK);
      return true;
    };

    const cargarMetadata = async () => {
      setCargando(true);
      setErrorCarga(null);

      if (!isConnected) {
        const huboCache = await cargarDesdeCache();
        if (!cancelado) {
          if (!huboCache) {
            setErrorCarga(
              "Sin conexión y todavía no tenés este formulario guardado en el dispositivo. Abrilo una vez con conexión antes de ir a campo."
            );
          }
          setCargando(false);
        }
        return;
      }

      try {
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        const token = currentSession?.access_token;
        const res = await fetch(
          `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/formulario-metadata?slug=${slug}`,
          { headers: { Authorization: `Bearer ${token}`, apikey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY! } }
        );
        const json = await res.json();
        if (!res.ok || !json.ok) throw new Error(json.error ?? "No se pudo cargar el formulario");
        if (cancelado) return;
        setMeta(json);
        guardarMetadataCache(slug, json);

        const camposFK: CampoMeta[] = (json.fields ?? []).filter((f: CampoMeta) => f.foreign_table);
        const datosFK: Record<string, OpcionFK[]> = {};
        await Promise.all(
          camposFK.map(async (f) => {
            const selectQuery = f.foreign_table === "municipios" ? "id, nombre, departamento_id" : "id, nombre";
            const { data } = await supabase
              .from(f.foreign_table!)
              .select(selectQuery)
              .order("nombre", { ascending: true });
            const opciones = (data as any) ?? [];
            datosFK[f.campo] = opciones;
            guardarOpcionesFKCache(f.foreign_table!, opciones);
          })
        );
        if (!cancelado) setOpcionesFK(datosFK);
      } catch (e: any) {
        // Se reportó conexión pero la petición falló igual (red inestable): probamos con lo último guardado.
        const huboCache = await cargarDesdeCache();
        if (!cancelado && !huboCache) setErrorCarga(e.message ?? "Error al cargar el formulario");
      } finally {
        if (!cancelado) setCargando(false);
      }
    };

    cargarMetadata();
    return () => {
      cancelado = true;
    };
  }, [slug, isConnected]);

  const actualizarCampo = (campo: string, valor: any) => {
    setValores((prev) => {
      const next = { ...prev, [campo]: valor };
      if (campo === "departamento_id") next.municipio_id = null;
      return next;
    });
  };

  const abrirSheet = (tipo: SheetType) => setSheetType(tipo);
  const cerrarSheet = () => setSheetType(null);

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
      `${process.env.EXPO_PUBLIC_SUPABASE_URL}/storage/v1/object/${FOTOS_BUCKET}/${filename}`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "image/jpeg", "x-upsert": "false" },
        body: blob,
      }
    );
    const result = await uploadResponse.json();
    if (!uploadResponse.ok) throw new Error(result.message ?? "Error subiendo foto");
    return `${process.env.EXPO_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${FOTOS_BUCKET}/${filename}`;
  };

  const uploadAudio = async (uri: string): Promise<string> => {
    const userId = session?.user?.id ?? "anonimo";
    const filename = `${userId}/${Date.now()}_${Math.random().toString(36).slice(2)}.m4a`;
    const { data: { session: currentSession } } = await supabase.auth.getSession();
    const token = currentSession?.access_token ?? process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;
    const response = await fetch(uri);
    const blob = await response.blob();
    const uploadResponse = await fetch(
      `${process.env.EXPO_PUBLIC_SUPABASE_URL}/storage/v1/object/${AUDIOS_BUCKET}/${filename}`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "audio/m4a", "x-upsert": "false" },
        body: blob,
      }
    );
    const result = await uploadResponse.json();
    if (!uploadResponse.ok) throw new Error(result.message ?? "Error subiendo audio");
    return `${process.env.EXPO_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${AUDIOS_BUCKET}/${filename}`;
  };

  const handleSubmit = async () => {
    if (!location) {
      setErrorMsg("Necesitás activar la ubicación para enviar el reporte");
      abrirSheet("error");
      return;
    }
    const faltante = campos.find((f) => f.requerido && (valores[f.campo] === undefined || valores[f.campo] === null || valores[f.campo] === ""));
    if (faltante) {
      setErrorMsg(`Completá el campo "${faltante.label}"`);
      abrirSheet("error");
      return;
    }

    setSubmitting(true);
    try {
      const datosLimpios: Record<string, any> = {};
      for (const f of campos) {
        const val = valores[f.campo];
        if (val === undefined || val === null || val === "") {
          datosLimpios[f.campo] = null;
        } else if (tipoDeCampo(f) === "number") {
          const num = Number(val);
          datosLimpios[f.campo] = Number.isNaN(num) ? null : num;
        } else {
          datosLimpios[f.campo] = val;
        }
      }

      const lat = coordsOverride?.lat ?? location.latitud_decimal;
      const lng = coordsOverride?.lng ?? location.longitud_decimal;

      const record: Record<string, any> = {
        ...datosLimpios,
        user_id: session?.user?.id ?? null,
        created_by: session?.user?.id ?? null,
        latitud_decimal: lat,
        longitud_decimal: lng,
        [claveDms.lat]: coordsOverride ? `${coordsOverride.lat.toFixed(6)}` : location.latitud_dms,
        [claveDms.lng]: coordsOverride ? `${coordsOverride.lng.toFixed(6)}` : location.longitud_dms,
        activo: true,
      };

      if (isConnected) {
        if (tieneFotos) record.fotos = await Promise.all(fotos.map(uploadFoto));
        if (tieneAudios) record.audios = await Promise.all(audios.map(uploadAudio));
        await createRecord(slug, record);
        setValores({});
        setFotos([]);
        setAudios([]);
        abrirSheet("enviado");
      } else {
        await addToQueue({
          id: Date.now().toString(),
          tabla: slug,
          data: record,
          fotos: tieneFotos ? fotos : [],
          audios: tieneAudios ? audios : [],
          fotosBucket: FOTOS_BUCKET,
          audiosBucket: AUDIOS_BUCKET,
          timestamp: Date.now(),
        });
        setValores({});
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

  const opcionesPicker = useMemo(() => {
    if (!pickerAbierto) return [];
    let opciones = opcionesFK[pickerAbierto.campo] ?? [];
    if (pickerAbierto.campo === "municipio_id") {
      const deptoId = valores.departamento_id;
      opciones = deptoId ? opciones.filter((o) => String(o.departamento_id) === String(deptoId)) : [];
    }
    if (busquedaPicker.trim()) {
      const q = busquedaPicker.trim().toLowerCase();
      opciones = opciones.filter((o) => o.nombre?.toLowerCase().includes(q));
    }
    return opciones;
  }, [pickerAbierto, opcionesFK, valores.departamento_id, busquedaPicker]);

  const renderCampo = (f: CampoMeta) => {
    const tipo = tipoDeCampo(f);
    const valor = valores[f.campo];

    if (tipo === "foreign") {
      const seleccionado = (opcionesFK[f.campo] ?? []).find((o) => String(o.id) === String(valor));
      const bloqueado = f.campo === "municipio_id" && !valores.departamento_id;
      return (
        <TouchableOpacity
          key={f.campo}
          disabled={bloqueado}
          style={[styles.inputWrapper, { backgroundColor: bloqueado ? C.fondoMid : C.fondoCard, borderColor: C.borde }]}
          onPress={() => {
            setBusquedaPicker("");
            setPickerAbierto(f);
          }}
        >
          <Text style={[styles.selectText, { color: seleccionado ? C.texto : C.textoTenue }]} numberOfLines={1}>
            {seleccionado ? seleccionado.nombre : bloqueado ? "Elegí primero el departamento" : "Seleccionar..."}
          </Text>
          <Ionicons name="chevron-down" size={18} color={C.textoTenue} />
        </TouchableOpacity>
      );
    }

    if (tipo === "boolean") {
      return (
        <View key={f.campo} style={styles.row}>
          {[{ label: "Sí", val: true }, { label: "No", val: false }].map((op) => (
            <TouchableOpacity
              key={op.label}
              style={[
                styles.tipoBtn,
                { backgroundColor: C.fondoCard, borderColor: C.borde, flex: 1, marginRight: op.label === "Sí" ? 8 : 0 },
                valor === op.val && { backgroundColor: C.naranja, borderColor: C.naranja },
              ]}
              onPress={() => actualizarCampo(f.campo, op.val)}
            >
              <Text style={[styles.tipoBtnText, { color: valor === op.val ? C.fondoCard : C.oliva }]}>{op.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      );
    }

    if (tipo === "date") {
      return (
        <SelectorFechaHora
          key={f.campo}
          modo="date"
          valor={valor}
          onChange={(v) => actualizarCampo(f.campo, v)}
        />
      );
    }

    if (tipo === "time") {
      return (
        <SelectorFechaHora
          key={f.campo}
          modo="time"
          valor={valor}
          onChange={(v) => actualizarCampo(f.campo, v)}
        />
      );
    }

    if (tipo === "number") {
      return (
        <View key={f.campo} style={[styles.inputWrapper, { backgroundColor: C.fondoCard, borderColor: C.borde }]}>
          <TextInput
            style={[styles.input, { paddingLeft: 14, color: C.texto }]}
            value={valor?.toString() ?? ""}
            onChangeText={(v) => actualizarCampo(f.campo, v)}
            placeholder="0"
            placeholderTextColor={C.textoTenue}
            keyboardType="numeric"
          />
        </View>
      );
    }

    return (
      <View key={f.campo} style={[styles.inputWrapper, { backgroundColor: C.fondoCard, borderColor: C.borde }]}>
        <TextInput
          style={[styles.input, { paddingLeft: 14, color: C.texto }]}
          value={valor ?? ""}
          onChangeText={(v) => actualizarCampo(f.campo, v)}
          placeholder={f.label}
          placeholderTextColor={C.textoTenue}
        />
      </View>
    );
  };

  if (cargando) {
    return (
      <FondoDegradado style={styles.centered}>
        <StatusBar barStyle={C.statusBar} backgroundColor="transparent" translucent />
        <ActivityIndicator size="large" color={C.naranja} />
        <Text style={[styles.loadingText, { color: C.texto }]}>Cargando formulario...</Text>
      </FondoDegradado>
    );
  }

  if (errorCarga) {
    return (
      <FondoDegradado style={styles.centered}>
        <StatusBar barStyle={C.statusBar} backgroundColor="transparent" translucent />
        <Ionicons name="alert-circle-outline" size={48} color={C.naranja} />
        <Text style={[styles.loadingText, { color: C.texto }]}>{errorCarga}</Text>
      </FondoDegradado>
    );
  }

  if (locationLoading) {
    return (
      <FondoDegradado style={styles.centered}>
        <StatusBar barStyle={C.statusBar} backgroundColor="transparent" translucent />
        <ActivityIndicator size="large" color={C.naranja} />
        <Text style={[styles.loadingText, { color: C.texto }]}>Obteniendo ubicación...</Text>
      </FondoDegradado>
    );
  }

  if (locationError) {
    return (
      <FondoDegradado style={styles.centered}>
        <StatusBar barStyle={C.statusBar} backgroundColor="transparent" translucent />
        <Ionicons name="location-outline" size={48} color={C.naranja} />
        <Text style={[styles.loadingText, { color: C.texto }]}>{locationError}</Text>
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
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.headerGreeting, { color: C.texto }]}>{meta?.formulario.nombre}</Text>
            <Text style={[styles.headerSub, { color: C.textoSub }]}>Nuevo reporte</Text>
          </View>
          <TouchableOpacity style={[styles.logoutBtn, { backgroundColor: C.fondoCard }]} onPress={() => router.replace('/inicio')}>
            <Ionicons name="arrow-back" size={20} color={C.naranja} />
          </TouchableOpacity>
        </View>

        {!isConnected && (
          <View style={[styles.offlineBanner, { backgroundColor: C.offlineBg }]}>
            <Ionicons name="cloud-offline-outline" size={18} color={C.crema} />
            <Text style={[styles.offlineText, { color: C.crema }]}>Sin conexión — se guardará localmente</Text>
          </View>
        )}

        {campos.map((f) => (
          <View key={f.campo} style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: C.texto }]}>
                {f.label}
                {f.requerido ? " *" : ""}
              </Text>
            </View>
            {renderCampo(f)}
          </View>
        ))}

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
            <Text style={[styles.locationText, { color: C.textoSub }]}>
              Lat: {coordsOverride ? `${coordsOverride.lat.toFixed(6)}°` : location?.latitud_dms}
            </Text>
            <Text style={[styles.locationText, { color: C.textoSub }]}>
              Lon: {coordsOverride ? `${coordsOverride.lng.toFixed(6)}°` : location?.longitud_dms}
            </Text>
          </View>
        </View>

        {tieneFotos && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="camera-outline" size={18} color={C.naranja} />
              <Text style={[styles.sectionTitle, { color: C.texto }]}>
                Fotos <Text style={{ fontWeight: "400", color: C.textoSub }}>({fotos.length})</Text>
              </Text>
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
        )}

        {tieneAudios && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="mic-outline" size={18} color={C.naranja} />
              <Text style={[styles.sectionTitle, { color: C.texto }]}>
                Notas de voz <Text style={{ fontWeight: "400", color: C.textoSub }}>({audios.length})</Text>
              </Text>
            </View>
            <AudioRecorder
              audios={audios}
              onAdd={(uri) => setAudios((prev) => [...prev, uri])}
              onRemove={(index) => setAudios((prev) => prev.filter((_, i) => i !== index))}
            />
          </View>
        )}

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

      {/* Picker de FK */}
      <Modal visible={!!pickerAbierto} animationType="slide" transparent onRequestClose={() => setPickerAbierto(null)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: C.fondoCard }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: C.texto }]}>{pickerAbierto?.label}</Text>
              <TouchableOpacity onPress={() => setPickerAbierto(null)}>
                <Ionicons name="close" size={24} color={C.textoSub} />
              </TouchableOpacity>
            </View>
            <View style={[styles.inputWrapper, { backgroundColor: C.fondoInput, borderColor: C.borde, marginHorizontal: 16 }]}>
              <Ionicons name="search" size={16} color={C.textoTenue} style={{ marginLeft: 12 }} />
              <TextInput
                style={[styles.input, { paddingLeft: 10, color: C.texto }]}
                value={busquedaPicker}
                onChangeText={setBusquedaPicker}
                placeholder="Buscar..."
                placeholderTextColor={C.textoTenue}
                autoFocus
              />
            </View>
            <FlatList
              data={opcionesPicker}
              keyExtractor={(item) => String(item.id)}
              style={{ marginTop: 8 }}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.opcionItem, { borderBottomColor: C.borde }]}
                  onPress={() => {
                    if (pickerAbierto) actualizarCampo(pickerAbierto.campo, item.id);
                    setPickerAbierto(null);
                  }}
                >
                  <Text style={[styles.opcionText, { color: C.texto }]}>{item.nombre}</Text>
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <Text style={[styles.opcionText, { color: C.textoTenue, padding: 16 }]}>Sin resultados</Text>
              }
            />
          </View>
        </View>
      </Modal>

      {/* Resultado del envío */}
      <Modal visible={!!sheetType} animationType="fade" transparent onRequestClose={cerrarSheet}>
        <View style={styles.modalOverlay}>
          <View style={[styles.sheetCard, { backgroundColor: C.fondoCard }]}>
            {sheetType === "enviado" && (
              <>
                <Ionicons name="checkmark-circle" size={48} color={C.verde} />
                <Text style={[styles.sheetTitle, { color: C.texto }]}>¡Reporte enviado!</Text>
                <Text style={[styles.sheetSubtitle, { color: C.textoSub }]}>El reporte fue registrado correctamente.</Text>
                <TouchableOpacity style={[styles.sheetBtn, { backgroundColor: C.naranja }]} onPress={() => BackHandler.exitApp()}>
                  <Text style={[styles.sheetBtnText, { color: C.fondoCard }]}>Cerrar app</Text>
                </TouchableOpacity>
              </>
            )}
            {sheetType === "offline" && (
              <>
                <Ionicons name="cloud-offline" size={48} color={C.crema} />
                <Text style={[styles.sheetTitle, { color: C.texto }]}>Guardado sin conexión</Text>
                <Text style={[styles.sheetSubtitle, { color: C.textoSub }]}>Se enviará automáticamente cuando vuelva la conexión.</Text>
                <TouchableOpacity style={[styles.sheetBtn, { backgroundColor: C.naranja }]} onPress={cerrarSheet}>
                  <Text style={[styles.sheetBtnText, { color: C.fondoCard }]}>Entendido</Text>
                </TouchableOpacity>
              </>
            )}
            {sheetType === "error" && (
              <>
                <Ionicons name="alert-circle" size={48} color="#ff6b6b" />
                <Text style={[styles.sheetTitle, { color: C.texto }]}>Hubo un problema</Text>
                <Text style={[styles.sheetSubtitle, { color: C.textoSub }]}>{errorMsg}</Text>
                <TouchableOpacity style={[styles.sheetBtn, { backgroundColor: C.fondoInput }]} onPress={cerrarSheet}>
                  <Text style={[styles.sheetBtnText, { color: C.texto }]}>Cerrar</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </FondoDegradado>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center", padding: 32 },
  loadingText: { fontSize: 15, fontWeight: "600", marginTop: 16, textAlign: "center" },
  retryBtn: { borderRadius: 12, paddingHorizontal: 24, paddingVertical: 14, flexDirection: "row", alignItems: "center", gap: 8, marginTop: 20 },
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
  row: { flexDirection: "row" },
  tipoBtn: { alignItems: "center", justifyContent: "center", paddingVertical: 12, borderRadius: 12, borderWidth: 1.5 },
  tipoBtnText: { fontSize: 14, fontWeight: "600" },
  inputWrapper: { flexDirection: "row", alignItems: "center", borderRadius: 12, paddingHorizontal: 12, borderWidth: 1, minHeight: 48 },
  input: { flex: 1, fontSize: 15, paddingVertical: 13 },
  selectText: { flex: 1, fontSize: 15, paddingVertical: 13, paddingLeft: 2 },
  locationBox: { borderRadius: 12, padding: 14, borderWidth: 1 },
  locationText: { fontSize: 14, marginBottom: 4 },
  fotoContainer: { position: "relative", marginRight: 10 },
  miniatura: { width: 80, height: 80, borderRadius: 10 },
  fotoBorrar: { position: "absolute", top: 4, right: 4, backgroundColor: "rgba(0,0,0,0.7)", borderRadius: 10, width: 20, height: 20, alignItems: "center", justifyContent: "center" },
  addBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 12, padding: 14, borderWidth: 1.5, borderStyle: "dashed" },
  addBtnText: { fontSize: 15, fontWeight: "600" },
  submitBtn: { marginHorizontal: 20, borderRadius: 14, padding: 18, flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 10, marginTop: 8 },
  submitBtnDisabled: { opacity: 0.5 },
  submitBtnText: { fontSize: 17, fontWeight: "normal" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalCard: { borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: "75%", paddingBottom: 24, paddingTop: 16 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, marginBottom: 12 },
  modalTitle: { fontSize: 18, fontWeight: "normal" },
  opcionItem: { paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1 },
  opcionText: { fontSize: 15 },
  sheetCard: { borderTopLeftRadius: 24, borderTopRightRadius: 24, alignItems: "center", padding: 28, paddingBottom: 40 },
  sheetTitle: { fontSize: 22, fontWeight: "normal", marginTop: 12, marginBottom: 8, textAlign: "center" },
  sheetSubtitle: { fontSize: 14, textAlign: "center", lineHeight: 22, marginBottom: 24 },
  sheetBtn: { borderRadius: 12, paddingHorizontal: 32, paddingVertical: 14 },
  sheetBtnText: { fontSize: 16, fontWeight: "normal" },
});
