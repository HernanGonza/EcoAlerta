import { ReactNode } from "react";
import { StyleSheet, StyleProp, ViewStyle, View, Image } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { useTheme } from "../hooks/useTheme";

interface Props {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}

// Mismo efecto "glass" del header de ecologia.misiones.gob.ar: foto de fondo,
// blur(10px) y un degradado institucional al 65% de opacidad encima
// (rgba(62,108,81,0.65) -> rgba(75,150,85,0.65), tomado de su CSS).
// Solo en el tema oscuro (verde, de día): el tema claro existe para que un
// agente en el campo de noche tenga una pantalla bien clara y legible, así
// que ahí no metemos foto ni blur, se mantiene sólido.
//
// Todo va dentro de un contenedor con position:'relative' + overflow:'hidden':
// sin esto, el Image absoluto no tiene respecto a qué posicionarse y termina
// desbordando el viewport (aparecía scroll horizontal y un hueco blanco abajo).
export default function FondoDegradado({ children, style }: Props) {
  const { tema, colores: C } = useTheme();
  const conFoto = tema === 'oscuro'

  return (
    <View style={styles.outer}>
      {conFoto && (
        <>
          <Image
            source={require('../assets/images/lapacho-rosado-flor1.jpg')}
            style={styles.fotoFondo}
            resizeMode="cover"
          />
          <BlurView intensity={35} tint="dark" style={styles.fotoFondo} />
        </>
      )}
      <LinearGradient
        colors={conFoto ? C.fondoGradienteGlass : C.fondoGradiente}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.flex, style]}
      >
        {children}
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: { flex: 1, position: 'relative', overflow: 'hidden' },
  flex: { flex: 1 },
  fotoFondo: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%' },
});
