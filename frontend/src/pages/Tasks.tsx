function Tasks() {
  return (
    <>
      <div className="page-header">
        <div>
          <h1>Tasks</h1>

          <p className="page-subtitle">
            Create and manage work for your team.
          </p>
        </div>

        <button className="primary-button">
          + Create Task
        </button>
      </div>

      <div className="task-filters">

        <button className="filter-button active">
          All
        </button>

        <button className="filter-button">
          To Do
        </button>

        <button className="filter-button">
          In Progress
        </button>

        <button className="filter-button">
          Completed
        </button>

      </div>

      <div className="empty-state">

        <h2>No tasks yet</h2>

        <p>
          Create tasks and assign them to employees.
        </p>

        <button className="primary-button">
          Create Your First Task
        </button>

      </div>
    </>
  )
}

export default Tasks