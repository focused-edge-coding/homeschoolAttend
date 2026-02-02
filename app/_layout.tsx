import { Stack, usePathname, useRouter } from 'expo-router'
import React, { useEffect } from 'react'
import { ActivityIndicator, View } from 'react-native'
import { AuthProvider, useAuth } from '../Contexts/Auth'

// Loading screen component
function LoadingScreen() {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#145C63' }}>
      <ActivityIndicator size="large" color="#fff" />
    </View>
  )
}

// Root navigator with auth logic
function RootNavigator() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  // Redirect logic
  useEffect(() => {
    if (loading) return // Wait for auth to load
    
    if (!user && pathname !== '/login') {
      router.replace('/login')
    } else if (user && pathname === '/login') {
      router.replace('/(tabs)/students')
    }
  }, [user, loading, pathname, router])

  if (loading) {
    return <LoadingScreen />
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="login" />
      <Stack.Screen name="(tabs)" />
    </Stack>
  )
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootNavigator />
    </AuthProvider>
  )
}
