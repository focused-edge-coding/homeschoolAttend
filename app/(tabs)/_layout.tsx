import { Ionicons } from '@expo/vector-icons'
import { Tabs } from 'expo-router'
import React, { useEffect } from 'react'
import { useAuth } from '../../Contexts/Auth'
import { initDatabase } from '../../services/database'

export default function TabsLayout() {
  const { logout } = useAuth()

  useEffect(() => {
    initDatabase().catch(console.error)
  }, [])

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#145C63',
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarStyle: {
          height: 64,
          paddingBottom: 4,
          paddingTop: 6,
          borderTopWidth: 0,
        },
      }}
    >
      <Tabs.Screen
        name="students"
        options={{
          title: 'Students',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="people-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="attendance"
        options={{
          title: 'Attendance',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="calendar-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="documents"
        options={{
          title: 'Documents',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="document-text-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
        title: 'Settings',
        tabBarIcon: ({ color, size }) => (
      <Ionicons name="settings-outline" size={size} color={color} />
    ),
  }}
/>
      <Tabs.Screen name="newStudent" options={{ href: null }} />
    </Tabs>
  )
}
