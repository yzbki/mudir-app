import type { User } from '../types/User'

type DashboardProps = {
  user: User
  deleteAccount: () => void
}

function Dashboard({
  user,
  deleteAccount,
}: DashboardProps) {
  return (
    <>
      <div className="page-header">
        <div>
          <h1>Dashboard</h1>
          <p className="page-subtitle">
            Overview of your business.
          </p>
        </div>
      </div>

      <div className="stats-grid dashboard-stats">
        <div className="stat-card">
          <span>Employees</span>
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
          <span>Low Stock</span>
          <strong>0</strong>
        </div>

        <div className="stat-card">
          <span>Open Tasks</span>
          <strong>0</strong>
        </div>

        <div className="stat-card">
          <span>Completed Tasks</span>
          <strong>0</strong>
        </div>
      </div>

      <div className="account-card dashboard-account">
        <h2>Account</h2>
        <p>{user.name}</p>
        <p>{user.email}</p>

        <button
          className="delete-button"
          onClick={deleteAccount}
        >
          Delete Account
        </button>
      </div>
    </>
  )
}

export default Dashboard