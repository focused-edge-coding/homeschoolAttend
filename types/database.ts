export interface Student {
  id: string
  name: string
  dob: string
  address?: string
  city?: string
  state?: string
  zip_code?: string
  school_id?: string | null
  user_id: string
  created_at?: string
}

export interface AttendanceDay {
  status: 'present' | 'absent' | 'field_trip' | 'homeschool_group'
  notes?: string
}

export interface AttendanceRecord {
  id: string
  student_id: string
  school_year: string  // e.g., "2025-2026"
  attendance_data: Record<string, AttendanceDay>  // date: AttendanceDay
  total_days: number
  present_days: number
  absent_days: number
  updated_at: string
  user_id: string
}
