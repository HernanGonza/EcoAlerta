import { Stack } from 'expo-router'
import { AuthProvider } from '../lib/authContext'
import { useSync } from '../hooks/useSync'

function SyncManager({ children }: { children: React.ReactNode }) {
  useSync()
  return <>{children}</>
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <SyncManager>
        <Stack screenOptions={{ headerShown: false }} />
      </SyncManager>
    </AuthProvider>
  )
}
