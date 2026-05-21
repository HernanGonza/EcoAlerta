import { useState, useEffect } from 'react'

export type Tema = 'oscuro' | 'claro'

const esHoraDia = () => {
  const hora = new Date().getHours()
  return hora >= 6 && hora < 18
}

export const temas = {
  oscuro: {
    fondo: '#2a2c24',
    fondoCard: '#36382E',
    fondoInput: '#4a4d40',
    fondoMid: '#3d3f36',
    texto: '#ffffff',
    textoSub: '#B5B682',
    textoTenue: '#666666',
    naranja: '#FF751F',
    verde: '#7C9885',
    oliva: '#B5B682',
    crema: '#FFEE93',
    borde: '#4a4d40',
    offlineBg: '#5a3a1a',
    statusBar: 'light-content' as const,
  },
  claro: {
    fondo: '#F5F3EE',
    fondoCard: '#FFFFFF',
    fondoInput: '#ECEAE4',
    fondoMid: '#E5E3DC',
    texto: '#2a2c24',
    textoSub: '#5a5c4e',
    textoTenue: '#999999',
    naranja: '#FF751F',
    verde: '#5a7a65',
    oliva: '#6b6d4a',
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