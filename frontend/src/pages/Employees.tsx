function Employees() {
  return (
    <>
      <div className="page-header">
        <div>
          <h1>Employees</h1>

          <p className="page-subtitle">
            Manage your business employees.
          </p>
        </div>

        <button className="primary-button">
          + Add Employee
        </button>
      </div>

      <div className="stats-grid">

        <div className="stat-card">
          <span>Total Employees</span>
          <strong>0</strong>
        </div>

        <div className="stat-card">
          <span>Active</span>
          <strong>0</strong>
        </div>

        <div className="stat-card">
          <span>Managers</span>
          <strong>0</strong>
        </div>

      </div>

      <div className="empty-state">

        <h2>No employees yet</h2>

        <p>
          Add employees to start managing your team.
        </p>

        <button className="primary-button">
          Add Your First Employee
        </button>

      </div>
    </>
  )
}

export default Employees