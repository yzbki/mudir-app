import { useEffect, useMemo, useState } from 'react'
import Calendar from 'react-calendar'
import 'react-calendar/dist/Calendar.css'
import type { Business, BusinessMember, BusinessRole } from '../types/Business'
import type { User } from '../types/User'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080'

type Shift = {
  id: number
  businessId: number
  userId: number
  userName: string
  title?: string | null
  role?: string | null
  date: string
  startTime: string
  endTime: string
}

type ScheduleProps = {
  user: User | null
  businesses: Business[]
  selectedBusinessId: number | null
}

const formatDateKey = (date: Date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const getStartOfWeek = (date: Date) => {
  const start = new Date(date)
  start.setHours(0, 0, 0, 0)
  const dayIndex = start.getDay()
  const mondayOffset = dayIndex === 0 ? -6 : 1 - dayIndex
  start.setDate(start.getDate() + mondayOffset)
  return start
}

const addDays = (date: Date, days: number) => {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

const parseDateValue = (value: string) => {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, month - 1, day)
}

function Schedule({ user, businesses, selectedBusinessId }: ScheduleProps) {
  const [selectedScheduleDate, setSelectedScheduleDate] = useState(new Date())
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('')
  const [selectedShiftDate, setSelectedShiftDate] = useState(() => formatDateKey(new Date()))
  const [shiftStart, setShiftStart] = useState('')
  const [shiftEnd, setShiftEnd] = useState('')
  const [members, setMembers] = useState<BusinessMember[]>([])
  const [shifts, setShifts] = useState<Shift[]>([])
  const [selectedShiftId, setSelectedShiftId] = useState<number | null>(null)
  const [message, setMessage] = useState('')

  const currentBusiness = businesses.find((business) => business.id === selectedBusinessId) || null
  const ownerId = currentBusiness?.ownerId ?? null
  const currentUserRole: BusinessRole =
    currentBusiness && members.length > 0
      ? members.find((member) => member.userId === user?.id)?.role ?? (user?.id === ownerId ? 'OWNER' : 'EMPLOYEE')
      : user?.id === ownerId
        ? 'OWNER'
        : 'EMPLOYEE'
  const canManageSchedule = currentUserRole === 'OWNER' || currentUserRole === 'MANAGER'

  const getToken = () => localStorage.getItem('token') || sessionStorage.getItem('token') || ''

  const loadMembers = async () => {
    if (!selectedBusinessId) {
      setMembers([])
      return
    }

    const token = getToken()
    if (!token) return

    try {
      const response = await fetch(`${API_BASE_URL}/api/businesses/${selectedBusinessId}/members`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) throw new Error('Failed to fetch business members')

      const data = await response.json()
      setMembers(data)
    } catch (error) {
      console.error(error)
    }
  }

  const loadShifts = async () => {
    if (!selectedBusinessId) {
      setShifts([])
      return
    }

    const token = getToken()
    if (!token) return

    try {
      const response = await fetch(`${API_BASE_URL}/api/businesses/${selectedBusinessId}/shifts`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) throw new Error('Failed to fetch shifts')

      const data = await response.json()
      setShifts(data)
    } catch (error) {
      console.error(error)
    }
  }

  useEffect(() => {
    if (!selectedBusinessId) {
      setMembers([])
      setShifts([])
      return
    }

    loadMembers()
    loadShifts()
  }, [selectedBusinessId])

  useEffect(() => {
    setSelectedShiftDate(formatDateKey(selectedScheduleDate))
  }, [selectedScheduleDate])

  useEffect(() => {
    if (!members.length) {
      setSelectedEmployeeId('')
      return
    }

    if (!selectedEmployeeId || !members.some((member) => String(member.userId) === selectedEmployeeId)) {
      setSelectedEmployeeId(String(members[0].userId))
    }
  }, [members, selectedEmployeeId])

  const currentWeekDates = useMemo(() => {
    const weekStart = getStartOfWeek(selectedScheduleDate)
    return Array.from({ length: 7 }, (_, index) => addDays(weekStart, index))
  }, [selectedScheduleDate])

  const weekStartDate = getStartOfWeek(selectedScheduleDate)
  const weekEndDate = addDays(weekStartDate, 6)

  const shiftsForSelectedWeek = shifts.filter((shift) => {
    const shiftDate = parseDateValue(shift.date)
    return shiftDate >= weekStartDate && shiftDate <= weekEndDate
  })

  const getShiftListForDate = (day: Date) => {
    const key = formatDateKey(day)
    return shiftsForSelectedWeek.filter((shift) => shift.date === key)
  }

  const handleScheduleShift = async () => {
    if (!canManageSchedule) {
      setMessage('Only the owner or a manager can schedule shifts.')
      return
    }

    if (!selectedBusinessId) {
      setMessage('Select a business before scheduling a shift.')
      return
    }

    if (!selectedEmployeeId) {
      setMessage('Select an employee to schedule.')
      return
    }

    const trimmedStart = shiftStart.trim()
    const trimmedEnd = shiftEnd.trim()

    if (!trimmedStart || !trimmedEnd) {
      setMessage('Enter a shift start and end time.')
      return
    }

    const token = getToken()
    if (!token) {
      setMessage('You must be signed in to schedule a shift.')
      return
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/businesses/${selectedBusinessId}/shifts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          userId: Number(selectedEmployeeId),
          date: selectedShiftDate,
          startTime: trimmedStart,
          endTime: trimmedEnd,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(typeof data === 'string' ? data : 'Failed to create shift')
      }

      setMessage('Shift scheduled successfully.')
      setSelectedShiftId(null)
      setShiftStart('')
      setShiftEnd('')
      await loadShifts()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Failed to create shift')
    }
  }

  const handleDeleteShift = async (shiftId: number) => {
    if (!selectedBusinessId || !canManageSchedule) {
      return
    }

    const token = getToken()
    if (!token) {
      setMessage('You must be signed in to delete a shift.')
      return
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/businesses/${selectedBusinessId}/shifts/${shiftId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      const data = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(typeof data === 'string' ? data : 'Failed to delete shift')
      }

      setMessage('Shift deleted successfully.')
      setSelectedShiftId(null)
      await loadShifts()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Failed to delete shift')
    }
  }

  if (!currentBusiness) {
    return (
      <>
        <div className="page-header">
          <div>
            <h1>Schedule</h1>
            <p className="page-subtitle">Plan your weekly workload.</p>
          </div>
        </div>

        <div className="empty-state">
          <h2>No business selected</h2>
          <p>Create or select a business on the dashboard to view your schedule.</p>
        </div>
      </>
    )
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Schedule</h1>
          <p className="page-subtitle">View {currentBusiness.name} schedule.</p>
        </div>
      </div>

      <div className="business-section schedule-section">
        <h2>Schedule</h2>

        <div className="schedule-layout">
          <Calendar
            value={selectedScheduleDate}
            onChange={(value) => {
              if (value instanceof Date) {
                setSelectedScheduleDate(value)
              }
            }}
            className="schedule-calendar"
          />

          {canManageSchedule && (
            <div className="schedule-manager-panel">
              <h3>Schedule shift</h3>

              <div className="schedule-manager-form">
                <select
                  className="role-select"
                  value={selectedEmployeeId}
                  onChange={(event) => setSelectedEmployeeId(event.target.value)}
                >
                  {members.map((member) => (
                    <option key={member.userId} value={String(member.userId)}>
                      {member.userName}
                      {member.title ? ` • ${member.title}` : ''}
                    </option>
                  ))}
                </select>

                <input
                  type="text"
                  readOnly
                  value={selectedShiftDate}
                  onChange={() => undefined}
                  placeholder="Selected date"
                />

                <input
                  type="text"
                  placeholder="Shift start"
                  value={shiftStart}
                  onChange={(event) => setShiftStart(event.target.value)}
                />

                <input
                  type="text"
                  placeholder="Shift end"
                  value={shiftEnd}
                  onChange={(event) => setShiftEnd(event.target.value)}
                />

                <button className="primary-button" onClick={handleScheduleShift}>
                  Schedule Shift
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="weekly-schedule-wrapper">
          <div className="weekly-schedule-header">{`Week of ${new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(weekStartDate)}`}</div>

          <div className="weekly-schedule-grid">
            {currentWeekDates.map((date) => {
              const isToday = date.toDateString() === new Date().toDateString()
              const dayShifts = getShiftListForDate(date)

              return (
                <div key={date.toDateString()} className={`weekly-day-box ${isToday ? 'is-today' : ''}`}>
                  <div className="weekly-day-header">
                    <span className="weekly-day-name">
                      {new Intl.DateTimeFormat('en-US', { weekday: 'short' }).format(date)}
                    </span>
                    <span className="weekly-day-date">
                      {new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(date)}
                    </span>
                  </div>

                  {dayShifts.length === 0 ? (
                    <div className="weekly-day-content">No shifts</div>
                  ) : (
                    <ul className="shift-list">
                      {dayShifts.map((shift) => {
                        const employeeName = shift.userName || 'Employee'
                        const employeeTitle = shift.title?.trim() || 'Employee'
                        const isSelected = selectedShiftId === shift.id

                        return (
                          <li key={shift.id} className={`shift-pill ${isSelected ? 'is-selected' : ''}`}>
                            <button
                              type="button"
                              className="shift-pill-button"
                              onClick={() => setSelectedShiftId(isSelected ? null : shift.id)}
                            >
                              {employeeName}, {employeeTitle}, {shift.startTime} to {shift.endTime}
                            </button>

                            {canManageSchedule && isSelected && (
                              <button
                                type="button"
                                className="shift-delete-button"
                                onClick={() => handleDeleteShift(shift.id)}
                              >
                                Delete Shift
                              </button>
                            )}
                          </li>
                        )
                      })}
                    </ul>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {message && <p className="message">{message}</p>}
    </>
  )
}

export default Schedule
