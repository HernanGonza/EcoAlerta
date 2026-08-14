import { Text, TextInput } from 'react-native'

// React 19 eliminó el soporte de `defaultProps` en componentes función, así que
// no alcanza con Text.defaultProps para fijar una fuente global (no hace nada).
// En cambio, parcheamos el runtime de JSX (lo que Babel usa realmente detrás de
// cada <Text>/<TextInput>) para inyectar la fuente por defecto ahí, algo que
// funciona sin importar la versión de React.
//
// Oak Sans viene en archivos .ttf separados por peso (Regular, Medium, SemiBold,
// Bold, ExtraBold) — un fontWeight numérico no selecciona entre ellos solo. Si
// dejáramos fontWeight:'700' con fontFamily:'OakSans-Regular', el SO le agrega
// una negrita falsa encima del trazo ya diseñado, y se ve mucho más grueso que
// el logo. Por eso mapeamos el peso al archivo correcto y reseteamos fontWeight.
const MAPA_PESO: Record<string, string> = {
  '100': 'OakSans-Light',
  '200': 'OakSans-Light',
  '300': 'OakSans-Light',
  '400': 'OakSans-Regular',
  normal: 'OakSans-Regular',
  '500': 'OakSans-Medium',
  '600': 'OakSans-SemiBold',
  '700': 'OakSans-Bold',
  bold: 'OakSans-Bold',
  '800': 'OakSans-ExtraBold',
  '900': 'OakSans-ExtraBold',
}

function aplanarEstilo(style: any, acc: Record<string, any> = {}): Record<string, any> {
  if (!style) return acc
  if (Array.isArray(style)) {
    for (const s of style) aplanarEstilo(s, acc)
    return acc
  }
  if (typeof style === 'object') Object.assign(acc, style)
  return acc
}

function envolverProps(props: any) {
  if (!props || typeof props !== 'object') return props
  const plano = aplanarEstilo(props.style)
  // Si ya trae una fuente explícita (p.ej. el glifo de un ícono) no la tocamos.
  if (plano.fontFamily) return props
  const familia = MAPA_PESO[String(plano.fontWeight ?? 'normal')] ?? 'OakSans-Regular'
  return {
    ...props,
    style: [props.style, { fontFamily: familia, fontWeight: 'normal' }],
  }
}

function parchearRuntime(mod: any, claves: string[]) {
  if (!mod) return
  for (const clave of claves) {
    const original = mod[clave]
    if (typeof original !== 'function' || original.__oakPatched) continue
    const parcheada = function (this: unknown, tipo: any, props: any, ...resto: any[]) {
      if (tipo === Text || tipo === TextInput) {
        props = envolverProps(props)
      }
      return original.call(this, tipo, props, ...resto)
    }
    parcheada.__oakPatched = true
    mod[clave] = parcheada
  }
}

try {
  parchearRuntime(require('react/jsx-runtime'), ['jsx', 'jsxs'])
} catch {
  // ignorar si el runtime no está disponible en este entorno
}

try {
  parchearRuntime(require('react/jsx-dev-runtime'), ['jsxDEV'])
} catch {
  // ignorar: jsx-dev-runtime solo existe en desarrollo
}
