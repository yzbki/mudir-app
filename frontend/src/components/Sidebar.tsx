import { useState } from 'react'
import type { User } from '../types/User'

type SidebarProps = {
  setPage: (page: string) => void
  loadUsers: () => void
  user: User | null
  logout: () => void
  setMode: (mode: 'login' | 'signup') => void
}

function Sidebar({
  setPage,
  loadUsers,
  user,
  logout,
  setMode,
}: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)

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
        <button aria-label="Dashboard" title="Dashboard" onClick={() => setPage('dashboard')}>
          <img src="/interface-icons/dashboard.svg" alt="" />
          <span>Dashboard</span>
        </button>

        <button aria-label="Employees" title="Employees" onClick={() => setPage('employees')}>
          <img src="/interface-icons/employees.svg" alt="" />
          <span>Employees</span>
        </button>

        <button aria-label="Inventory" title="Inventory" onClick={() => setPage('inventory')}>
          <img src="/interface-icons/inventory.svg" alt="" />
          <span>Inventory</span>
        </button>

        <button aria-label="Tasks" title="Tasks" onClick={() => setPage('tasks')}>
          <img src="/interface-icons/tasks.svg" alt="" />
          <span>Tasks</span>
        </button>

        <button aria-label="Customers" title="Customers" onClick={() => setPage('customers')}>
          <img src="/interface-icons/customers.svg" alt="" />
          <span>Customers</span>
        </button>

        <button
          aria-label="Users"
          title="Users"
          onClick={() => {
            setPage('users')
            loadUsers()
          }}
        >
          <img src="/interface-icons/users.svg" alt="" />
          <span>Users</span>
        </button>
      </nav>

      <button
        className="login-button"
        onClick={user ? logout : () => setMode('login')}
        aria-label={user ? 'Logout' : 'Login'}
        title={user ? 'Logout' : 'Login'}
      >
        <span className="login-icon" aria-hidden="true">↪</span>
        <span>{user ? 'Logout' : 'Login'}</span>
      </button>
    </aside>
  )
}

export default Sidebar