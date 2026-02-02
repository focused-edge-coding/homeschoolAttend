import { useRouter } from 'expo-router'
import { useEffect } from 'react'
import { Text, View } from 'react-native'
import { useAuth } from '../Contexts/Auth'

export default function Index() {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && user) {
      router.replace('/(tabs)/students')
    } else if (!loading) {
      router.replace('/login')
    }
  }, [user, loading, router])

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#145C63' }}>
        <Text style={{ color: 'white', fontSize: 18 }}>Loading...</Text>
      </View>
    )
  }

  return null // Will redirect immediately
}
