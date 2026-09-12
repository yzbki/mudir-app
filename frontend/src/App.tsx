import { useEffect, useState } from 'react'
import './App.css'
import confetti from 'canvas-confetti'
import type { User } from './types/User'
import Sidebar from './components/Sidebar'
import Dashboard from './pages/Dashboard'
import Users from './pages/Users'
import Employees from './pages/Employees'
import Inventory from './pages/Inventory'
import Tasks from './pages/Tasks'
import Customers from './pages/Customers'

function App() {
  // User Variables
  const [user, setUser] = useState<User | null>(null)
  const [users, setUsers] = useState<User[]>([])
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  // Login Variables
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [message, setMessage] = useState('Loading...')
  const [showPassword, setShowPassword] = useState(false)
  const [stayLoggedIn, setStayLoggedIn] = useState(false)

  // Page Variables
  const [page, setPage] = useState('dashboard')

  useEffect(() => {
    const token =
      localStorage.getItem('token') ||
      sessionStorage.getItem('token')

    if (!token) {
      setMessage('')
      return
    }

    fetch('http://localhost:8080/api/auth/me', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error('Invalid token')
        }

        return response.json()
      })
      .then((data) => {
        setUser(data)
        setMessage('')
      })
      .catch(() => {
        localStorage.removeItem('token')
        sessionStorage.removeItem('token')
        setUser(null)
        setMessage('')
      })
  }, [])

  const handleSubmit = async () => {
    const endpoint =
      mode === 'signup'
        ? '/api/auth/register'
        : '/api/auth/login'

    const body =
      mode === 'signup'
        ? { name, email, password }
        : { email, password }

    try {
      const response = await fetch(
        `http://localhost:8080${endpoint}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
        }
      )

      const data = await response.json()

      if (!response.ok) {
        setMessage(
          typeof data === 'string'
            ? data
            : 'Something went wrong'
        )
        return
      }

      if (mode === 'signup') {
        confetti({
          particleCount: 200,
          spread: 100,
          origin: { y: 0.6 },
        })

        setName('')
        setEmail('')
        setPassword('')
        setMode('login')
        setMessage('Account created. Please log in.')
        return
      }

      if (stayLoggedIn) {
        localStorage.setItem('token', data.token)
      } else {
        sessionStorage.setItem('token', data.token)
      }

      setUser({
        id: data.id,
        name: data.name,
        email: data.email,
      })

      setName('')
      setEmail('')
      setPassword('')
      setMessage('')
    } catch (error) {
      console.error(error)
      setMessage('Failed to connect to backend')
    }
  }

  const logout = () => {
    localStorage.removeItem('token')
    sessionStorage.removeItem('token')
    setUser(null)
    setMessage('')
  }

  const deleteAccount = async () => {
    const token =
      localStorage.getItem('token') ||
      sessionStorage.getItem('token')

    if (!token) return

    const confirmed = window.confirm(
      'Are you sure you want to delete your account?'
    )

    if (!confirmed) return

    const response = await fetch(
      'http://localhost:8080/api/auth/account',
      {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    )

    if (response.ok) {
      localStorage.removeItem('token')
      sessionStorage.removeItem('token')
      setUser(null)
      setMessage('Account deleted successfully')
    } else {
      setMessage('Failed to delete account')
    }
  }

  const loadUsers = async () => {
  const token =
    localStorage.getItem('token') ||
    sessionStorage.getItem('token')

  if (!token) return

  try {
    const response = await fetch(
      'http://localhost:8080/api/users',
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    )

    if (!response.ok) {
      throw new Error('Failed to fetch users')
    }

    const data = await response.json()

    setUsers(data)
    } catch (error) {
      console.error(error)
    }
  }

  return (
    <div className="app">

      <Sidebar
        setPage={setPage}
        loadUsers={loadUsers}
        user={user}
        logout={logout}
        setMode={setMode}
      />

      <main className="main-content">

        {!user ? (
          <div className="auth-container">

            <h1>
              {mode === 'login'
                ? 'Welcome back'
                : 'Create your account'}
            </h1>

            <p className="auth-subtitle">
              {mode === 'login'
                ? 'Log in to your Mudir account.'
                : 'Create an account to get started.'}
            </p>

            {mode === 'signup' && (
              <input
                type="text"
                placeholder="Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            )}

            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <div className="password-container">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />

              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? 'HIDE' : 'SHOW'}
              </button>
            </div>

            { mode === 'login' && (
              <label className="stay-logged-in">
                <input
                  type="checkbox"
                  checked={stayLoggedIn}
                  onChange={(e) => setStayLoggedIn(e.target.checked)}
                />
                Stay logged in
              </label>
            )}

            <button
              className="primary-button"
              onClick={handleSubmit}
            >
              {mode === 'login' ? 'Login' : 'Sign Up'}
            </button>

            <button
              className="switch-button"
              onClick={() => {
                setMode(
                  mode === 'login'
                    ? 'signup'
                    : 'login'
                )
                setMessage('')
              }}
            >
              {mode === 'login'
                ? 'Create an account'
                : 'Already have an account? Log in'}
            </button>

            {message && (
              <p className="message">{message}</p>
            )}

          </div>
        ) : (
          <div className="account-container">

          {page === 'dashboard' && (
            <Dashboard
              user={user}
              deleteAccount={deleteAccount}
            />
          )}

          {page === 'users' && (
            <Users users={users}/>
          )}

          {page === 'employees' && (
            <Employees />
          )}

          {page === 'customers' && (
            <Customers />
          )}

          {page === 'inventory' && (
            <Inventory />
          )}

          {page === 'tasks' && (
            <Tasks />
          )}

        </div>
        )}

      </main>
    </div>
  )
}

export default App