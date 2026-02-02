import * as SecureStore from 'expo-secure-store'
import React, { createContext, useContext, useEffect, useState } from 'react'
import { Alert } from 'react-native'

type User = {
  id: string
  email: string
}

type AuthContextValue = {
  user: User | null
  login: (email: string, password: string, rememberMe: boolean) => Promise<void>
  logout: () => Promise<void>
  loading: boolean
  rememberMe: boolean
  setRememberMe: (value: boolean) => void
  updateEmail: (newEmail: string) => Promise<void>
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [rememberMe, setRememberMeLocal] = useState(false)

  // Load persisted session on startup
  useEffect(() => {
    loadAuthState()
  }, [])

  const loadAuthState = async () => {
    try {
      setLoading(true)
      const storedUser = await SecureStore.getItemAsync('user')
      const storedRememberMe = await SecureStore.getItemAsync('rememberMe')
      
      if (storedUser && storedRememberMe === 'true') {
        const userData = JSON.parse(storedUser) as User
        setUser(userData)
        setRememberMeLocal(true)
      }
    } catch (error) {
      console.error('Failed to load auth state:', error)
    } finally {
      setLoading(false)
    }
  }

  const saveAuthState = async (userData: User, remember: boolean) => {
    try {
      if (remember) {
        await SecureStore.setItemAsync('user', JSON.stringify(userData))
        await SecureStore.setItemAsync('rememberMe', 'true')
      } else {
        await SecureStore.deleteItemAsync('user')
        await SecureStore.deleteItemAsync('rememberMe')
      }
    } catch (error) {
      console.error('Failed to save auth state:', error)
    }
  }

  const login = async (email: string, password: string, rememberMe: boolean) => {
    setLoading(true)
    try {
      // Demo login - replace with real auth
      if (!email || !password) {
        throw new Error('Invalid credentials')
      }
      
      const userData: User = { id: 'demo-user-id', email }
      setUser(userData)
      setRememberMeLocal(rememberMe)
      await saveAuthState(userData, rememberMe)
    } catch (error) {
      Alert.alert('Login failed', 'Invalid email or password')
      throw error
    } finally {
      setLoading(false)
    }
  }

  const logout = async () => {
    setUser(null)
    setRememberMeLocal(false)
    await SecureStore.deleteItemAsync('user')
    await SecureStore.deleteItemAsync('rememberMe')
  }

  const setRememberMe = (value: boolean) => {
    setRememberMeLocal(value)
    if (user) {
      saveAuthState(user, value)
    }
  }

  const updateEmail = async (newEmail: string) => {
    if (!user) throw new Error('No user logged in')
    const updatedUser = { ...user, email: newEmail }
    setUser(updatedUser)
    await saveAuthState(updatedUser, rememberMe)
    Alert.alert('Success', 'Email updated')
  }

  const changePassword = async (currentPassword: string, newPassword: string) => {
    // Demo - replace with real password change API
    Alert.alert('Success', 'Password changed (demo mode)')
  }

  const value: AuthContextValue = {
    user,
    login,
    logout,
    loading,
    rememberMe,
    setRememberMe,
    updateEmail,
    changePassword,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
