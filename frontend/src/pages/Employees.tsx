import { useEffect, useState } from 'react'
import type { Business, BusinessMember, BusinessRole } from '../types/Business'
import type { User } from '../types/User'

type EmployeesProps = {
  user: User | null
  businesses: Business[]
  selectedBusinessId: number | null
  refreshBusinesses: () => Promise<void>
}

const roleOptions: BusinessRole[] = ['MANAGER', 'EMPLOYEE']

function Employees({ user, businesses, selectedBusinessId, refreshBusinesses }: EmployeesProps) {
  const [allUsers, setAllUsers] = useState<User[]>([])
  const [members, setMembers] = useState<BusinessMember[]>([])
  const [selectedUserId, setSelectedUserId] = useState('')
  const [selectedRole, setSelectedRole] = useState<BusinessRole>('EMPLOYEE')
  const [message, setMessage] = useState('')

  const currentBusiness = businesses.find((business) => business.id === selectedBusinessId) || null
  const ownerId = currentBusiness?.ownerId ?? null

  const getToken = () => localStorage.getItem('token') || sessionStorage.getItem('token') || ''

  const loadUsers = async () => {
    const token = getToken()

    if (!token) return

    try {
      const response = await fetch('http://localhost:8080/api/users', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) throw new Error('Failed to fetch users')

      const data = await response.json()
      setAllUsers(data)

      if (!selectedUserId && data.length > 0) {
        setSelectedUserId(String(data[0].id))
      }
    } catch (error) {
      console.error(error)
    }
  }

  const loadMembers = async () => {
    if (!selectedBusinessId) {
      setMembers([])
      return
    }

    const token = getToken()

    if (!token) return

    try {
      const response = await fetch(`http://localhost:8080/api/businesses/${selectedBusinessId}/members`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error('Failed to fetch members')
      }

      const data = await response.json()
      setMembers(data)
    } catch (error) {
      console.error(error)
    }
  }

  useEffect(() => {
    if (!user) return
    loadUsers()
  }, [user])

  useEffect(() => {
    loadMembers()
  }, [selectedBusinessId])

  useEffect(() => {
    if (!allUsers.length) return

    if (!selectedUserId || !allUsers.some((person) => String(person.id) === selectedUserId)) {
      setSelectedUserId(String(allUsers[0].id))
    }
  }, [allUsers, selectedUserId])

  const handleAddEmployee = async () => {
    const token = getToken()

    if (!token || !selectedBusinessId || !selectedUserId) {
      setMessage('Select a business and employee first.')
      return
    }

    try {
      const response = await fetch(`http://localhost:8080/api/businesses/${selectedBusinessId}/employees`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          userId: Number(selectedUserId),
          role: selectedRole,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(typeof data === 'string' ? data : 'Failed to assign employee role')
      }

      setMessage('Employee added successfully.')
      await loadMembers()
      await refreshBusinesses()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Failed to assign employee role')
    }
  }

  const handleRoleChange = async (member: BusinessMember, role: BusinessRole) => {
    const token = getToken()

    if (!token || !selectedBusinessId) return

    if (member.userId === user?.id) {
      setMessage('You cannot change your own role.')
      return
    }

    if (member.userId === ownerId) {
      setMessage('The owner cannot be reassigned.')
      return
    }

    try {
      const response = await fetch(`http://localhost:8080/api/businesses/${selectedBusinessId}/employees`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          userId: member.userId,
          role,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(typeof data === 'string' ? data : 'Failed to update employee role')
      }

      setMessage('Employee role updated.')
      await loadMembers()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Failed to update employee role')
    }
  }

  const handleRemoveEmployee = async (member: BusinessMember) => {
    const token = getToken()

    if (!token || !selectedBusinessId) return

    if (member.userId === ownerId) {
      setMessage('The owner cannot be removed.')
      return
    }

    if (member.userId === user?.id) {
      setMessage('You cannot remove yourself.')
      return
    }

    try {
      const response = await fetch(`http://localhost:8080/api/businesses/${selectedBusinessId}/employees/${member.userId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(typeof data === 'string' ? data : 'Failed to remove employee')
      }

      setMessage('Employee removed successfully.')
      await loadMembers()
      await refreshBusinesses()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Failed to remove employee')
    }
  }

  if (!currentBusiness) {
    return (
      <>
        <div className="page-header">
          <div>
            <h1>Employees</h1>
            <p className="page-subtitle">Manage your team.</p>
          </div>
        </div>

        <div className="empty-state">
          <h2>No business selected</h2>
          <p>Create or select a business on the dashboard to manage employees.</p>
        </div>
      </>
    )
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Employees</h1>
          <p className="page-subtitle">Manage {currentBusiness.name}.</p>
        </div>
      </div>

      <div className="business-section">
        <h2>Add employee</h2>

        <div className="business-form employee-form">
          <select
            className="role-select"
            value={selectedUserId}
            onChange={(event) => setSelectedUserId(event.target.value)}
          >
            {allUsers.map((person) => (
              <option key={person.id} value={String(person.id)}>
                {person.name} ({person.email})
              </option>
            ))}
          </select>

          <select
            className="role-select"
            value={selectedRole}
            onChange={(event) => setSelectedRole(event.target.value as BusinessRole)}
          >
            {roleOptions.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </select>

          <button className="primary-button" onClick={handleAddEmployee}>
            + Add Employee
          </button>
        </div>
      </div>

      <div className="business-section">
        <h2>Team members</h2>

        {members.length === 0 ? (
          <div className="empty-state small-empty-state">
            <h2>No employees yet</h2>
            <p>Add employees to start managing your team.</p>
          </div>
        ) : (
          <div className="team-list">
            {members.map((member) => {
              const isOwnerMember = member.userId === ownerId
              const isCurrentUser = member.userId === user?.id

              return (
                <div className="user-card team-card" key={`${member.businessId}-${member.userId}`}>
                  <h2>{member.userName}</h2>

                  {isOwnerMember ? (
                    <p>Owner</p>
                  ) : (
                    <div className="member-action-row">
                      <select
                        className="role-select small-select"
                        value={member.role}
                        onChange={(event) => handleRoleChange(member, event.target.value as BusinessRole)}
                        disabled={isCurrentUser}
                      >
                        {roleOptions.map((role) => (
                          <option key={role} value={role}>
                            {role}
                          </option>
                        ))}
                      </select>

                      <button
                        type="button"
                        className="danger-button"
                        onClick={() => handleRemoveEmployee(member)}
                        disabled={isCurrentUser}
                      >
                        Remove
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {message && <p className="message">{message}</p>}
    </>
  )
}

export default Employees
