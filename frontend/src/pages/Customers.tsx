function Customers() {
  return (
    <>
      <div className="page-header">
        <div>
          <h1>Customers</h1>

          <p className="page-subtitle">
            Manage your customer information.
          </p>
        </div>
      </div>

      <button className="primary-button page-action-button">
        + Add Customer
      </button>

      <div className="stats-grid">
        <div className="stat-card">
          <span>Total Customers</span>
          <strong>0</strong>
        </div>

        <div className="stat-card">
          <span>New This Month</span>
          <strong>0</strong>
        </div>

        <div className="stat-card">
          <span>Returning</span>
          <strong>0</strong>
        </div>
      </div>

      <div className="empty-state">
        <h2>No customers yet</h2>

        <p>
          Add customers to start building your customer database.
        </p>
      </div>
    </>
  )
}

export default Customers