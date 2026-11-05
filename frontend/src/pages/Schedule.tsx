import { useState } from 'react'
import Calendar from 'react-calendar'
import 'react-calendar/dist/Calendar.css'
import type { Business } from '../types/Business'

type ScheduleProps = {
  businesses: Business[]
  selectedBusinessId: number | null
}

function Schedule({ businesses, selectedBusinessId }: ScheduleProps) {
  const [selectedScheduleDate, setSelectedScheduleDate] = useState(new Date())

  const currentBusiness = businesses.find((business) => business.id === selectedBusinessId) || null
  const today = new Date()

  const currentWeekDates = (() => {
    const startOfWeek = new Date(today)
    const dayIndex = startOfWeek.getDay()
    const daysFromMonday = dayIndex === 0 ? -6 : 1 - dayIndex

    startOfWeek.setHours(0, 0, 0, 0)
    startOfWeek.setDate(today.getDate() + daysFromMonday)

    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(startOfWeek)
      date.setDate(startOfWeek.getDate() + index)
      return date
    })
  })()

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

        <Calendar
          value={selectedScheduleDate}
          onChange={(value) => {
            if (value instanceof Date) {
              setSelectedScheduleDate(value)
            }
          }}
          className="schedule-calendar"
        />

        <div className="weekly-schedule-wrapper">
          <div className="weekly-schedule-header">This week</div>

          <div className="weekly-schedule-grid">
            {currentWeekDates.map((date) => {
              const isToday = date.toDateString() === today.toDateString()

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
                  <div className="weekly-day-content">No shifts</div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </>
  )
}

export default Schedule
