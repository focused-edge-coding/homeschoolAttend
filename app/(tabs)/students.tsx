import { Ionicons } from '@expo/vector-icons'
import { useFocusEffect, useRouter } from 'expo-router'
import React, { useCallback, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useAuth } from '../../Contexts/Auth'
import { deleteStudent, getStudentsByUserId } from '../../services/database'
import { Student } from '../../types/database'

export default function Students() {
  const { user } = useAuth()
  const router = useRouter()
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)

  useFocusEffect(
    useCallback(() => {
      if (user) {
        loadStudents()
      }
    }, [user])
  )

  const loadStudents = async () => {
    if (!user) return

    try {
      const { data, error } = await getStudentsByUserId(user.id)
      
      if (error) {
        Alert.alert('Error', 'Failed to load students')
        return
      }

      setStudents(data || [])
    } catch (error) {
      console.error('Error loading students:', error)
      Alert.alert('Error', 'Failed to load students')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteStudent = (student: Student) => {
    Alert.alert(
      'Delete Student',
      `Are you sure you want to delete ${student.name}? This will also delete all associated attendance records.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const { error } = await deleteStudent(student.id)
            if (error) {
              Alert.alert('Error', 'Failed to delete student')
            } else {
              loadStudents()
            }
          },
        },
      ]
    )
  }

  const renderStudent = ({ item }: { item: Student }) => (
    <View style={styles.studentCard}>
      <View style={styles.studentInfo}>
        <Text style={styles.studentName}>{item.name}</Text>
        <Text style={styles.studentDetails}>
          DOB: {new Date(item.dob).toLocaleDateString()}
        </Text>
      </View>

      <TouchableOpacity
        style={styles.editButton}
        onPress={() => router.push({
          pathname: '../(tabs)/newStudent',
          params: { student: JSON.stringify(item) }
        })}
      >
        <Ionicons name='pencil-outline' size={20} color='#145C63' />
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => handleDeleteStudent(item)}
      >
        <Ionicons name="trash-outline" size={20} color="#dc3545" />
      </TouchableOpacity>
    </View>
  )

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#145C63" />
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Students</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => router.push('../(tabs)/newStudent')}
        >
          <Ionicons name="add" size={24} color="white" />
        </TouchableOpacity>
      </View>

      {students.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="people-outline" size={64} color="#ccc" />
          <Text style={styles.emptyText}>No students yet</Text>
          <TouchableOpacity
            style={styles.emptyButton}
            onPress={() => router.push('../(tabs)/newStudent')}
          >
            <Text style={styles.emptyButtonText}>Add Your First Student</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={students}
          renderItem={renderStudent}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
        />
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#145C63',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#1F2933',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2933',
  },
  addButton: {
    backgroundColor: '#145C63',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContainer: {
    padding: 20,
  },
  studentCard: {
    backgroundColor: '#D1D5DB',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#4B5563',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  studentInfo: {
    flex: 1,
  },
  studentName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2933',
    marginBottom: 4,
  },
  studentDetails: {
    fontSize: 16,
    color: '#4B5563',
    marginBottom: 2,
  },
  deleteButton: {
    padding: 8,
  },
  editButton: {
    padding: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 18,
    color: '#4B5563',
    marginVertical: 16,
    textAlign: 'center',
  },
  emptyButton: {
    backgroundColor: '#145C63',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  emptyButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
})
