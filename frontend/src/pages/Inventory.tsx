function Inventory() {
  return (
    <>
      <div className="page-header">
        <div>
          <h1>Inventory</h1>

          <p className="page-subtitle">
            Track products and stock levels.
          </p>
        </div>
      </div>

      <button className="primary-button page-action-button">
        + Add Item
      </button>

      <div className="stats-grid">
        <div className="stat-card">
          <span>Total Items</span>
          <strong>0</strong>
        </div>

        <div className="stat-card">
          <span>Low Stock</span>
          <strong>0</strong>
        </div>

        <div className="stat-card">
          <span>Out of Stock</span>
          <strong>0</strong>
        </div>
      </div>

      <div className="empty-state">
        <h2>Your inventory is empty</h2>

        <p>
          Add products or supplies to start tracking your inventory.
        </p>
      </div>
    </>
  )
}

export default Inventory