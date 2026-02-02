import * as SQLite from 'expo-sqlite'
import { AttendanceDay, AttendanceRecord, Student } from '../types/database'

// Open/create database
const db = SQLite.openDatabaseSync('homeschool.db')

// Helper: Convert undefined to null for SQLite
const toSQLiteValue = (value: any): string | null => {
  return value === undefined || value === null ? null : String(value)
}

// Initialize tables
export const initDatabase = async () => {
  await db.execAsync(`
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS students (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      dob TEXT NOT NULL,
      grad_date TEXT NOT NULL,
      address TEXT,
      city TEXT,
      state TEXT,
      zip_code TEXT,
      school_id TEXT,
      user_id TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS attendance_records (
      id TEXT PRIMARY KEY,
      student_id TEXT NOT NULL,
      school_year TEXT NOT NULL,
      attendance_data TEXT NOT NULL,
      total_days INTEGER DEFAULT 0,
      present_days INTEGER DEFAULT 0,
      absent_days INTEGER DEFAULT 0,
      updated_at TEXT DEFAULT (datetime('now')),
      user_id TEXT NOT NULL,
      FOREIGN KEY (student_id) REFERENCES students(id),
      UNIQUE(student_id, school_year)
    );
  `)
}

// Generate UUID
const generateId = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

// STUDENTS - ✅ FIXED
export const getStudentsByUserId = async (userId: string): Promise<{ data: Student[]; error: string | null }> => {
  const result = await db.getAllAsync(
    'SELECT * FROM students WHERE user_id = ? ORDER BY name',
    [userId]
  ) as Student[]
  return { data: result, error: null }
}

export const createStudent = async (studentData: Omit<Student, 'id' | 'created_at'>): Promise<{ data: Student; error: string | null }> => {
  const id = generateId()
  
  // ✅ Convert all undefined to null
  const params = [
    id,
    studentData.name,
    studentData.dob,
    toSQLiteValue(studentData.address),
    toSQLiteValue(studentData.city),
    toSQLiteValue(studentData.state),
    toSQLiteValue(studentData.zip_code),
    toSQLiteValue(studentData.school_id),
    studentData.user_id,
  ]

  const result = await db.runAsync(
    `INSERT INTO students (id, name, dob, grad_date, address, city, state, zip_code, school_id, user_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    params
  )
  
  if (!result) return { data: {} as Student, error: 'Insert failed' }
  return { data: { id, ...studentData } as Student, error: null }
}

export const updateStudent = async (id: string, updates: Partial<Student>): Promise<{ error: string | null }> => {
  const fields = Object.keys(updates)
  const setClause = fields.map((key) => `${key} = ?`).join(', ')
  const values = fields.map((key) => toSQLiteValue(updates[key as keyof Student]))
  values.push(id) // WHERE clause last

  await db.runAsync(`UPDATE students SET ${setClause} WHERE id = ?`, values)
  return { error: null }
}

export const deleteStudent = async (studentId: string): Promise<{ error: string | null }> => {
  await db.runAsync('DELETE FROM attendance_records WHERE student_id = ?', [studentId])
  await db.runAsync('DELETE FROM students WHERE id = ?', [studentId])
  return { error: null }
}

// ATTENDANCE - ✅ FIXED
export const getAttendanceRecordByStudentAndYear = async (
  studentId: string,
  schoolYear: string
): Promise<{ data: AttendanceRecord | null; error: string | null }> => {
  const result = await db.getFirstAsync(
    `SELECT * FROM attendance_records WHERE student_id = ? AND school_year = ?`,
    [studentId, schoolYear]
  ) as any

  if (!result) {
    return { data: null, error: null }
  }

  let attendanceData: Record<string, AttendanceDay> = {}
  try {
    attendanceData = result.attendance_data ? JSON.parse(result.attendance_data) : {}
  } catch (e) {
    console.error('JSON parse error:', e)
  }

  const record: AttendanceRecord = {
    id: result.id,
    student_id: result.student_id,
    school_year: result.school_year,
    attendance_data: attendanceData,
    total_days: result.total_days || 0,
    present_days: result.present_days || 0,
    absent_days: result.absent_days || 0,
    updated_at: result.updated_at,
    user_id: result.user_id,
  }

  return { data: record, error: null }
}

export const bulkUpsertAttendanceDays = async (
  updates: Array<{ studentId: string; date: string; attendanceDay: AttendanceDay }>,
  userId: string,
  schoolYear: string
): Promise<{ error: string | null }> => {
  try {
    for (const update of updates) {
      const existing = await getAttendanceRecordByStudentAndYear(update.studentId, schoolYear)
      
      const record: Partial<AttendanceRecord> = existing.data || {
        id: generateId(),
        student_id: update.studentId,
        school_year: schoolYear,
        attendance_data: {},
        total_days: 0,
        present_days: 0,
        absent_days: 0,
        user_id: userId,
      }

      // Update attendance data
      const newData = { ...(record.attendance_data as Record<string, AttendanceDay>) }
      newData[update.date] = update.attendanceDay

      // Calculate stats
      const dates = Object.keys(newData)
      const totalDays = dates.length
      const presentDays = dates.filter(
        (d) =>
          newData[d].status === 'present' ||
          newData[d].status === 'field_trip' ||
          newData[d].status === 'homeschool_group'
      ).length
      const absentDays = dates.filter((d) => newData[d].status === 'absent').length

      const dataJson = JSON.stringify(newData)

      if (existing.data) {
        // UPDATE - ✅ All values are strings/numbers
        await db.runAsync(
          `UPDATE attendance_records 
           SET attendance_data = ?, total_days = ?, present_days = ?, absent_days = ?, updated_at = datetime('now')
           WHERE student_id = ? AND school_year = ?`,
          [dataJson, totalDays, presentDays, absentDays, update.studentId, schoolYear]
           )
      } else {
        // INSERT - ✅ All values are strings/numbers
        await db.runAsync(
          `INSERT INTO attendance_records 
           (id, student_id, school_year, attendance_data, total_days, present_days, absent_days, user_id)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            record.id as string,
            record.student_id as string,
            record.school_year as string,
            dataJson,
            totalDays,
            presentDays,
            absentDays,
            userId,
          ]
        )
      }
    }
    return { error: null }
  } catch (error) {
    console.error('Bulk upsert error:', error)
    return { error: 'Database update failed' }
  }
}

// Initialize on import
initDatabase().catch(console.error)

export default db