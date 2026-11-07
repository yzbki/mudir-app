import { useEffect, useMemo, useState, type CSSProperties } from 'react'
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

type CalendarView = 'month' | 'year' | 'decade' | 'century'

const getStartOfMonth =(date: Date) => new Date(date.getFullYear(), date.getMonth(), 1)

const addDays = (date: Date, days: number) => {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

const parseDateValue = (value: string) => {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, month - 1, day)
}

// e.g. "Nov 2 – Nov 8, 2026" (start year shown only when the week spans two years)
const formatWeekRange = (start: Date, end: Date) => {
  const sameYear = start.getFullYear() === end.getFullYear()
  const startLabel = new Intl.DateTimeFormat('en-US', sameYear
    ? { month: 'short', day: 'numeric' }
    : { month: 'short', day: 'numeric', year: 'numeric' }).format(start)
  const endLabel = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(end)
  return `${startLabel} – ${endLabel}`
}

type ShiftDraft = {
  userId: string
  date: string
  startTime: string
  endTime: string
}

// Shift times are free text ("9:00", "17:30", "9am", "5:30 PM"); parse what we can so a day's
// shifts list in chronological order. Unparseable values sort last.
const parseTimeToMinutes = (value: string) => {
  const match = value.trim().toLowerCase().match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/)
  if (!match) return Number.MAX_SAFE_INTEGER

  let hours = Number(match[1]) % 24
  const minutes = Number(match[2] ?? 0)
  const meridiem = match[3]
  if (meridiem === 'pm' && hours < 12) hours += 12
  if (meridiem === 'am' && hours === 12) hours = 0
  return hours * 60 + minutes
}

// Shift cards use the colour set for the employee on the Employees page; no colour = neutral card.
const getShiftColorStyle = (color: string | null | undefined) =>
  (color ? { '--shift-accent': color, '--shift-time-color': color } : {}) as CSSProperties

