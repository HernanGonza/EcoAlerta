import { useState, useEffect } from 'react'

export type Tema = 'oscuro' | 'claro'

// De 7 a 19hs (horario en que suele haber más luz ambiente) usamos el tema
// oscuro; de noche pasamos al tema claro, porque un agente en el campo sin luz
// ve mejor una pantalla clara y brillante que una oscura.
const esHoraDia = () => {
  const hora = new Date().getHours()
  return hora >= 7 && hora < 19
}

export const temas = {
  oscuro: {
    fondo: '#2C4A3A',
    // Gradiente oficial del Ministerio de Ecología de Misiones (ecologia.misiones.gob.ar)
    fondoGradiente: ['#3E6C51', '#4B9655'] as const,
    // Mismo gradiente al 65% de opacidad, tal cual el efecto "glass" del header
    // del sitio del ministerio (--primary-degrade/--secondary-degrade)
    fondoGradienteGlass: ['rgba(62,108,81,0.88)', 'rgba(75,150,85,0.88)'] as const,
    fondoCard: '#2C4A3A',
    fondoInput: '#345745',
    fondoMid: '#30503F',
    texto: '#ffffff',
    textoSub: '#A9CBB4',
    textoTenue: '#7D9A8B',
    // Dorado cálido: acento con contraste sobre las tarjetas verde oscuro
    naranja: '#E6E18F',
    verde: '#7C9885',
    oliva: '#EADDA6',
    crema: '#FEFCAD',
    borde: '#3C6350',
    offlineBg: '#5a3a1a',
    statusBar: 'light-content' as const,
  },
  claro: {
    fondo: '#F5F3EE',
    fondoGradiente: ['#F5F3EE', '#F5F3EE'] as const,
    // No se usa (el tema claro no lleva foto de fondo), definido solo para que
    // el tipo coincida con el tema oscuro
    fondoGradienteGlass: ['#F5F3EE', '#F5F3EE'] as const,
    fondoCard: '#FFFFFF',
    fondoInput: '#ECEAE4',
    fondoMid: '#E5E3DC',
    texto: '#26362E',
    textoSub: '#4B6459',
    textoTenue: '#999999',
    // Verde institucional sólido: así son los botones primarios en el sitio del ministerio
    naranja: '#458153',
    verde: '#5a7a65',
    oliva: '#4B6459',
    crema: '#8a7a00',
    borde: '#D8D6CE',
    offlineBg: '#f0d8c0',
    statusBar: 'dark-content' as const,
  },
}

export function useTheme() {
  const [tema, setTema] = useState<Tema>(esHoraDia() ? 'oscuro' : 'claro')

  useEffect(() => {
    // Revisar cada minuto si cambió la hora
    const interval = setInterval(() => {
      const nuevoTema = esHoraDia() ? 'oscuro' : 'claro'
      setTema(prev => prev !== nuevoTema ? nuevoTema : prev)
    }, 60000)

    return () => clearInterval(interval)
  }, [])

  return { tema, colores: temas[tema] }
}