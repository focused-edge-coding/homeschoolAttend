import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import React, { useState } from 'react'
import {
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useAuth } from '../../Contexts/Auth'

export default function Settings() {
  const { user, logout, rememberMe, setRememberMe, updateEmail, changePassword } = useAuth()
  const [editingEmail, setEditingEmail] = useState(false)
  const [newEmail, setNewEmail] = useState(user?.email || '')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [showPasswordChange, setShowPasswordChange] = useState(false)

  const handleEmailUpdate = async () => {
    if (!newEmail || !newEmail.includes('@')) {
      Alert.alert('Error', 'Please enter a valid email')
      return
    }
    try {
      await updateEmail(newEmail)
      setEditingEmail(false)
    } catch (error) {
      Alert.alert('Error', 'Failed to update email')
    }
  }

  const handlePasswordChange = async () => {
    if (!currentPassword || newPassword.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters')
      return
    }
    try {
      await changePassword(currentPassword, newPassword)
      setCurrentPassword('')
      setNewPassword('')
      setShowPasswordChange(false)
    } catch (error) {
      Alert.alert('Error', 'Failed to change password')
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Settings</Text>
        </View>

        {/* Account Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          
          {/* Email */}
          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <Ionicons name="mail-outline" size={24} color="#145C63" />
              <Text style={styles.settingLabel}>Email</Text>
            </View>
            <View style={styles.settingRight}>
              {editingEmail ? (
                <>
                  <TextInput
                    style={styles.emailInput}
                    value={newEmail}
                    onChangeText={setNewEmail}
                    autoCapitalize="none"
                    keyboardType="email-address"
                  />
                  <View style={styles.actionButtons}>
                    <TouchableOpacity style={styles.cancelBtn} onPress={() => setEditingEmail(false)}>
                      <Text style={styles.cancelBtnText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.saveBtn} onPress={handleEmailUpdate}>
                      <Text style={styles.saveBtnText}>Save</Text>
                    </TouchableOpacity>
                  </View>
                </>
              ) : (
                <>
                  <Text style={styles.emailText}>{user?.email}</Text>
                  <TouchableOpacity onPress={() => setEditingEmail(true)}>
                    <Ionicons name="pencil-outline" size={20} color="#145C63" />
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>

          {/* Password */}
          <TouchableOpacity 
            style={styles.settingRow} 
            onPress={() => setShowPasswordChange(true)}
          >
            <View style={styles.settingLeft}>
              <Ionicons name="key-outline" size={24} color="#145C63" />
              <Text style={styles.settingLabel}>Change Password</Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color="#9CA3AF" />
          </TouchableOpacity>

          {/* Remember Me */}
          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <Ionicons name="shield-checkmark-outline" size={24} color="#145C63" />
              <Text style={styles.settingLabel}>Remember Me</Text>
            </View>
            <View style={styles.settingRight}>
              <Switch
                value={rememberMe}
                onValueChange={setRememberMe}
                trackColor={{ false: '#E5E7EB', true: '#145C63' }}
                thumbColor={rememberMe ? '#fff' : '#F3F4F6'}
              />
            </View>
          </View>
        </View>

        {/* FAQ Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>FAQ</Text>
          <TouchableOpacity style={styles.faqItem}>
            <Text style={styles.faqQuestion}>How do I generate attendance PDFs?</Text>
            <Text style={styles.faqAnswer}>Go to Documents tab, select a school year, tap PDF button next to any student.</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.faqItem}>
            <Text style={styles.faqQuestion}>What counts as "Present"?</Text>
            <Text style={styles.faqAnswer}>Regular school day, field trips, and homeschool group days all count as present.</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.faqItem}>
            <Text style={styles.faqQuestion}>School years format?</Text>
            <Text style={styles.faqAnswer}>Uses July-June format (2025-2026 = Jul 2025 - Jun 2026).</Text>
          </TouchableOpacity>
        </View>

        {/* About Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          <View style={styles.aboutCard}>
            <Text style={styles.aboutTitle}>Homeschool Tracker v1.0</Text>
            <Text style={styles.aboutText}>Simple attendance tracking for homeschool families. Generate official PDFs for your records.</Text>
            <Text style={styles.version}>Built with React Native + Expo</Text>
          </View>
        </View>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutButton} onPress={() => logout().then(() => router.push('/login'))}>
          <Ionicons name="log-out-outline" size={20} color="white" />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Password Change Modal */}
      {showPasswordChange && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Change Password</Text>
            
            <Text style={styles.label}>Current Password</Text>
            <TextInput
              style={styles.input}
              value={currentPassword}
              onChangeText={setCurrentPassword}
              secureTextEntry
              placeholder="Enter current password"
            />
            
            <Text style={styles.label}>New Password</Text>
            <TextInput
              style={styles.input}
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry
              placeholder="Enter new password (min 6 chars)"
            />

            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={[styles.actionBtn, styles.cancelBtn]} 
                onPress={() => setShowPasswordChange(false)}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.actionBtn, styles.saveBtn]} 
                onPress={handlePasswordChange}
              >
                <Text style={styles.saveBtnText}>Update Password</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  content: {
    padding: 20,
    paddingBottom: 100,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2933',
  },
  section: {
    backgroundColor: '#D1D5DB',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2933',
    marginBottom: 20,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  settingLabel: {
    fontSize: 16,
    color: '#1F2933',
    fontWeight: '600',
  },
  settingRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  emailText: {
    fontSize: 16,
    color: '#1F2933',
  },
  emailInput: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
    minWidth: 200,
    backgroundColor: 'white',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  saveBtn: {
    backgroundColor: '#145C63',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  saveBtnText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
  cancelBtn: {
    borderWidth: 1,
    borderColor: '#9CA3AF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  cancelBtnText: {
    color: '#6B7280',
    fontWeight: '500',
    fontSize: 14,
  },
  faqItem: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  faqQuestion: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2933',
    marginBottom: 4,
  },
  faqAnswer: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20,
  },
  aboutCard: {
    padding: 20,
    backgroundColor: 'white',
    borderRadius: 12,
    alignItems: 'center',
  },
  aboutTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2933',
    marginBottom: 8,
  },
  aboutText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 20,
  },
  version: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  logoutButton: {
    flexDirection: 'row',
    backgroundColor: '#dc3545',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 20,
  },
  logoutText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2933',
    marginBottom: 20,
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
    paddingVertical: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    fontSize: 16,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
})
