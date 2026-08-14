import { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Modal } from "react-native";
import DateTimePickerNativo, { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import DateTimePickerCalendario, { useDefaultStyles } from "react-native-ui-datepicker";
import dayjs from "dayjs";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../hooks/useTheme";

interface Props {
  modo: "date" | "time";
  valor: string | null | undefined;
  onChange: (valor: string) => void;
  placeholder?: string;
}

function formatearFecha(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatearHora(d: Date): string {
  const h = String(d.getHours()).padStart(2, "0");
  const m = String(d.getMinutes()).padStart(2, "0");
  const s = String(d.getSeconds()).padStart(2, "0");
  return `${h}:${m}:${s}`;
}

function parsearValor(valor: string | null | undefined, modo: "date" | "time"): Date {
  const base = new Date();
  if (!valor) return base;
  if (modo === "date") {
    const [y, m, d] = valor.split("-").map(Number);
    if (y && m && d) return new Date(y, m - 1, d);
    return base;
  }
  const [h, m, s] = valor.split(":").map(Number);
  base.setHours(h || 0, m || 0, s || 0, 0);
  return base;
}

export default function SelectorFechaHora({ modo, valor, onChange, placeholder }: Props) {
  const { colores: C } = useTheme();
  const defaultStyles = useDefaultStyles();
  const [abierto, setAbierto] = useState(false);
  const [temporal, setTemporal] = useState<Date>(() => parsearValor(valor, modo));

  const abrir = () => {
    setTemporal(parsearValor(valor, modo));
    setAbierto(true);
  };

  const confirmar = () => {
    onChange(modo === "date" ? formatearFecha(temporal) : formatearHora(temporal));
    setAbierto(false);
  };

  const onChangeHora = (_event: DateTimePickerEvent, seleccionada?: Date) => {
    if (seleccionada) setTemporal(seleccionada);
  };

  return (
    <>
      <TouchableOpacity
        style={[styles.inputWrapper, { backgroundColor: C.fondoCard, borderColor: C.borde }]}
        onPress={abrir}
      >
        <Ionicons name={modo === "date" ? "calendar-outline" : "time-outline"} size={16} color={C.verde} style={{ marginRight: 8 }} />
        <Text style={{ flex: 1, fontSize: 15, color: valor ? C.texto : C.textoTenue }}>
          {valor || placeholder || (modo === "date" ? "Seleccionar fecha" : "Seleccionar hora")}
        </Text>
      </TouchableOpacity>

      <Modal visible={abierto} animationType="slide" transparent onRequestClose={() => setAbierto(false)}>
        <View style={styles.overlay}>
          <View style={[styles.card, { backgroundColor: C.fondoCard }]}>
            {modo === "date" ? (
              <DateTimePickerCalendario
                mode="single"
                date={dayjs(temporal)}
                onChange={({ date }) => date && setTemporal(dayjs(date).toDate())}
                styles={{
                  ...defaultStyles,
                  today: { borderColor: C.fondoInput, borderWidth: 1 },
                  selected: { backgroundColor: C.fondoInput },
                  selected_label: { color: "#fff" },
                  header: { ...defaultStyles.header, backgroundColor: "transparent" },
                  day_label: { color: C.texto },
                  weekday_label: { color: C.textoSub },
                  month_selector_label: { color: C.texto },
                  year_selector_label: { color: C.texto },
                }}
              />
            ) : (
              <DateTimePickerNativo value={temporal} mode="time" display="spinner" onChange={onChangeHora} />
            )}
            <TouchableOpacity style={[styles.confirmBtn, { backgroundColor: C.naranja }]} onPress={confirmar}>
              <Text style={styles.confirmBtnText}>Confirmar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  inputWrapper: { flexDirection: "row", alignItems: "center", borderRadius: 12, paddingHorizontal: 12, borderWidth: 1, minHeight: 48 },
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  card: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 16, paddingBottom: 32 },
  confirmBtn: { borderRadius: 12, padding: 14, alignItems: "center", marginTop: 8 },
  confirmBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
