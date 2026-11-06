import { useEffect, useRef, useState } from 'react'
import './App.css'
import confetti from 'canvas-confetti'
import type { Business } from './types/Business'
import type { User } from './types/User'
import Sidebar from './components/Sidebar'
import Dashboard from './pages/Dashboard'
import Profile from './pages/Profile'
import Employees from './pages/Employees'
import Schedule from './pages/Schedule'
import Inventory from './pages/Inventory'
import Tasks from './pages/Tasks'
import Customers from './pages/Customers'

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (options: {
            client_id: string
            callback: (response: { credential: string }) => void
            auto_select?: boolean
            cancel_on_tap_outside?: boolean
          }) => void
          renderButton: (
            element: HTMLElement,
            options: {
              theme?: 'outline' | 'filled_blue'
              size?: 'large' | 'medium'
              width?: string | number
              text?: string
              shape?: 'rectangular' | 'pill'
              logo_alignment?: 'left' | 'center'
            },
          ) => void
          prompt: (options?: {
            auto_select?: boolean
            cancel_on_tap_outside?: boolean
          }) => void
        }
      }
    }
  }
}

function App() {
  const [user, setUser] = useState<User | null>(null)
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [selectedBusinessId, setSelectedBusinessId] = useState<number | null>(null)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [message, setMessage] = useState('Loading...')
  const [showPassword, setShowPassword] = useState(false)
  const [stayLoggedIn, setStayLoggedIn] = useState(false)
  const googleButtonRef = useRef<HTMLDivElement | null>(null)
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080'

  const [page, setPage] = useState('dashboard')

  const isPageEnabled = (targetPage: string, targetBusinessId: number | null) => {
    if (targetPage === 'dashboard' || targetPage === 'employees' || targetPage === 'profile') {
      return true
    }

    const selectedBusiness = businesses.find((business) => business.id === targetBusinessId) || null
    const enabledPages = selectedBusiness?.enabledPages ?? ['dashboard', 'employees', 'profile', 'schedule', 'inventory', 'tasks', 'customers']
    return enabledPages.includes(targetPage)
  }

  const loadBusinesses = async (explicitToken?: string) => {
    const token = explicitToken || localStorage.getItem('token') || sessionStorage.getItem('token')

    if (!token) {
      setBusinesses([])
      setSelectedBusinessId(null)
      return
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/businesses`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error('Failed to fetch businesses')
      }

      const data = await response.json()
      setBusinesses(data)

      if (data.length > 0) {
        setSelectedBusinessId((current) => {
          if (current && data.some((business: Business) => business.id === current)) {
            return current
          }
          return data[0].id
        })
      } else {
        setSelectedBusinessId(null)
      }
    } catch (error) {
      console.error(error)
    }
  }

  const ensureUserSession = async () => {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token')

    if (!token) {
      setMessage('')
      return
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error('Invalid token')
      }

      const data = await response.json()
      setUser(data)
      setMessage('')
    } catch (error) {
      console.error(error)
      localStorage.removeItem('token')
      sessionStorage.removeItem('token')
      setUser(null)
      setMessage('')
    }
  }

  useEffect(() => {
    ensureUserSession()
  }, [])

  useEffect(() => {
    if (!user) {
      setBusinesses([])
      setSelectedBusinessId(null)
      return
    }

    loadBusinesses()
  }, [user])

  useEffect(() => {
    if (!user || isPageEnabled(page, selectedBusinessId)) {
      return
    }

    setPage('dashboard')
  }, [page, selectedBusinessId, user, businesses])

  useEffect(() => {
    if (user || mode !== 'login') {
      return
    }

    if (!clientId) {
      setMessage('Google sign-in is not configured yet. Add VITE_GOOGLE_CLIENT_ID to frontend/.env and restart Vite.')
      return
    }

    const renderGoogleButton = () => {
      if (!window.google?.accounts?.id || !googleButtonRef.current) {
        return
      }

      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: handleGoogleCredentialResponse,
        auto_select: false,
        cancel_on_tap_outside: true,
      })

      googleButtonRef.current.innerHTML = ''
      window.google.accounts.id.renderButton(googleButtonRef.current, {
        theme: 'outline',
        size: 'large',
        width: '100%',
        text: 'continue_with',
        shape: 'pill',
        logo_alignment: 'left',
      })
    }

    const googleScript = document.querySelector('script[src*="accounts.google.com/gsi/client"]')

    if (!window.google?.accounts?.id) {
      if (googleScript) {
        googleScript.addEventListener('load', renderGoogleButton, { once: true })
      }
      return
    }

    renderGoogleButton()
  }, [user, mode, clientId])

  const finalizeLogin = async (data: { token: string; id: number; name: string; email: string }) => {
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
    await loadBusinesses(data.token)
  }

  const handleSubmit = async () => {
    const endpoint = mode === 'signup' ? '/api/auth/register' : '/api/auth/login'
    const body = mode === 'signup' ? { name, email, password } : { email, password }

    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      })

      const data = await response.json()

      if (!response.ok) {
        setMessage(typeof data === 'string' ? data : 'Something went wrong')
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

      await finalizeLogin(data)
    } catch (error) {
      console.error(error)
      setMessage('Failed to connect to backend')
    }
  }

  const handleGoogleLogin = async (googleEmail: string) => {
    const normalizedEmail = googleEmail.trim()

    if (!normalizedEmail) {
      setMessage('Google did not return an email.')
      return
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/google`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: normalizedEmail }),
      })

      const data = await response.json()

      if (!response.ok) {
        setMessage(typeof data === 'string' ? data : 'Google login failed')
        return
      }

      await finalizeLogin(data)
    } catch (error) {
      console.error(error)
      setMessage('Google login failed. Please try again.')
    }
  }

  const decodeGoogleCredential = (credential: string) => {
    const base64Url = credential.split('.')[1]
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=')
    const decoded = window.atob(padded)
    return JSON.parse(decoded) as { email?: string; name?: string }
  }

  const handleGoogleCredentialResponse = async (response: { credential: string }) => {
    const payload = decodeGoogleCredential(response.credential)
    const email = payload.email

    if (!email) {
      setMessage('Google did not return a valid email address.')
      return
    }

    await handleGoogleLogin(email)
  }

  const logout = () => {
    localStorage.removeItem('token')
    sessionStorage.removeItem('token')
    setUser(null)
    setBusinesses([])
    setSelectedBusinessId(null)
    setMessage('')
  }

  const deleteAccount = async () => {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token')

    if (!token) return

    const confirmed = window.confirm('Are you sure you want to delete your account?')

    if (!confirmed) return

    const response = await fetch(`${API_BASE_URL}/api/auth/account`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    if (response.ok) {
      localStorage.removeItem('token')
      sessionStorage.removeItem('token')
      setUser(null)
      setBusinesses([])
      setSelectedBusinessId(null)
      setMessage('Account deleted successfully')
    } else {
      setMessage('Failed to delete account')
    }
  }

  const updateUserProfile = async (name: string) => {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token')

    if (!token) return

    const response = await fetch(`${API_BASE_URL}/api/auth/account`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ name }),
    })

    const data = await parseResponseData(response)

    if (!response.ok) {
      throw new Error(typeof data === 'string' ? data : 'Failed to update profile')
    }

    setUser((currentUser) => {
      if (!currentUser) {
        return currentUser
      }

      const nextName = typeof data === 'object' && data && 'name' in data ? String(data.name) : currentUser.name

      return {
        ...currentUser,
        name: nextName,
      }
    })
  }

  const parseResponseData = async (response: Response) => {
    const text = await response.text()

    if (!text) {
      return null
    }

    try {
      return JSON.parse(text)
    } catch {
      return text
    }
  }

  const createBusiness = async (name: string) => {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token')

    if (!token || !name.trim()) return

    try {
      const response = await fetch(`${API_BASE_URL}/api/businesses`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: name.trim() }),
      })

      const data = await parseResponseData(response)

      if (!response.ok) {
        throw new Error(typeof data === 'string' ? data : 'Failed to create business')
      }

      await loadBusinesses(token)
      setPage('dashboard')
    } catch (error) {
      console.error(error)
    }
  }

  const updateBusinessDetails = async (
    businessId: number,
    details: { address: string; phone: string; description: string },
  ) => {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token')

    if (!token) return

    try {
      const response = await fetch(`${API_BASE_URL}/api/businesses/${businessId}/details`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(details),
      })

      const data = await parseResponseData(response)

      if (!response.ok) {
        throw new Error(typeof data === 'string' ? data : 'Failed to update business details')
      }

      await loadBusinesses(token)
      setPage('dashboard')
    } catch (error) {
      console.error(error)
      throw error
    }
  }

  const deleteBusiness = async (businessId: number) => {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token')

    if (!token) return

    try {
      const response = await fetch(`${API_BASE_URL}/api/businesses/${businessId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      const data = await parseResponseData(response)

      if (!response.ok) {
        throw new Error(typeof data === 'string' ? data : 'Failed to delete business')
      }

      await loadBusinesses(token)
      setPage('dashboard')
    } catch (error) {
      console.error(error)
      throw error
    }
  }

  return (
    <div className="app">
      <Sidebar
        setPage={setPage}
        user={user}
        logout={logout}
        setMode={setMode}
        isLoginPage={!user && mode === 'login'}
        businesses={businesses}
        selectedBusinessId={selectedBusinessId}
      />

      <main className="main-content">
        {!user ? (
          <div className="auth-container">
            <h1>{mode === 'login' ? 'Welcome back' : 'Create your account'}</h1>

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

            {mode === 'login' && (
              <label className="stay-logged-in">
                <input
                  type="checkbox"
                  checked={stayLoggedIn}
                  onChange={(e) => setStayLoggedIn(e.target.checked)}
                />
                Stay logged in
              </label>
            )}

            <button className="primary-button" onClick={handleSubmit}>
              {mode === 'login' ? 'Login' : 'Sign Up'}
            </button>

            {mode === 'login' && (
              <>
                <div className="google-divider">
                  <span>or</span>
                </div>
                <div ref={googleButtonRef} className="google-button-container" />
              </>
            )}

            <button
              className="switch-button"
              onClick={() => {
                setMode(mode === 'login' ? 'signup' : 'login')
                setMessage('')
              }}
            >
              {mode === 'login' ? 'Create an account' : 'Already have an account? Log in'}
            </button>

            {message && <p className="message">{message}</p>}
          </div>
        ) : (
          <div className="account-container">
            {page === 'dashboard' && (
              <Dashboard
                user={user}
                deleteAccount={deleteAccount}
                updateBusinessDetails={updateBusinessDetails}
                deleteBusiness={deleteBusiness}
                refreshBusinesses={loadBusinesses}
                businesses={businesses}
                selectedBusinessId={selectedBusinessId}
                setSelectedBusinessId={setSelectedBusinessId}
                createBusiness={createBusiness}
              />
            )}

            {page === 'profile' && <Profile user={user} businesses={businesses} onUpdateUser={updateUserProfile} />}
            {page === 'employees' && (
              <Employees
                user={user}
                businesses={businesses}
                selectedBusinessId={selectedBusinessId}
                refreshBusinesses={loadBusinesses}
              />
            )}
            {page === 'schedule' && (
              <Schedule
                businesses={businesses}
                selectedBusinessId={selectedBusinessId}
              />
            )}
            {page === 'customers' && <Customers />}
            {page === 'inventory' && <Inventory />}
            {page === 'tasks' && <Tasks />}
          </div>
        )}
      </main>
    </div>
  )
}

export default App
