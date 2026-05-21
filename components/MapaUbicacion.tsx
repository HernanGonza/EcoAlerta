import { View, StyleSheet } from 'react-native'
import { WebView } from 'react-native-webview'
import { useRef } from 'react'

interface Props {
  latitud: number
  longitud: number
  onCoordsChange?: (lat: number, lng: number) => void
  onDragStart?: () => void
  onDragEnd?: () => void
}

export default function MapaUbicacion({ latitud, longitud, onCoordsChange, onDragStart, onDragEnd }: Props) {
  const webviewRef = useRef<WebView>(null)

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        #map { width: 100%; height: 100vh; }
        #hint {
          position: absolute;
          bottom: 10px;
          left: 50%;
          transform: translateX(-50%);
          background: rgba(0,0,0,0.65);
          color: #B5B682;
          font-size: 11px;
          padding: 5px 12px;
          border-radius: 10px;
          z-index: 1000;
          white-space: nowrap;
          font-family: sans-serif;
          pointer-events: none;
        }
      </style>
    </head>
    <body>
      <div id="map"></div>
      <div id="hint">Mantené presionado el pin para moverlo</div>
      <script>
        const map = L.map('map', {
          zoomControl: true,
          attributionControl: false,
          dragging: false,
          touchZoom: false,
          scrollWheelZoom: false,
          doubleClickZoom: false,
          boxZoom: false,
        }).setView([${latitud}, ${longitud}], 15);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

        const iconNormal = L.divIcon({
          html: '<div id="pin-dot" style="width:22px;height:22px;background:#FF751F;border-radius:50%;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.5);transition:all 0.15s ease"></div>',
          iconSize: [22, 22],
          iconAnchor: [11, 11],
          className: ''
        });

        const marker = L.marker([${latitud}, ${longitud}], {
          icon: iconNormal,
          draggable: false,
          interactive: true,
        }).addTo(map);

        let longPressTimer = null;
        let dragActive = false;

        const markerEl = marker.getElement();

        markerEl.addEventListener('touchstart', function(e) {
          e.stopPropagation();
          longPressTimer = setTimeout(function() {
            dragActive = true;
            markerEl.querySelector('div').style.transform = 'scale(1.8)';
            markerEl.querySelector('div').style.background = '#FF9A4D';
            markerEl.querySelector('div').style.boxShadow = '0 4px 16px rgba(255,119,31,0.6)';
            document.getElementById('hint').style.display = 'none';
            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'dragstart' }));
          }, 500);
        }, { passive: true });

        markerEl.addEventListener('touchend', function(e) {
          clearTimeout(longPressTimer);
          if (dragActive) {
            dragActive = false;
            markerEl.querySelector('div').style.transform = 'scale(1)';
            markerEl.querySelector('div').style.background = '#FF751F';
            markerEl.querySelector('div').style.boxShadow = '0 2px 8px rgba(0,0,0,0.5)';
            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'dragend' }));
          }
        }, { passive: true });

        markerEl.addEventListener('touchmove', function(e) {
          if (!dragActive) {
            clearTimeout(longPressTimer);
            return;
          }
          e.stopPropagation();

          const touch = e.touches[0];
          const mapContainer = document.getElementById('map');
          const rect = mapContainer.getBoundingClientRect();

          const x = touch.clientX - rect.left;
          const y = touch.clientY - rect.top;

          const latlng = map.containerPointToLatLng([x, y]);
          marker.setLatLng(latlng);

          const lat = parseFloat(latlng.lat.toFixed(6));
          const lng = parseFloat(latlng.lng.toFixed(6));
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'move', lat, lng }));

          const margin = 40;
          const panSpeed = 5;
          let panX = 0;
          let panY = 0;

          if (x < margin) panX = -panSpeed;
          else if (x > rect.width - margin) panX = panSpeed;

          if (y < margin) panY = -panSpeed;
          else if (y > rect.height - margin) panY = panSpeed;

          if (panX !== 0 || panY !== 0) {
            map.panBy([panX, panY], { animate: false });
          }
        }, { passive: true });
      </script>
    </body>
    </html>
  `

  const handleMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data)
      if (data.type === 'dragstart') {
        onDragStart?.()
      } else if (data.type === 'dragend') {
        onDragEnd?.()
      } else if (data.type === 'move') {
        onCoordsChange?.(data.lat, data.lng)
      }
    } catch (e) {}
  }

  return (
    <View style={styles.container}>
      <WebView
        ref={webviewRef}
        source={{ html }}
        style={styles.map}
        scrollEnabled={false}
        originWhitelist={['*']}
        onMessage={handleMessage}
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