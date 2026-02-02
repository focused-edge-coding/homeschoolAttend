import { Ionicons } from '@expo/vector-icons'
import { useFocusEffect } from 'expo-router'
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
    ActivityIndicator,
    Alert,
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native'
import { Dropdown } from 'react-native-element-dropdown'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useAuth } from '../../Contexts/Auth'
import {
    bulkUpsertAttendanceDays,
    getAttendanceRecordByStudentAndYear,
    getStudentsByUserId
} from '../../services/database'
import { AttendanceDay, Student } from '../../types/database'

interface StudentAttendanceSummary {
  student: Student
  totalDays: number
  presentDays: number
  absentDays: number
  lastUpdated?: string
}

type DayStatus = 'present' | 'absent' | 'field_trip' | 'homeschool_group'

export default function Attendance() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [students, setStudents] = useState<StudentAttendanceSummary[]>([])
  const [monthCursor, setMonthCursor] = useState<Date>(() => new Date())
  const [dateStatusMap, setDateStatusMap] = useState<Record<string, DayStatus | 'mixed'>>({})
  const [modalVisible, setModalVisible] = useState(false)
  const [selectedDate, setSelectedDate] = useState<string>('')
  const [selectedStatus, setSelectedStatus] = useState<DayStatus>('present')
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([])
  
  const now = new Date()
  const currentYear = now.getMonth() >= 6 ? now.getFullYear() : now.getFullYear() - 1
  const [selectedYear, setSelectedYear] = useState(currentYear)
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth())
  const selectedSchoolYear = `${selectedYear}-${selectedYear + 1}`

  const statusMeta: { key: DayStatus; label: string; color: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    { key: 'present', label: 'Present', color: '#4CAF50', icon: 'checkmark-circle' },
    { key: 'absent', label: 'Absent', color: '#F44336', icon: 'close-circle' },
    { key: 'field_trip', label: 'Field trip', color: '#2196F3', icon: 'car' },
    { key: 'homeschool_group', label: 'Homeschool group', color: '#FF9800', icon: 'people' },
  ]

  useFocusEffect(
    useCallback(() => {
      if (user && selectedSchoolYear) {
        loadStudentAttendanceSummaries()
      }
    }, [user, selectedYear, selectedMonth])
  )

  const monthDays = useMemo(() => {
    const y = monthCursor.getFullYear()
    const m = monthCursor.getMonth()
    const first = new Date(y, m, 1)
    const last = new Date(y, m + 1, 0)
    const days: { date: string; dayNum: number; weekday: number }[] = []
    
    for (let d = 1; d <= last.getDate(); d++) {
      const current = new Date(y, m, d)
      const iso = current.toISOString().split('T')[0]
      days.push({ date: iso, dayNum: d, weekday: current.getDay() })
    }
    return { year: y, month: m, days }
  }, [monthCursor])

  useEffect(() => {
    setMonthCursor(new Date(selectedYear, selectedMonth, 1))
  }, [selectedYear, selectedMonth])

  const yearOptions = Array.from({ length: 12 }).map((_, idx) => {
    const yr = currentYear - idx
    return { label: `${yr}-${yr + 1}`, value: yr }
  })

  const monthOptions = [
    { label: 'January', value: 0 },
    { label: 'February', value: 1 },
    { label: 'March', value: 2 },
    { label: 'April', value: 3 },
    { label: 'May', value: 4 },
    { label: 'June', value: 5 },
    { label: 'July', value: 6 },
    { label: 'August', value: 7 },
    { label: 'September', value: 8 },
    { label: 'October', value: 9 },
    { label: 'November', value: 10 },
    { label: 'December', value: 11 },
  ]

  const loadStudentAttendanceSummaries = async () => {
    if (!user || !selectedSchoolYear) return

    try {
      setLoading(true)
      
      const { data: studentData, error: studentError } = await getStudentsByUserId(user.id)
      
      if (studentError || !studentData) {
        Alert.alert('Error', 'Failed to load students')
        return
      }

      const summaries: StudentAttendanceSummary[] = []
      const map: Record<string, DayStatus | 'mixed'> = {}
      
      for (const student of studentData) {
        const { data: attendanceRecord } = await getAttendanceRecordByStudentAndYear(
          student.id, 
          selectedSchoolYear
        )
        
        let totalDays = 0
        let presentDays = 0
        let absentDays = 0
        
        if (attendanceRecord?.attendance_data) {
          const attendanceData = attendanceRecord.attendance_data
          totalDays = Object.keys(attendanceData).length
          
          Object.entries(attendanceData).forEach(([date, value]) => {
            const day = value as AttendanceDay
            const attended = day.status === 'present' || day.status === 'field_trip' || day.status === 'homeschool_group'
            if (attended) presentDays++
            if (day.status === 'absent') absentDays++

            const existing = map[date]
            if (!existing) map[date] = day.status
            else if (existing !== day.status) map[date] = 'mixed'
          })
        }
        
        summaries.push({
          student,
          totalDays,
          presentDays,
          absentDays,
          lastUpdated: attendanceRecord?.updated_at
        })
      }
      
      setStudents(summaries)
      setDateStatusMap(map)
    } catch (error) {
      console.error('Error loading attendance summaries:', error)
      Alert.alert('Error', 'Failed to load attendance data')
    } finally {
      setLoading(false)
    }
  }

  const openDayModal = (date: string) => {
    setSelectedDate(date)
    setSelectedStatus('present')
    setSelectedStudentIds([])
    setModalVisible(true)
  }

  const toggleStudentSelect = (id: string) => {
    setSelectedStudentIds(prev => 
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    )
  }

  const saveDayForSelected = async () => {
    if (!user || !selectedDate || selectedStudentIds.length === 0) {
      setModalVisible(false)
      return
    }
    
    const updates = selectedStudentIds.map(studentId => ({
      studentId,
      date: selectedDate,
      attendanceDay: { status: selectedStatus } as AttendanceDay,
    }))
    
    const { error } = await bulkUpsertAttendanceDays(updates, user.id, selectedSchoolYear)
    if (error) Alert.alert('Error', String(error))
    
    setModalVisible(false)
    loadStudentAttendanceSummaries()
  }

  const renderStudentCard = ({ item }: { item: StudentAttendanceSummary }) => (
    <View style={styles.studentCard}>
      <View style={styles.studentRow}>
        <Text style={styles.studentName}>{item.student.name}</Text>
        <View style={styles.metricsRow}>
          <View style={styles.metric}>
            <Text style={styles.metricNumber}>{item.presentDays}</Text>
            <Text style={styles.metricLabel}>Present</Text>
          </View>
          <View style={styles.metric}>
            <Text style={styles.metricNumber}>{item.absentDays}</Text>
            <Text style={styles.metricLabel}>Absent</Text>
          </View>
          <View style={styles.metric}>
            <Text style={styles.metricNumber}>{item.totalDays}</Text>
            <Text style={styles.metricLabel}>Total</Text>
          </View>
        </View>
      </View>
    </View>
  )

  const monthLabel = useMemo(() => 
    monthCursor.toLocaleString('en-US', { month: 'long', year: 'numeric' }), 
    [monthCursor]
  )

  const colorForAggregated = (status?: DayStatus | 'mixed') => {
    if (status === 'absent') return '#F44336'
    if (status === 'present') return '#4CAF50'
    if (status === 'field_trip') return '#2196F3'
    if (status === 'homeschool_group') return '#FF9800'
    if (status === 'mixed') return '#9C27B0'
    return 'transparent'
  }

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
        <Text style={styles.title}>Attendance</Text>
      </View>

      <ScrollView style={styles.content}>
        <Text style={styles.sectionTitle}>Student Attendance ({selectedSchoolYear})</Text>
        {students.map((studentSummary) => (
          <View key={studentSummary.student.id}>
            {renderStudentCard({ item: studentSummary })}
          </View>
        ))}

        <View style={styles.yearSelector}>
          <Text style={styles.yearLabel}>Month:</Text>
          <Dropdown
            style={styles.monthDropdown}
            containerStyle={styles.yearDropdownContainer}
            data={monthOptions}
            labelField="label"
            valueField="value"
            value={selectedMonth}
            onChange={(item) => setSelectedMonth(item.value)}
            placeholder="Month"
            placeholderStyle={{ color: '#4B5563' }}
            selectedTextStyle={{ color: '#1F2933', fontWeight: '600' }}
            itemTextStyle={{ color: '#1F2933' }}
            activeColor="#D0F0F2"
          />
          <Text style={[styles.yearLabel, { marginLeft: 12 }]}>Year:</Text>
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

        <View style={styles.calendarHeader}>
          <TouchableOpacity onPress={() => setMonthCursor(new Date(monthCursor.getFullYear(), monthCursor.getMonth() - 1, 1))}>
            <Ionicons name="chevron-back" size={20} color="#1F2933" />
          </TouchableOpacity>
          <Text style={styles.calendarHeaderText}>{monthLabel}</Text>
          <TouchableOpacity onPress={() => setMonthCursor(new Date(monthCursor.getFullYear(), monthCursor.getMonth() + 1, 1))}>
            <Ionicons name="chevron-forward" size={20} color="#1F2933" />
          </TouchableOpacity>
        </View>

        <View style={styles.weekdaysRow}>
          {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => (
            <Text key={d} style={styles.weekday}>{d}</Text>
          ))}
        </View>

        <View style={styles.calendarGrid}>
          {Array.from({ length: monthDays.days[0]?.weekday || 0 }).map((_, i) => (
            <View key={`blank-${i}`} style={styles.calendarCell} />
          ))}
          {monthDays.days.map(d => {
            const color = colorForAggregated(dateStatusMap[d.date])
            return (
              <Pressable key={d.date} style={styles.calendarCell} onPress={() => openDayModal(d.date)}>
                <Text style={styles.calendarDayNum}>{d.dayNum}</Text>
                <View style={[styles.dot, { backgroundColor: color }]} />
              </Pressable>
            )
          })}
        </View>

        <Text style={styles.sectionTitle}>Calendar Key</Text>
        <View style={styles.legendRow}>
          {statusMeta.map(s => (
            <View key={s.key} style={styles.legendItem}>
              <View style={[styles.dot, { backgroundColor: s.color }]} />
              <Text style={styles.legendText}>{s.label}</Text>
            </View>
          ))}
          <View style={styles.legendItem}>
            <View style={[styles.dot, { backgroundColor: '#9C27B0' }]} />
            <Text style={styles.legendText}>Mixed</Text>
          </View>
        </View>
      </ScrollView>

      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Set attendance for {selectedDate}</Text>
            <Text style={styles.modalSubtitle}>Select student(s):</Text>
            <View style={styles.modalList}>
              {students.map(s => (
                <TouchableOpacity key={s.student.id} style={styles.modalStudent} onPress={() => toggleStudentSelect(s.student.id)}>
                  <Ionicons 
                    name={selectedStudentIds.includes(s.student.id) ? 'checkbox' : 'square-outline'} 
                    size={22} 
                    color="#145C63" 
                  />
                  <Text style={styles.modalStudentName}>{s.student.name}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.modalSubtitle, { marginTop: 16 }]}>Status:</Text>
            {statusMeta.map(s => (
              <TouchableOpacity key={s.key} style={styles.statusOption} onPress={() => setSelectedStatus(s.key)}>
                <Ionicons 
                  name={selectedStatus === s.key ? 'radio-button-on' : 'radio-button-off'} 
                  size={20} 
                  color={selectedStatus === s.key ? s.color : '#999'} 
                />
                <Text style={styles.statusText}>{s.label}</Text>
              </TouchableOpacity>
            ))}

            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#145C63' }]} onPress={saveDayForSelected}>
                <Ionicons name="checkmark" size={18} color="white" />
                <Text style={styles.actionBtnText}>Save</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#6B7280' }]} onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={18} color="white" />
                <Text style={styles.actionBtnText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  )
}

