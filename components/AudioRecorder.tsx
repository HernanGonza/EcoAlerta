import { useState, useRef } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native'
import { useAudioRecorder, useAudioPlayer, AudioModule, RecordingPresets } from 'expo-audio'
import { Ionicons } from '@expo/vector-icons'

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

interface Props {
  audios: string[]
  onAdd: (uri: string) => void
  onRemove: (index: number) => void
}

export default function AudioRecorder({ audios, onAdd, onRemove }: Props) {
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
      // Detectar cuando termina
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
        <View key={index} style={styles.audioItem}>
          <View style={styles.audioIcon}>
            <Ionicons name="mic" size={18} color={C.naranja} />
          </View>
          <TouchableOpacity style={styles.playBtn} onPress={() => playAudio(uri, index)}>
            <Ionicons
              name={playingIndex === index ? 'pause-circle' : 'play-circle'}
              size={28}
              color={C.verde}
            />
            <Text style={styles.playBtnText}>
              {playingIndex === index ? 'Reproduciendo...' : `Nota de voz ${index + 1}`}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.deleteBtn} onPress={() => onRemove(index)}>
            <Ionicons name="trash-outline" size={18} color="#ff6b6b" />
          </TouchableOpacity>
        </View>
      ))}

      <TouchableOpacity
        style={[styles.recordBtn, isRecording && styles.recordBtnActive]}
        onPress={isRecording ? stopRecording : startRecording}
      >
        <View style={[styles.recordIconCircle, isRecording && styles.recordIconCircleActive]}>
          <Ionicons
            name={isRecording ? 'stop' : 'mic'}
            size={28}
            color={isRecording ? '#fff' : C.naranja}
          />
        </View>
        <View>
          <Text style={styles.recordBtnTitle}>
            {isRecording ? 'Grabando...' : 'Grabar nota de voz'}
          </Text>
          <Text style={styles.recordBtnSub}>
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
    backgroundColor: C.carbon, borderRadius: 12,
    padding: 12, marginBottom: 10,
    borderWidth: 1, borderColor: C.carbonLight,
  },
  audioIcon: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: C.carbonLight,
    justifyContent: 'center', alignItems: 'center',
    marginRight: 10,
  },
  playBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  playBtnText: { color: '#fff', fontSize: 14, fontWeight: '500' },
  deleteBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: C.carbonLight,
    justifyContent: 'center', alignItems: 'center',
  },
  recordBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 16,
    backgroundColor: C.carbon, borderRadius: 14,
    padding: 18, borderWidth: 1.5,
    borderColor: C.naranja, borderStyle: 'dashed',
  },
  recordBtnActive: {
    borderStyle: 'solid', borderColor: '#ff4444',
    backgroundColor: '#2a1a1a',
  },
  recordIconCircle: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: C.carbonLight,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: C.naranja,
  },
  recordIconCircleActive: {
    backgroundColor: '#ff4444', borderColor: '#ff4444',
  },
  recordBtnTitle: { color: '#fff', fontSize: 16, fontWeight: '700' },
  recordBtnSub: { color: C.oliva, fontSize: 12, marginTop: 2 },
  recordingDot: {
    width: 10, height: 10, borderRadius: 5,
    backgroundColor: '#ff4444',
    position: 'absolute', top: 12, right: 12,
  },
})