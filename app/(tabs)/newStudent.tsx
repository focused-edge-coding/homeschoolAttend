import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useAuth } from '../../Contexts/Auth'
import { createStudent, updateStudent } from '../../services/database'

const initialFormData = {
  name: '',
  dob: '',
  address: '',
  city: '',
  state: '',
  zip_code: '',
}

export default function NewStudent() {
  const { user } = useAuth()
  const router = useRouter()
  const params = useLocalSearchParams()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState(initialFormData)
  const formSubmittedRef = useRef(false)

  const editStudent = React.useMemo(() => {
    if (!params.student) return null
    const studentParam = Array.isArray(params.student) ? params.student[0] : params.student
    if (typeof studentParam === 'string') {
      try {
        return JSON.parse(studentParam)
      } catch {
        return null
      }
    }
    return null
  }, [params.student])

  useEffect(() => {
    if (editStudent) {
      setFormData({
        name: editStudent.name || '',
        dob: editStudent.dob || '',
        address: editStudent.address || '',
        city: editStudent.city || '',
        state: editStudent.state || '',
        zip_code: editStudent.zip_code || '',
      })
    } else {
      setFormData(initialFormData)
    }
  }, [editStudent])

  useFocusEffect(
    useCallback(() => {
      formSubmittedRef.current = false
      return () => {
        if (!formSubmittedRef.current) {
          setFormData(initialFormData)
        }
      }
    }, [])
  )

  const resetForm = () => {
    setFormData(initialFormData)
    router.push('../(tabs)/students')
  }

  const handleSubmit = async () => {
    if (!user) return
    
    if (!formData.name || !formData.dob ) {
      Alert.alert('Error', 'Please fill in all required fields (Name, DOB, Graduation Date)')
      return
    }

    setLoading(true)
    
    const studentData = {
      ...formData,
      user_id: user.id,
    }

    let error: string | null = null
    if (editStudent && editStudent.id) {
      error = (await updateStudent(editStudent.id, studentData)).error
    } else {
      const result = await createStudent(studentData)
      error = result.error
    }

    setLoading(false)

    if (error) {
      Alert.alert('Error', 'Failed to save student')
    } else {
      formSubmittedRef.current = true
      Alert.alert(
        'Success',
        editStudent ? 'Student updated.' : 'Student created.',
        [{ text: 'OK', onPress: () => router.push('../(tabs)/students') }]
      )
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView keyboardShouldPersistTaps='handled'>
        <Text style={styles.title}>{editStudent ? "Update Student" : "Create New Student"}</Text>

        <Text style={styles.label}>Full Name *</Text>
        <TextInput
          style={styles.input}
          value={formData.name}
          onChangeText={(text) => setFormData({ ...formData, name: text })}
          placeholder="Student's first and last name"
          placeholderTextColor={'#999'}
        />

        <Text style={styles.label}>Date of Birth *</Text>
        <TextInput
          style={styles.input}
          value={formData.dob}
          onChangeText={(text) => setFormData({ ...formData, dob: text })}
          placeholder='MM-DD-YYYY'
          maxLength={10}
          placeholderTextColor={'#999'}
        />

        <Text style={styles.label}>Address</Text>
        <TextInput
          style={styles.input}
          value={formData.address}
          onChangeText={(text) => setFormData({ ...formData, address: text })}
          placeholder="Street address"
          placeholderTextColor={'#999'}
        />

        <Text style={styles.label}>City</Text>
        <TextInput
          style={styles.input}
          value={formData.city}
          onChangeText={(text) => setFormData({ ...formData, city: text })}
          placeholder="City"
          placeholderTextColor={'#999'}
        />

        <Text style={styles.label}>State</Text>
        <TextInput
          style={styles.input}
          value={formData.state}
          onChangeText={(text) => setFormData({ ...formData, state: text })}
          placeholder="State"
          placeholderTextColor={'#999'}
        />

        <Text style={styles.label}>Zip Code</Text>
        <TextInput
          style={styles.input}
          value={formData.zip_code}
          onChangeText={(text) => setFormData({ ...formData, zip_code: text })}
          placeholder="Zip code"
          keyboardType="numeric"
          placeholderTextColor={'#999'}
        />

        <TouchableOpacity
          style={styles.submitButton}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.submitButtonText}>
              {editStudent ? "Update Student" : "Create Student"}
            </Text>
          )}
        </TouchableOpacity>
        
        {editStudent && (
          <TouchableOpacity style={styles.cancelButton} onPress={resetForm}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  title: {
    fontSize: 24,
    margin: 20,
    fontWeight: 'bold',
    color: '#1F2933',
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1F2933',
    marginBottom: 8,
    marginTop: 16,
    paddingHorizontal: 20,
  },
  input: {
    backgroundColor: '#D1D5DB',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    marginHorizontal: 20,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#4B5563',
    color: '#1F2933',
  },
  submitButton: {
    backgroundColor: '#145C63',
    marginHorizontal: 20,
    marginTop: 24,
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#145C63',
    paddingVertical: 12,
    marginHorizontal: 20,
    marginTop: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#145C63',
    fontSize: 16,
    fontWeight: '600',
  },
})
