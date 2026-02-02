import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import React, { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { useAuth } from '../Contexts/Auth'

export default function Login() {
  const { login, loading, user, rememberMe, setRememberMe } = useAuth()
  const router = useRouter()
  const [email, setEmail] = useState('parent@example.com')
  const [password, setPassword] = useState('password123')
  const [localRememberMe, setLocalRememberMe] = useState(rememberMe)

  useEffect(() => {
    if (user) {
      router.replace('/(tabs)/students')
    }
  }, [user, router])

  const handleLogin = async () => {
    try {
      await login(email.trim(), password, localRememberMe)
    } catch (error) {
      Alert.alert('Login failed', 'Invalid credentials')
    }
  }

  const handleDemoLogin = () => {
    setEmail('parent@example.com')
    setPassword('password123')
    setLocalRememberMe(true)
    handleLogin()
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.card}>
        <Ionicons name="school-outline" size={64} color="#145C63" style={styles.logo} />
        <Text style={styles.title}>Homeschool Tracker</Text>
        <Text style={styles.subtitle}>Track attendance & generate reports</Text>

        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder="parent@example.com"
          placeholderTextColor="#9CA3AF"
        />

        <Text style={styles.label}>Password</Text>
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholder="Enter password"
          placeholderTextColor="#9CA3AF"
        />

        <View style={styles.rememberRow}>
          <Switch
            value={localRememberMe}
            onValueChange={setLocalRememberMe}
            trackColor={{ false: '#E5E7EB', true: '#145C63' }}
            thumbColor={localRememberMe ? '#fff' : '#F3F4F6'}
          />
          <Text style={styles.rememberText}>Remember me</Text>
        </View>

        <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Sign In</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.demoButton} onPress={handleDemoLogin} disabled={loading}>
          <Text style={styles.demoButtonText}>🚀 Quick Demo</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#145C63',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: '#F9FAFB',
    padding: 32,
    borderRadius: 20,
    width: '100%',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
  },
  logo: {
    alignSelf: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1F2933',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 32,
    textAlign: 'center',
  },
  label: {
    fontSize: 16,
    color: '#1F2933',
    marginBottom: 8,
    fontWeight: '500',
  },
  input: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    fontSize: 16,
    color: '#1F2933',
  },
  rememberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  rememberText: {
    marginLeft: 12,
    fontSize: 16,
    color: '#1F2933',
    fontWeight: '500',
  },
  button: {
    backgroundColor: '#145C63',
    paddingVertical: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  demoButton: {
    backgroundColor: '#10B981',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  demoButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
})
