import { useEffect, useState } from 'react'
import type { Business, BusinessMember, BusinessRole } from '../types/Business'
import type { User } from '../types/User'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080'

type EmployeesProps = {
  user: User | null
  businesses: Business[]
  selectedBusinessId: number | null
  refreshBusinesses: () => Promise<void>
}

const roleOptions: BusinessRole[] = ['MANAGER', 'EMPLOYEE']
const permissionOptions: Array<'EMPLOYEE' | 'MANAGER'> = ['EMPLOYEE', 'MANAGER']

function Employees({ user, businesses, selectedBusinessId, refreshBusinesses }: EmployeesProps) {
  const [members, setMembers] = useState<BusinessMember[]>([])
  const [employeeName, setEmployeeName] = useState('')
  const [employeeEmail, setEmployeeEmail] = useState('')
  const [employeePassword, setEmployeePassword] = useState('')
  const [employeeRole, setEmployeeRole] = useState('')
  const [employeePermission, setEmployeePermission] = useState<'EMPLOYEE' | 'MANAGER'>('EMPLOYEE')
  const [inviteEmail, setInviteEmail] = useState('')
  const [isInviteOpen, setIsInviteOpen] = useState(false)
  const [message, setMessage] = useState('')

  const currentBusiness = businesses.find((business) => business.id === selectedBusinessId) || null
  const ownerId = currentBusiness?.ownerId ?? null
  const currentUserRole: BusinessRole =
    currentBusiness && members.length > 0
      ? members.find((member) => member.userId === user?.id)?.role ?? (user?.id === ownerId ? 'OWNER' : 'EMPLOYEE')
      : user?.id === ownerId
        ? 'OWNER'
        : 'EMPLOYEE'
  const canManageEmployees = currentUserRole === 'OWNER' || currentUserRole === 'MANAGER'

  const getToken = () => localStorage.getItem('token') || sessionStorage.getItem('token') || ''

  const loadMembers = async () => {
    if (!selectedBusinessId) {
      setMembers([])
      return
    }

    const token = getToken()

    if (!token) return

    try {
      const response = await fetch(`${API_BASE_URL}/api/businesses/${selectedBusinessId}/members`, {
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
    loadMembers()
  }, [selectedBusinessId])

  const handleAddEmployee = async () => {
    if (!canManageEmployees) {
      setMessage('Only the owner or a manager can add employees.')
      return
    }

    if (!selectedBusinessId) {
      setMessage('Select a business before adding an employee.')
      return
    }

    const trimmedName = employeeName.trim()
    const normalizedEmail = employeeEmail.trim()
    const trimmedPassword = employeePassword.trim()
    const trimmedRole = employeeRole.trim()

    if (!trimmedName || !normalizedEmail || !trimmedPassword || !trimmedRole) {
      setMessage('Enter the employee name, email, password, and role before adding them.')
      return
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setMessage('Please enter a valid email address.')
      return
    }

    const token = getToken()

    if (!token) {
      setMessage('You must be signed in to add employees.')
      return
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/businesses/${selectedBusinessId}/employees`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          email: normalizedEmail,
          name: trimmedName,
          password: trimmedPassword,
          role: employeePermission,
          title: trimmedRole,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(typeof data === 'string' ? data : 'Failed to add employee')
      }

      setMessage(
        `Employee ${trimmedName} (${normalizedEmail}) was added to ${currentBusiness?.name ?? 'this business'} as ${trimmedRole} (${employeePermission === 'MANAGER' ? 'Manager' : 'Employee'}).`
      )
      setEmployeeName('')
      setEmployeeEmail('')
      setEmployeePassword('')
      setEmployeeRole('')
      setEmployeePermission('EMPLOYEE')
      await loadMembers()
      await refreshBusinesses()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Failed to add employee')
    }
  }

  const handleInviteEmployee = () => {
    if (!canManageEmployees) {
      setMessage('Only the owner or a manager can invite employees.')
      return
    }

    if (!selectedBusinessId) {
      setMessage('Select a business before inviting an employee.')
      return
    }

    if (!isInviteOpen) {
      setIsInviteOpen(true)
      setMessage('')
      return
    }

    const normalizedEmail = inviteEmail.trim()

    if (!normalizedEmail) {
      setMessage('Enter an email to invite.')
      return
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setMessage('Please enter a valid email address.')
      return
    }

    setMessage(
      `Invitation sent to ${normalizedEmail}. Once they sign up, they will be added to ${currentBusiness?.name ?? 'this business'}.`
    )
    setInviteEmail('')
    setIsInviteOpen(false)
  }

  const toggleInviteForm = () => {
    setIsInviteOpen((current) => !current)
    if (!isInviteOpen) {
      setMessage('')
    }
    if (isInviteOpen) {
      setInviteEmail('')
    }
  }

  const handleRoleChange = async (member: BusinessMember, role: BusinessRole) => {
    const token = getToken()

    if (!canManageEmployees) {
      setMessage('Only the owner or a manager can change employee roles.')
      return
    }

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
      const response = await fetch(`${API_BASE_URL}/api/businesses/${selectedBusinessId}/employees`, {
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

    if (!canManageEmployees) {
      setMessage('Only the owner or a manager can remove employees.')
      return
    }

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
      const response = await fetch(`${API_BASE_URL}/api/businesses/${selectedBusinessId}/employees/${member.userId}`, {
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

      {canManageEmployees && (
        <div className="business-section">
          <h2>Add employee</h2>

          <div className="business-form employee-form">
            <div className="employee-field-grid employee-field-grid-two-row">
              <input
                type="text"
                placeholder="Employee Name"
                value={employeeName}
                onChange={(event) => setEmployeeName(event.target.value)}
              />

              <input
                type="text"
                placeholder="Role"
                value={employeeRole}
                onChange={(event) => setEmployeeRole(event.target.value)}
              />

              <input
                type="email"
                placeholder="Email"
                value={employeeEmail}
                onChange={(event) => setEmployeeEmail(event.target.value)}
              />

              <input
                type="password"
                placeholder="Password"
                value={employeePassword}
                onChange={(event) => setEmployeePassword(event.target.value)}
              />

              <select
                className="role-select"
                value={employeePermission}
                onChange={(event) => setEmployeePermission(event.target.value as 'EMPLOYEE' | 'MANAGER')}
              >
                {permissionOptions.map((permission) => (
                  <option key={permission} value={permission}>
                    {permission === 'MANAGER' ? 'Manager' : 'Employee'}
                  </option>
                ))}
              </select>
            </div>

            <div className="employee-action-row">
              <button className="primary-button employee-action-button" onClick={handleAddEmployee}>
                + Add Employee
              </button>

              <button className="primary-button employee-action-button" onClick={toggleInviteForm}>
                {isInviteOpen ? 'Cancel' : 'Invite Employee'}
              </button>
            </div>

            {isInviteOpen && (
              <div className="invite-email-row">
                <input
                  type="email"
                  placeholder="Employee email"
                  value={inviteEmail}
                  onChange={(event) => setInviteEmail(event.target.value)}
                />

                <button className="primary-button" onClick={handleInviteEmployee}>
                  Send Invite
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="business-section">
        <h2>Team members</h2>

        {!canManageEmployees && (
          <p className="page-subtitle">You can view this team, but only the owner or a manager can manage assignments.</p>
        )}

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
                    <div className="member-meta">
                      <p>
                        <strong>Role:</strong> Owner
                      </p>
                      <p>
                        <strong>Permissions:</strong> Owner
                      </p>
                    </div>
                  ) : canManageEmployees ? (
                    <>
                      <div className="member-meta">
                        <p>
                          <strong>Role:</strong> {member.title?.trim() ? member.title : 'Not specified'}
                        </p>
                        <p>
                          <strong>Permissions:</strong> {member.role === 'MANAGER' ? 'Manager' : 'Employee'}
                        </p>
                      </div>

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
                    </>
                  ) : (
                    <div className="member-meta">
                      <p>
                        <strong>Role:</strong> {member.title?.trim() ? member.title : 'Not specified'}
                      </p>
                      <p>
                        <strong>Permissions:</strong> {member.role === 'MANAGER' ? 'Manager' : 'Employee'}
                      </p>
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
