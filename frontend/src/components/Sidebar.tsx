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
            <img src="/interface-icons/dashboard.svg" alt="" />
            Dashboard
          </button>

          <button onClick={() => setPage('employees')}>
            <img src="/interface-icons/employees.svg" alt="" />
            Employees
          </button>

          <button onClick={() => setPage('inventory')}>
            <img src="/interface-icons/inventory.svg" alt="" />
            Inventory
          </button>

          <button onClick={() => setPage('tasks')}>
            <img src="/interface-icons/tasks.svg" alt="" />
            Tasks
          </button>

          <button onClick={() => setPage('customers')}>
            <img src="/interface-icons/customers.svg" alt="" />
            Customers
          </button>

          <button
            onClick={() => {
              setPage('users')
              loadUsers()
            }}
          >
            <img src="/interface-icons/users.svg" alt="" />
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