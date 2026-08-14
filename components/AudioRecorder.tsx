import { useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native'
import { useAudioRecorder, useAudioPlayer, AudioModule, RecordingPresets } from 'expo-audio'
import { Ionicons } from '@expo/vector-icons'
import { useTheme } from '../hooks/useTheme'

interface Props {
  audios: string[]
  onAdd: (uri: string) => void
  onRemove: (index: number) => void
}

export default function AudioRecorder({ audios, onAdd, onRemove }: Props) {
  const { colores: C } = useTheme()
  const [isRecording, setIsRecording] = useState(false)
  const [playingIndex, setPlayingIndex] = useState<number | null>(null)
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY)
  const player = useAudioPlayer('')

  const startRecording = async () => {
    try {
      const status = await AudioModule.requestRecordingPermissionsAsync()
      if (!status.granted) {
        Alert.alert('Permiso denegado', 'Se necesita permiso para usar el micrófono')
        return
      }
      await recorder.prepareToRecordAsync()
      recorder.record()
      setIsRecording(true)
    } catch (e) {
      Alert.alert('Error', 'No se pudo iniciar la grabación')
    }
  }

  const stopRecording = async () => {
    try {
      await recorder.stop()
      const uri = recorder.uri
      if (uri) onAdd(uri)
      setIsRecording(false)
    } catch (e) {
      Alert.alert('Error', 'No se pudo detener la grabación')
    }
  }

  const playAudio = async (uri: string, index: number) => {
    try {
      if (playingIndex === index) {
        player.pause()
        setPlayingIndex(null)
        return
      }
      player.replace({ uri })
      player.play()
      setPlayingIndex(index)
      const interval = setInterval(() => {
        if (player.currentTime >= player.duration && player.duration > 0) {
          setPlayingIndex(null)
          clearInterval(interval)
        }
      }, 500)
    } catch (e) {
      Alert.alert('Error', 'No se pudo reproducir el audio')
    }
  }

  return (
    <View>
      {audios.map((uri, index) => (
        <View key={index} style={[styles.audioItem, { backgroundColor: C.fondoCard, borderColor: C.borde }]}>
          <View style={[styles.audioIcon, { backgroundColor: C.fondoInput }]}>
            <Ionicons name="mic" size={18} color={C.naranja} />
          </View>
          <TouchableOpacity style={styles.playBtn} onPress={() => playAudio(uri, index)}>
            <Ionicons
              name={playingIndex === index ? 'pause-circle' : 'play-circle'}
              size={28}
              color={C.verde}
            />
            <Text style={[styles.playBtnText, { color: C.texto }]}>
              {playingIndex === index ? 'Reproduciendo...' : `Nota de voz ${index + 1}`}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.deleteBtn, { backgroundColor: C.fondoInput }]} onPress={() => onRemove(index)}>
            <Ionicons name="trash-outline" size={18} color="#ff6b6b" />
          </TouchableOpacity>
        </View>
      ))}

      <TouchableOpacity
        style={[
          styles.recordBtn,
          { backgroundColor: C.fondoCard, borderColor: C.naranja },
          isRecording && styles.recordBtnActive,
        ]}
        onPress={isRecording ? stopRecording : startRecording}
      >
        <View style={[
          styles.recordIconCircle,
          { backgroundColor: C.fondoInput, borderColor: C.naranja },
          isRecording && styles.recordIconCircleActive,
        ]}>
          <Ionicons
            name={isRecording ? 'stop' : 'mic'}
            size={28}
            color={isRecording ? '#fff' : C.naranja}
          />
        </View>
        <View>
          <Text style={[styles.recordBtnTitle, { color: C.texto }]}>
            {isRecording ? 'Grabando...' : 'Grabar nota de voz'}
          </Text>
          <Text style={[styles.recordBtnSub, { color: C.textoSub }]}>
            {isRecording ? 'Tocá para detener' : 'Tocá para comenzar'}
          </Text>
        </View>
        {isRecording && <View style={styles.recordingDot} />}
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  audioItem: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 12, padding: 12, marginBottom: 10,
    borderWidth: 1,
  },
  audioIcon: {
    width: 36, height: 36, borderRadius: 18,
    justifyContent: 'center', alignItems: 'center',
    marginRight: 10,
  },
  playBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  playBtnText: { fontSize: 14, fontWeight: '500' },
  deleteBtn: {
    width: 36, height: 36, borderRadius: 18,
    justifyContent: 'center', alignItems: 'center',
  },
  recordBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 16,
    borderRadius: 14, padding: 18, borderWidth: 1.5,
    borderStyle: 'dashed',
  },
  recordBtnActive: {
    borderStyle: 'solid', borderColor: '#ff4444',
    backgroundColor: '#2a1a1a',
  },
  recordIconCircle: {
    width: 56, height: 56, borderRadius: 28,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2,
  },
  recordIconCircleActive: {
    backgroundColor: '#ff4444', borderColor: '#ff4444',
  },
  recordBtnTitle: { fontSize: 16, fontWeight: 'normal' },
  recordBtnSub: { fontSize: 12, marginTop: 2 },
  recordingDot: {
    width: 10, height: 10, borderRadius: 5,
    backgroundColor: '#ff4444',
    position: 'absolute', top: 12, right: 12,
  },
})