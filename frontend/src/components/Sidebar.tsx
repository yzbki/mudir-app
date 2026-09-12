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
  return (
    <aside className="sidebar">
        <div className="logo">MUDIR</div>

        <nav className="navigation">
          <button onClick={() => setPage('dashboard')}>
            Dashboard
          </button>

          <button onClick={() => setPage('employees')}>
            Employees
          </button>

          <button onClick={() => setPage('customers')}>
            Customers
          </button>

          <button onClick={() => setPage('inventory')}>
            Inventory
          </button>

          <button onClick={() => setPage('tasks')}>
            Tasks
          </button>

          <button
            onClick={() => {
              setPage('users')
              loadUsers()
            }}
          >
            Users
          </button>
        </nav>

        <button
          className="login-button"
          onClick={user ? logout : () => setMode('login')}
        >
          {user ? 'Logout' : 'Login'}
        </button>
      </aside>
  )
}

export default Sidebar