import { useEffect, useState } from 'react'
import type { User } from '../types/User'

import type { Business } from '../types/Business'

type SidebarProps = {
  setPage: (page: string) => void
  user: User | null
  logout: () => void
  setMode: (mode: 'login' | 'signup') => void
  isLoginPage: boolean
  businesses: Business[]
  selectedBusinessId: number | null
}

function Sidebar({
  setPage,
  user,
  logout,
  setMode,
  isLoginPage,
  businesses,
  selectedBusinessId,
}: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.innerWidth < 768
  })

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setIsCollapsed(true)
      }
    }

    handleResize()
    window.addEventListener('resize', handleResize)

    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const selectedBusiness = businesses.find((business) => business.id === selectedBusinessId) || null
  const enabledPageSet = new Set(selectedBusiness?.enabledPages ?? ['dashboard', 'employees', 'profile', 'schedule', 'inventory', 'tasks', 'customers'])
  const isPageEnabled = (pageKey: string) => {
    if (pageKey === 'dashboard' || pageKey === 'employees' || pageKey === 'profile') {
      return true
    }

    return enabledPageSet.has(pageKey)
  }

  return (
    <aside className={`sidebar${isCollapsed ? ' sidebar-collapsed' : ''}`}>
      <div className="sidebar-header">
        <div className="logo">Mudir</div>
        <button
          type="button"
          className="sidebar-toggle"
          onClick={() => setIsCollapsed(!isCollapsed)}
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-expanded={!isCollapsed}
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <span />
          <span />
          <span />
        </button>
      </div>

      <nav className="navigation">
        <button aria-label="Dashboard" title="Dashboard" disabled={!user} onClick={() => setPage('dashboard')}>
          <img src="/interface-icons/dashboard.svg" alt="" />
          <span>Dashboard</span>
        </button>

        <button aria-label="Employees" title="Employees" disabled={!user} onClick={() => setPage('employees')}>
          <img src="/interface-icons/employees.svg" alt="" />
          <span>Employees</span>
        </button>

        {isPageEnabled('schedule') && (
          <button aria-label="Schedule" title="Schedule" disabled={!user} onClick={() => setPage('schedule')}>
            <img src="/interface-icons/schedule.svg" alt="" />
            <span>Schedule</span>
          </button>
        )}

        {isPageEnabled('inventory') && (
          <button aria-label="Inventory" title="Inventory" disabled={!user} onClick={() => setPage('inventory')}>
            <img src="/interface-icons/inventory.svg" alt="" />
            <span>Inventory</span>
          </button>
        )}

        {isPageEnabled('tasks') && (
          <button aria-label="Tasks" title="Tasks" disabled={!user} onClick={() => setPage('tasks')}>
            <img src="/interface-icons/tasks.svg" alt="" />
            <span>Tasks</span>
          </button>
        )}

        {isPageEnabled('customers') && (
          <button aria-label="Customers" title="Customers" disabled={!user} onClick={() => setPage('customers')}>
            <img src="/interface-icons/customers.svg" alt="" />
            <span>Customers</span>
          </button>
        )}

        <button
          aria-label="Profile"
          title="Profile"
          disabled={!user}
          onClick={() => setPage('profile')}
        >
          <img src="/interface-icons/users.svg" alt="" />
          <span>Profile</span>
        </button>
      </nav>

      <button
        className={`login-button${isLoginPage ? ' login-button-active' : ''}`}
        onClick={user ? logout : () => setMode('login')}
        aria-label={user ? 'Logout' : 'Login'}
        title={user ? 'Logout' : 'Login'}
        aria-current={isLoginPage ? 'page' : undefined}
      >
        <span className="login-icon" aria-hidden="true">↪</span>
        <span>{user ? 'Logout' : 'Login'}</span>
      </button>
    </aside>
  )
}

export default Sidebar