function Schedule({ user, businesses, selectedBusinessId }: ScheduleProps) {
  const [selectedScheduleDate, setSelectedScheduleDate] = useState(new Date())
  // The month the calendar is showing. Controlled so that jumping to a date
  // (Today button, week arrows, day headers) also scrolls the calendar to it.
  const [calendarActiveStartDate, setCalendarActiveStartDate] = useState(() => getStartOfMonth(new Date()))
  // Which zoom level the calendar is on (days / months / years / decades). Controlled so jumping
  // to a date always returns to the day grid, even if the user had drilled up to a year or decade.
  const [calendarView, setCalendarView] = useState<CalendarView>('month')

  const goToDate = (date: Date) => {
    setSelectedScheduleDate(date)
    setCalendarActiveStartDate(getStartOfMonth(date))
    setCalendarView('month')
  }
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('')
  const [selectedShiftDate, setSelectedShiftDate] = useState(() => formatDateKey(new Date()))
  const [shiftStart, setShiftStart] = useState('')
  const [shiftEnd, setShiftEnd] = useState('')
  const [members, setMembers] = useState<BusinessMember[]>([])
  const [shifts, setShifts] = useState<Shift[]>([])
  const [selectedShiftId, setSelectedShiftId] = useState<number | null>(null)
  const [editingShiftId, setEditingShiftId] = useState<number | null>(null)
  const [shiftDraft, setShiftDraft] = useState<ShiftDraft | null>(null)
  const [isSavingShift, setIsSavingShift] = useState(false)
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

  const todayKey = formatDateKey(new Date())

  const getShiftListForDate = (day: Date) => {
    const key = formatDateKey(day)
    return shiftsForSelectedWeek
      .filter((shift) => shift.date === key)
      .sort((a, b) => parseTimeToMinutes(a.startTime) - parseTimeToMinutes(b.startTime) || a.startTime.localeCompare(b.startTime))
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

  const startEditingShift = (shift: Shift) => {
    setSelectedShiftId(shift.id)
    setEditingShiftId(shift.id)
    setShiftDraft({
      userId: String(shift.userId),
      date: shift.date,
      startTime: shift.startTime,
      endTime: shift.endTime,
    })
  }

  const cancelEditingShift = () => {
    setEditingShiftId(null)
    setShiftDraft(null)
  }

  const handleUpdateShift = async (shiftId: number) => {
    if (!selectedBusinessId || !canManageSchedule || !shiftDraft) {
      return
    }

    const startTime = shiftDraft.startTime.trim()
    const endTime = shiftDraft.endTime.trim()

    if (!shiftDraft.userId || !shiftDraft.date || !startTime || !endTime) {
      setMessage('Employee, date, start and end time are all required.')
      return
    }

    const token = getToken()
    if (!token) {
      setMessage('You must be signed in to edit a shift.')
      return
    }

    setIsSavingShift(true)
    try {
      const response = await fetch(`${API_BASE_URL}/api/businesses/${selectedBusinessId}/shifts/${shiftId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          userId: Number(shiftDraft.userId),
          date: shiftDraft.date,
          startTime,
          endTime,
        }),
      })

      const text = await response.text()
      let data: unknown = text
      try {
        data = text ? JSON.parse(text) : null
      } catch {
        // plain-text error body
      }

      if (!response.ok) {
        throw new Error(typeof data === 'string' && data ? data : 'Failed to update shift')
      }

      setMessage('Shift updated successfully.')
      setEditingShiftId(null)
      setShiftDraft(null)
      setSelectedShiftId(null)
      await loadShifts()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Failed to update shift')
    } finally {
      setIsSavingShift(false)
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
        <div className="schedule-section-header">
          <h2>Schedule</h2>
          <button
            type="button"
            className="calendar-reset-button"
            onClick={() => goToDate(new Date())}
            title="Return the calendar to today's date and month"
          >
            Reset to Today
          </button>
        </div>

        <div className="schedule-layout">
          <Calendar
            value={selectedScheduleDate}
            activeStartDate={calendarActiveStartDate}
            onActiveStartDateChange={({ activeStartDate }) => {
              if (activeStartDate) {
                setCalendarActiveStartDate(activeStartDate)
              }
            }}
            view={calendarView}
            onViewChange={({ view }) => setCalendarView(view)}
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
          <div className="weekly-schedule-toolbar">
            <div className="weekly-schedule-heading">
              <span className="weekly-schedule-eyebrow">Weekly planner</span>
              <h3 className="weekly-schedule-range">{formatWeekRange(weekStartDate, weekEndDate)}</h3>
              <span className="weekly-schedule-summary">
                {shiftsForSelectedWeek.length === 0
                  ? 'No shifts scheduled this week'
                  : `${shiftsForSelectedWeek.length} shift${shiftsForSelectedWeek.length === 1 ? '' : 's'} this week`}
              </span>
            </div>

            <div className="weekly-schedule-nav">
              <button
                type="button"
                className="week-nav-button"
                onClick={() => goToDate(addDays(selectedScheduleDate, -7))}
                aria-label="Previous week"
              >
                ‹
              </button>
              <button
                type="button"
                className="week-nav-button week-nav-today"
                onClick={() => goToDate(new Date())}
              >
                This week
              </button>
              <button
                type="button"
                className="week-nav-button"
                onClick={() => goToDate(addDays(selectedScheduleDate, 7))}
                aria-label="Next week"
              >
                ›
              </button>
            </div>
          </div>

          {[currentWeekDates.slice(0, 4), currentWeekDates.slice(4)].map((rowDates, rowIndex) => (
            <div
              key={rowIndex}
              className={`weekly-schedule-row ${rowIndex === 0 ? 'weekly-schedule-row-weekdays' : 'weekly-schedule-row-weekend'}`}
            >
              {rowDates.map((date) => {
                const dateKey = formatDateKey(date)
                const isToday = dateKey === todayKey
                const isSelectedDay = dateKey === selectedShiftDate
                const isWeekend = date.getDay() === 0 || date.getDay() === 6
                const dayShifts = getShiftListForDate(date)

                return (
                  <section
                    key={dateKey}
                    className={[
                      'weekly-day-box',
                      isToday ? 'is-today' : '',
                      isSelectedDay ? 'is-selected-day' : '',
                      isWeekend ? 'is-weekend' : '',
                    ].join(' ')}
                    aria-label={new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric' }).format(date)}
                  >
                    <button
                      type="button"
                      className="weekly-day-header"
                      onClick={() => goToDate(date)}
                      title="Select this day"
                    >
                      <span className="weekly-day-number">{date.getDate()}</span>
                      <span className="weekly-day-label">
                        <span className="weekly-day-name">
                          {new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(date)}
                        </span>
                        <span className="weekly-day-date">
                          {new Intl.DateTimeFormat('en-US', { month: 'short' }).format(date)}
                        </span>
                      </span>
                      <span className="weekly-day-badges">
                        {isToday && <span className="weekly-day-badge is-today-badge">Today</span>}
                        {dayShifts.length > 0 && (
                          <span className="weekly-day-badge">
                            {dayShifts.length} shift{dayShifts.length === 1 ? '' : 's'}
                          </span>
                        )}
                      </span>
                    </button>

                    {dayShifts.length === 0 ? (
                      <div className="weekly-day-content">
                        <span className="weekly-day-empty-dot" aria-hidden="true" />
                        No shifts
                      </div>
                    ) : (
                      <ul className="shift-list">
                        {dayShifts.map((shift) => {
                          const employeeName = shift.userName || 'Employee'
                          const employeeTitle = shift.title?.trim() || 'Employee'
                          const isSelected = selectedShiftId === shift.id
                          const isEditing = canManageSchedule && editingShiftId === shift.id && shiftDraft !== null
                          const colorUserId = isEditing ? Number(shiftDraft.userId) : shift.userId
                          const memberColor = members.find((member) => member.userId === colorUserId)?.color

                          return (
                            <li
                              key={shift.id}
                              className={`shift-card ${isSelected ? 'is-selected' : ''} ${isEditing ? 'is-editing' : ''}`}
                              style={getShiftColorStyle(memberColor)}
                            >
                              {isEditing ? (
                                <form
                                  className="shift-edit-form"
                                  onSubmit={(event) => {
                                    event.preventDefault()
                                    handleUpdateShift(shift.id)
                                  }}
                                >
                                  <label className="shift-edit-field">
                                    <span>Employee</span>
                                    <select
                                      value={shiftDraft.userId}
                                      onChange={(event) => setShiftDraft({ ...shiftDraft, userId: event.target.value })}
                                    >
                                      {members.map((member) => (
                                        <option key={member.userId} value={String(member.userId)}>
                                          {member.userName}
                                        </option>
                                      ))}
                                    </select>
                                  </label>

                                  <label className="shift-edit-field">
                                    <span>Date</span>
                                    <input
                                      type="date"
                                      value={shiftDraft.date}
                                      onChange={(event) => setShiftDraft({ ...shiftDraft, date: event.target.value })}
                                    />
                                  </label>

                                  <div className="shift-edit-times">
                                    <label className="shift-edit-field">
                                      <span>Start</span>
                                      <input
                                        type="text"
                                        value={shiftDraft.startTime}
                                        onChange={(event) => setShiftDraft({ ...shiftDraft, startTime: event.target.value })}
                                        placeholder="09:00"
                                      />
                                    </label>
                                    <label className="shift-edit-field">
                                      <span>End</span>
                                      <input
                                        type="text"
                                        value={shiftDraft.endTime}
                                        onChange={(event) => setShiftDraft({ ...shiftDraft, endTime: event.target.value })}
                                        placeholder="17:00"
                                      />
                                    </label>
                                  </div>

                                  <div className="shift-card-actions">
                                    <button type="submit" className="shift-action-button is-primary" disabled={isSavingShift}>
                                      {isSavingShift ? 'Saving…' : 'Save'}
                                    </button>
                                    <button
                                      type="button"
                                      className="shift-action-button"
                                      onClick={cancelEditingShift}
                                      disabled={isSavingShift}
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                </form>
                              ) : (
                                <>
                                  <button
                                    type="button"
                                    className="shift-card-button"
                                    onClick={() => {
                                      setSelectedShiftId(isSelected ? null : shift.id)
                                      cancelEditingShift()
                                    }}
                                    aria-expanded={canManageSchedule ? isSelected : undefined}
                                  >
                                    <span className="shift-card-time">
                                      {shift.startTime}
                                      <span className="shift-card-time-sep" aria-hidden="true">–</span>
                                      {shift.endTime}
                                    </span>
                                    <span className="shift-card-name">{employeeName}</span>
                                    <span className="shift-card-title">{employeeTitle}</span>
                                  </button>

                                  {canManageSchedule && isSelected && (
                                    <div className="shift-card-actions">
                                      <button
                                        type="button"
                                        className="shift-action-button"
                                        onClick={() => startEditingShift(shift)}
                                      >
                                        Edit
                                      </button>
                                      <button
                                        type="button"
                                        className="shift-action-button is-danger"
                                        onClick={() => handleDeleteShift(shift.id)}
                                      >
                                        Delete
                                      </button>
                                    </div>
                                  )}
                                </>
                              )}
                            </li>
                          )
                        })}
                      </ul>
                    )}
                  </section>
                )
              })}
            </div>
          ))}
        </div>
      </div>

      {message && <p className="message">{message}</p>}
    </>
  )
}

export default Schedule
