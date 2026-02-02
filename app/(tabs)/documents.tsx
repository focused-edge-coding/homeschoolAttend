import { Ionicons } from '@expo/vector-icons'
import * as Print from 'expo-print'
import { useFocusEffect } from 'expo-router'
import * as Sharing from 'expo-sharing'
import React, { useCallback, useMemo, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { Dropdown } from 'react-native-element-dropdown'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useAuth } from '../../Contexts/Auth'
import { getAttendanceRecordByStudentAndYear, getStudentsByUserId } from '../../services/database'
import { AttendanceDay, Student } from '../../types/database'

interface StudentWithAttendanceSummary {
  student: Student
}

type DayStatus = 'present' | 'absent' | 'field_trip' | 'homeschool_group'

export default function Documents() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [students, setStudents] = useState<StudentWithAttendanceSummary[]>([])
  const now = new Date()
  const currentYear = now.getMonth() >= 6 ? now.getFullYear() : now.getFullYear() - 1
  const [selectedYear, setSelectedYear] = useState(currentYear)

  const yearOptions = useMemo(
    () =>
      Array.from({ length: 12 }).map((_, idx) => {
        const yr = currentYear - idx
        return { label: `${yr}-${yr + 1}`, value: yr }
      }),
    [currentYear]
  )

  const selectedSchoolYear = useMemo(
    () => `${selectedYear}-${selectedYear + 1}`,
    [selectedYear]
  )

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
      setLoading(true)
      const { data, error } = await getStudentsByUserId(user.id)
      if (error) {
        Alert.alert('Error', 'Failed to load students')
        return
      }
      setStudents((data || []).map((s) => ({ student: s })))
    } catch (e) {
      console.error(e)
      Alert.alert('Error', 'Failed to load students')
    } finally {
      setLoading(false)
    }
  }

  const buildYearAttendanceSummary = (
    attendanceData: Record<string, AttendanceDay> | null | undefined
  ) => {
    const summaryByMonth: Record<string, { present: number; absent: number; total: number }> = {}

    if (!attendanceData) return summaryByMonth

    Object.entries(attendanceData).forEach(([date, value]) => {
      const day = value as AttendanceDay
      const d = new Date(date)
      const monthKey = d.toLocaleString('en-US', { month: 'short', year: 'numeric' })
      if (!summaryByMonth[monthKey]) {
        summaryByMonth[monthKey] = { present: 0, absent: 0, total: 0 }
      }
      const attended =
        day.status === 'present' ||
        day.status === 'field_trip' ||
        day.status === 'homeschool_group'
      if (attended) summaryByMonth[monthKey].present++
      if (day.status === 'absent') summaryByMonth[monthKey].absent++
      summaryByMonth[monthKey].total++
    })

    return summaryByMonth
  }

  const generateAttendanceHtml = (
    student: Student,
    schoolYear: string,
    attendanceData: Record<string, AttendanceDay> | null | undefined
  ) => {
    const summaryByMonth = buildYearAttendanceSummary(attendanceData)

    let rows = ''
    const monthKeys = Object.keys(summaryByMonth).sort((a, b) => {
      const [am, ay] = a.split(' ')
      const [bm, by] = b.split(' ')
      return new Date(`${am} 1, ${ay}`).getTime() - new Date(`${bm} 1, ${by}`).getTime()
    })

    monthKeys.forEach((month) => {
      const { present, absent, total } = summaryByMonth[month]
      rows += `
        <tr>
          <td>${month}</td>
          <td>${present}</td>
          <td>${absent}</td>
          <td>${total}</td>
        </tr>
      `
    })

    const totalPresent = monthKeys.reduce(
      (acc, m) => acc + summaryByMonth[m].present,
      0
    )
    const totalAbsent = monthKeys.reduce(
      (acc, m) => acc + summaryByMonth[m].absent,
      0
    )
    const totalDays = monthKeys.reduce((acc, m) => acc + summaryByMonth[m].total, 0)

    return `
      <html>
        <head>
          <meta name="viewport" content="initial-scale=1.0, maximum-scale=1.0" />
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; padding: 24px; }
            h1 { font-size: 24px; margin-bottom: 4px; }
            h2 { font-size: 18px; margin-bottom: 4px; }
            p { font-size: 14px; margin: 2px 0; }
            table { width: 100%; border-collapse: collapse; margin-top: 16px; }
            th, td { border: 1px solid #4B5563; padding: 6px 8px; font-size: 12px; text-align: center; }
            th { background-color: #E5E7EB; }
            tfoot td { font-weight: bold; }
          </style>
        </head>
        <body>
          <h1>Homeschool Attendance Record</h1>
          <p><strong>Student:</strong> ${student.name}</p>
          <p><strong>School Year:</strong> ${schoolYear}</p>
          <p><strong>Date Generated:</strong> ${new Date().toLocaleDateString()}</p>
          <br/>
          <h2>Monthly Summary</h2>
          <table>
            <thead>
              <tr>
                <th>Month</th>
                <th>Present</th>
                <th>Absent</th>
                <th>Total Days</th>
              </tr>
            </thead>
            <tbody>
              ${rows || '<tr><td colspan="4">No attendance recorded.</td></tr>'}
            </tbody>
            <tfoot>
              <tr>
                <td>Total</td>
                <td>${totalPresent}</td>
                <td>${totalAbsent}</td>
                <td>${totalDays}</td>
              </tr>
            </tfoot>
          </table>
        </body>
      </html>
    `
  }

  const handleGeneratePdf = async (student: Student) => {
    if (!user) return
    try {
      const { data: attendanceRecord, error } = await getAttendanceRecordByStudentAndYear(
        student.id,
        selectedSchoolYear
      )
      if (error) {
        Alert.alert('Error', 'Failed to load attendance data for this student')
        return
      }

      const html = generateAttendanceHtml(student, selectedSchoolYear, attendanceRecord?.attendance_data)

      const { uri } = await Print.printToFileAsync({ html })

      const isAvailable = await Sharing.isAvailableAsync()
      if (isAvailable) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: `Attendance ${student.name} ${selectedSchoolYear}`,
        })
      } else {
        Alert.alert('PDF created', `File saved to: ${uri}`)
      }
    } catch (e) {
      console.error(e)
      Alert.alert('Error', 'Failed to generate attendance PDF')
    }
  }

  const renderStudent = ({ item }: { item: StudentWithAttendanceSummary }) => (
    <View style={styles.studentCard}>
      <View style={{ flex: 1 }}>
        <Text style={styles.studentName}>{item.student.name}</Text>
        <Text style={styles.studentDetails}>
          DOB: {new Date(item.student.dob).toLocaleDateString()}
        </Text>
      </View>
      <TouchableOpacity
        style={styles.pdfButton}
        onPress={() => handleGeneratePdf(item.student)}
      >
        <Ionicons name="download-outline" size={20} color="white" />
        <Text style={styles.pdfButtonText}>PDF</Text>
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
        <Text style={styles.title}>Documents</Text>
      </View>

      <View style={styles.yearSelector}>
        <Text style={styles.yearLabel}>School Year:</Text>
        <Dropdown
          style={styles.yearDropdown}
          containerStyle={styles.yearDropdownContainer}
          data={yearOptions}
          labelField="label"
          valueField="value"
          value={selectedYear}
          onChange={(item) => setSelectedYear(item.value)}
          placeholder="Year"
          placeholderStyle={{ color: '#4B5563' }}
          selectedTextStyle={{ color: '#1F2933', fontWeight: '600' }}
          itemTextStyle={{ color: '#1F2933' }}
          activeColor="#D0F0F2"
        />
      </View>

      {students.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="document-text-outline" size={64} color="#ccc" />
          <Text style={styles.emptyText}>No students yet</Text>
          <Text style={[styles.emptyText, { fontSize: 16 }]}>
            Add students on the Students tab to generate attendance PDFs.
          </Text>
        </View>
      ) : (
        <FlatList
          data={students}
          keyExtractor={(item) => item.student.id}
          renderItem={renderStudent}
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
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#1F2933',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2933',
  },
  yearSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D1D5DB',
    marginHorizontal: 20,
    marginTop: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  yearLabel: {
    color: '#1F2933',
    fontSize: 16,
    marginRight: 10,
  },
  yearDropdown: {
    height: 40,
    width: 160,
    backgroundColor: 'transparent',
  },
  yearDropdownContainer: {
    backgroundColor: '#D1D5DB',
    borderColor: '#1F2933',
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
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#4B5563',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
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
  pdfButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#145C63',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginLeft: 12,
    gap: 6,
  },
  pdfButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
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
    marginVertical: 8,
    textAlign: 'center',
  },
})
