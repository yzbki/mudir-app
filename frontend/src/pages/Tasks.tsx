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

        <button className="primary-button task-action-button">
          + Create Task
        </button>
      </div>

      <div className="empty-state">
        <h2>No tasks yet</h2>

        <p>
          Create tasks and assign them to employees.
        </p>
      </div>
    </>
  )
}

export default Tasks