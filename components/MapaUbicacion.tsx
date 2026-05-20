import { View, StyleSheet } from 'react-native'
import { WebView } from 'react-native-webview'

interface Props {
  latitud: number
  longitud: number
}

export default function MapaUbicacion({ latitud, longitud }: Props) {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        #map { width: 100%; height: 100vh; }
      </style>
    </head>
    <body>
      <div id="map"></div>
      <script>
        const map = L.map('map', { zoomControl: true, attributionControl: false })
          .setView([${latitud}, ${longitud}], 15);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

        const icon = L.divIcon({
          html: '<div style="width:20px;height:20px;background:#FF751F;border-radius:50%;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.5)"></div>',
          iconSize: [20, 20],
          iconAnchor: [10, 10],
          className: ''
        });

        L.marker([${latitud}, ${longitud}], { icon }).addTo(map);
      </script>
    </body>
    </html>
  `

  return (
    <View style={styles.container}>
      <WebView
        source={{ html }}
        style={styles.map}
        scrollEnabled={false}
        originWhitelist={['*']}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    height: 200,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#4a4d40',
  },
  map: {
    flex: 1,
  },
})