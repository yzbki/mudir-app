import { useState } from 'react'
import type { Business } from '../types/Business'
import type { User } from '../types/User'

type DashboardProps = {
  user: User
  deleteAccount: () => void
  businesses: Business[]
  selectedBusinessId: number | null
  setSelectedBusinessId: (businessId: number) => void
  createBusiness: (name: string) => Promise<void>
}

function Dashboard({
  user,
  deleteAccount,
  businesses,
  selectedBusinessId,
  setSelectedBusinessId,
  createBusiness,
}: DashboardProps) {
  const [businessName, setBusinessName] = useState('')
  const [message, setMessage] = useState('')

  const selectedBusiness = businesses.find((business) => business.id === selectedBusinessId) || null

  const handleCreateBusiness = async () => {
    if (!businessName.trim()) {
      setMessage('Please enter a business name.')
      return
    }

    await createBusiness(businessName)
    setBusinessName('')
    setMessage('Business created successfully.')
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Dashboard</h1>
          <p className="page-subtitle">Overview of your businesses.</p>
        </div>
      </div>

      <div className="business-section">
        <h2>Current business</h2>

        {businesses.length === 0 ? (
          <div className="empty-state small-empty-state">
            <h2>No businesses yet</h2>
            <p>Create your first business to get started.</p>
          </div>
        ) : (
          <>
            <select
              className="role-select"
              value={selectedBusinessId ?? ''}
              onChange={(event) => setSelectedBusinessId(Number(event.target.value))}
            >
              {businesses.map((business) => (
                <option key={business.id} value={business.id}>
                  {business.name}
                </option>
              ))}
            </select>

            <div className="business-list">
              {businesses.map((business) => (
                <button
                  type="button"
                  key={business.id}
                  className={`business-chip${selectedBusiness?.id === business.id ? ' active' : ''}`}
                  onClick={() => setSelectedBusinessId(business.id)}
                >
                  {business.name}
                </button>
              ))}
            </div>
          </>
        )}

        <div className="business-form">
          <input
            type="text"
            placeholder="Business name"
            value={businessName}
            onChange={(event) => setBusinessName(event.target.value)}
          />

          <button className="primary-button" onClick={handleCreateBusiness}>
            + Create Business
          </button>
        </div>

        {message && <p className="message">{message}</p>}
      </div>

      <div className="stats-grid dashboard-stats">
        <div className="stat-card">
          <span>Business</span>
          <strong>{selectedBusiness ? selectedBusiness.name : '?'}</strong>
        </div>

        <div className="stat-card">
          <span>Employees</span>
          <strong>{selectedBusiness ? '?' : '0'}</strong>
        </div>

        <div className="stat-card">
          <span>Managers</span>
          <strong>0</strong>
        </div>

        <div className="stat-card">
          <span>Customers</span>
          <strong>0</strong>
        </div>

        <div className="stat-card">
          <span>Inventory Items</span>
          <strong>0</strong>
        </div>

        <div className="stat-card">
          <span>Open Tasks</span>
          <strong>0</strong>
        </div>
      </div>

      <div className="account-card dashboard-account">
        <h2>Account</h2>
        <p>{user.name}</p>
        <p>{user.email}</p>

        <button className="delete-button" onClick={deleteAccount}>
          Delete Account
        </button>
      </div>
    </>
  )
}

export default Dashboard