// Styles remain the same as your original (unchanged)
const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#F9FAFB' 
  },
  loadingContainer: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    backgroundColor: '#145C63' 
  },
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    padding: 20, 
    backgroundColor: '#F9FAFB', 
    borderBottomWidth: 1, 
    borderBottomColor: '#1F2933' 
  },
  title: { 
    fontSize: 24, 
    fontWeight: 'bold', 
    color: '#1F2933' 
  },
  content: { 
    flex: 1, 
    padding: 20 
  },
  sectionTitle: { 
    fontSize: 20, 
    fontWeight: '600', 
    color: '#1F2933', 
    marginBottom: 16,
    marginTop: 8
  },
  studentCard: { 
    backgroundColor: '#D1D5DB', 
    paddingVertical: 8,
    paddingHorizontal: 12, 
    borderRadius: 12, 
    marginBottom: 12, 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 1 }, 
    shadowOpacity: 0.08, 
    shadowRadius: 2, 
    elevation: 2 
  },
  studentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  studentName: { 
    fontSize: 14, 
    fontWeight: '600', 
    color: '#1F2933' 
  },
  metricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20
  },
  metric: {
    alignItems: 'center',
    minWidth: 50
  },
  metricNumber: {
    color: '#1F2933',
    fontSize: 18,
    fontWeight: '700'
  },
  metricLabel: {
    color: '#4B5563',
    opacity: 0.8,
    fontSize: 12
  },
  yearSelector: { 
    flexDirection: 'row',
    alignItems: 'center', 
    backgroundColor: '#D1D5DB',
    marginVertical: 10,
    paddingHorizontal: 10, 
    paddingVertical: 6, 
    borderRadius: 8 
  },
  yearLabel: { 
    color: '#1F2933', 
    fontSize: 16, 
    marginRight: 10, 
  },
  yearDropdown: { 
    height: 40, 
    width: 120, 
    backgroundColor: 'transparent' 
  },
  monthDropdown: {
    height: 40,
    width: 120,
    backgroundColor: 'transparent'
  },
  yearDropdownContainer: { 
    backgroundColor: '#D1D5DB', 
    borderColor: '#1F2933' 
  },
  calendarHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: 8,
    marginTop: 8 
  },
  calendarHeaderText: { 
    color: '#1F2933', 
    fontSize: 20, 
    fontWeight: '600' 
  },
  weekdaysRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    marginBottom: 6 
  },
  weekday: { 
    width: 40, 
    textAlign: 'center', 
    color: '#1F2933', 
    opacity: 0.7 
  },
  calendarGrid: { 
    flexDirection: 'row', 
    flexWrap: 'wrap', 
    gap: 6, 
    marginBottom: 16 
  },
  calendarCell: { 
    width: 40, 
    height: 48, 
    borderRadius: 8, 
    backgroundColor: '#1F2933', 
    alignItems: 'center', 
    justifyContent: 'center' 
  },
  calendarDayNum: { 
    color: 'white',
    marginBottom: 4,
    fontSize: 14 
  },
  dot: { 
    width: 10, 
    height: 10, 
    borderRadius: 5 
  },
  legendRow: { 
    flexDirection: 'row', 
    flexWrap: 'wrap', 
    gap: 12,
    justifyContent: 'center' 
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  legendText: { color: '#1F2933', fontSize: 14 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 16 },
  modalCard: { backgroundColor: '#F9FAFB', borderRadius: 12, padding: 20, maxHeight: '85%' },
  modalTitle: { color: '#1F2933', fontSize: 20, fontWeight: '600', marginBottom: 8 },
  modalSubtitle: { color: '#4B5563', fontSize: 14, fontWeight: '500', marginBottom: 12 },
  modalList: { maxHeight: 200, marginBottom: 12 },
  modalStudent: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  modalStudentName: { color: '#1F2933', fontSize: 16 },
  statusOption: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderRadius: 8, marginBottom: 4 },
  statusText: { color: '#1F2933', fontWeight: '500', fontSize: 16 },
  modalActions: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, marginTop: 16 },
  actionBtn: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, paddingVertical: 14, borderRadius: 8 },
  actionBtnText: { color: 'white', fontWeight: '600', fontSize: 16 },
})
