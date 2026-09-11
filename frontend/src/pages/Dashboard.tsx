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
      <h1>Dashboard</h1>

      <div className="account-card">
        <h2>Welcome, {user.name}</h2>

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