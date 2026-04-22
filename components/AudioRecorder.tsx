import { useState, useRef } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native'
import { Audio } from 'expo-av'

interface Props {
  audios: string[]
  onAdd: (uri: string) => void
  onRemove: (index: number) => void
}

export default function AudioRecorder({ audios, onAdd, onRemove }: Props) {
  const [recording, setRecording] = useState<Audio.Recording | null>(null)
  const [isRecording, setIsRecording] = useState(false)
  const [playingIndex, setPlayingIndex] = useState<number | null>(null)
  const soundRef = useRef<Audio.Sound | null>(null)

  const startRecording = async () => {
    try {
      const { granted } = await Audio.requestPermissionsAsync()
      if (!granted) {
        Alert.alert('Error', 'Se necesita permiso para usar el micrófono')
        return
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      })

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      )
      setRecording(recording)
      setIsRecording(true)
    } catch (e) {
      Alert.alert('Error', 'No se pudo iniciar la grabación')
    }
  }

  const stopRecording = async () => {
    if (!recording) return
    try {
      await recording.stopAndUnloadAsync()
      const uri = recording.getURI()
      if (uri) onAdd(uri)
      setRecording(null)
      setIsRecording(false)
    } catch (e) {
      Alert.alert('Error', 'No se pudo detener la grabación')
    }
  }

  const playAudio = async (uri: string, index: number) => {
    try {
      if (soundRef.current) {
        await soundRef.current.unloadAsync()
        soundRef.current = null
      }

      if (playingIndex === index) {
        setPlayingIndex(null)
        return
      }

      const { sound } = await Audio.Sound.createAsync({ uri })
      soundRef.current = sound
      setPlayingIndex(index)
      await sound.playAsync()
      sound.setOnPlaybackStatusUpdate(status => {
        if (status.isLoaded && status.didJustFinish) {
          setPlayingIndex(null)
        }
      })
    } catch (e) {
      Alert.alert('Error', 'No se pudo reproducir el audio')
    }
  }

  return (
    <View>
      {audios.map((uri, index) => (
        <View key={index} style={styles.audioItem}>
          <TouchableOpacity
            style={styles.playBtn}
            onPress={() => playAudio(uri, index)}
          >
            <Text style={styles.playBtnText}>
              {playingIndex === index ? '⏹ Detener' : '▶ Nota ' + (index + 1)}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.deleteBtn}
            onPress={() => onRemove(index)}
          >
            <Text style={styles.deleteBtnText}>✕</Text>
          </TouchableOpacity>
        </View>
      ))}

      <TouchableOpacity
        style={[styles.recordBtn, isRecording && styles.recordBtnActive]}
        onPress={isRecording ? stopRecording : startRecording}
      >
        <Text style={styles.recordBtnText}>
          {isRecording ? '⏹ Detener grabación' : '🎙 Grabar nota de voz'}
        </Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  audioItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  playBtn: {
    flex: 1, backgroundColor: '#2a2a2a', borderRadius: 8,
    padding: 12, marginRight: 8,
  },
  playBtnText: { color: '#ccc', fontSize: 14 },
  deleteBtn: {
    backgroundColor: '#3a2a2a', borderRadius: 8,
    padding: 12, alignItems: 'center', justifyContent: 'center',
  },
  deleteBtnText: { color: '#ff6b6b', fontSize: 14 },
  recordBtn: {
    backgroundColor: '#2a2a2a', borderRadius: 8,
    padding: 12, alignItems: 'center',
    borderWidth: 1, borderColor: '#444', borderStyle: 'dashed',
  },
  recordBtnActive: { borderColor: '#ff4444', backgroundColor: '#3a2020' },
  recordBtnText: { color: '#2d7a3a', fontSize: 15 },
})