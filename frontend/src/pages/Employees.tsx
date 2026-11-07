import { useEffect, useRef, useState } from 'react'
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

// Quick-pick swatches; the custom picker allows any colour.
const presetColors = ['#4f8cff', '#2fbf8f', '#f2a93b', '#e5677a', '#a37bf5', '#36b6d1', '#d98b4a', '#8bc34a']

type MemberColorPickerProps = {
  color: string | null | undefined
  disabled?: boolean
  onChange: (color: string | null) => void
}

function MemberColorPicker({ color, disabled, onChange }: MemberColorPickerProps) {
  // Local value so dragging in the native picker previews instantly;
  // the save is debounced so we don't send a request per mouse move.
  const [draft, setDraft] = useState<string | null>(color ?? null)
  const saveTimer = useRef<number | null>(null)

  // Parent passes key={savedColor}, so a new saved value remounts this component with fresh state.
  useEffect(() => () => {
    if (saveTimer.current) window.clearTimeout(saveTimer.current)
  }, [])

  const commit = (next: string | null, debounce = false) => {
    setDraft(next)
    if (saveTimer.current) window.clearTimeout(saveTimer.current)
    if (debounce) {
      saveTimer.current = window.setTimeout(() => onChange(next), 400)
    } else {
      onChange(next)
    }
  }

  const current = draft?.toLowerCase() ?? null

  return (
    <div className="member-color-picker" role="group" aria-label="Schedule colour">
      <button
        type="button"
        className={`member-color-swatch is-none ${current === null ? 'is-active' : ''}`}
        onClick={() => commit(null)}
        disabled={disabled}
        title="No colour"
        aria-label="No colour"
        aria-pressed={current === null}
      />
      {presetColors.map((preset) => (
        <button
          key={preset}
          type="button"
          className={`member-color-swatch ${current === preset ? 'is-active' : ''}`}
          style={{ background: preset }}
          onClick={() => commit(preset)}
          disabled={disabled}
          title={preset}
          aria-label={`Colour ${preset}`}
          aria-pressed={current === preset}
        />
      ))}
      <label
        className={`member-color-custom ${current && !presetColors.includes(current) ? 'is-active' : ''}`}
        title="Custom colour"
        style={current && !presetColors.includes(current) ? { background: current } : undefined}
      >
        <span aria-hidden="true">+</span>
        <input
          type="color"
          value={current ?? '#4f8cff'}
          onChange={(event) => commit(event.target.value, true)}
          disabled={disabled}
          aria-label="Custom colour"
        />
      </label>
    </div>
  )
}
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
  // Which member card has its settings panel open (one at a time), and which is mid-removal-confirmation.
  const [settingsUserId, setSettingsUserId] = useState<number | null>(null)
  const [confirmRemoveUserId, setConfirmRemoveUserId] = useState<number | null>(null)
  const [isRemoving, setIsRemoving] = useState(false)

  const toggleSettings = (userId: number) => {
    setSettingsUserId((current) => (current === userId ? null : userId))
    setConfirmRemoveUserId(null)
  }

  const confirmRemoveEmployee = async (member: BusinessMember) => {
    setIsRemoving(true)
    try {
      const removed = await handleRemoveEmployee(member)
      if (removed) {
        setSettingsUserId(null)
      }
    } finally {
      setIsRemoving(false)
      setConfirmRemoveUserId(null)
    }
  }

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
          // Sent exactly as typed: login doesn't trim, so trimming here would break logins
          // for passwords with leading/trailing spaces.
          password: employeePassword,
          role: employeePermission,
          title: trimmedRole,
        }),
      })

      // Errors come back as plain text, so read text rather than JSON.
      const text = await response.text()

      if (!response.ok) {
        throw new Error(text || 'Failed to add employee')
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

  const handleColorChange = async (member: BusinessMember, color: string | null) => {
    const token = getToken()

    if (!canManageEmployees || !token || !selectedBusinessId) return

    const previousColor = member.color ?? null
    // Optimistic update so the swatch responds immediately.
    setMembers((current) => current.map((m) => (m.userId === member.userId ? { ...m, color } : m)))

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/businesses/${selectedBusinessId}/members/${member.userId}/color`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ color }),
        },
      )

      const text = await response.text()
      if (!response.ok) {
        throw new Error(text || 'Failed to update colour')
      }
    } catch (error) {
      setMembers((current) => current.map((m) => (m.userId === member.userId ? { ...m, color: previousColor } : m)))
      setMessage(error instanceof Error ? error.message : 'Failed to update colour')
    }
  }

  /** Returns true if the employee was removed. */
  const handleRemoveEmployee = async (member: BusinessMember): Promise<boolean> => {
    const token = getToken()

    if (!canManageEmployees) {
      setMessage('Only the owner or a manager can remove employees.')
      return false
    }

    if (!token || !selectedBusinessId) return false

    if (member.userId === ownerId) {
      setMessage('The owner cannot be removed.')
      return false
    }

    if (member.userId === user?.id) {
      setMessage('You cannot remove yourself.')
      return false
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/businesses/${selectedBusinessId}/employees/${member.userId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      // Errors come back as plain text, successes as JSON — read as text so neither breaks parsing.
      const text = await response.text()

      if (!response.ok) {
        throw new Error(text || 'Failed to remove employee')
      }

      setMessage(`${member.userName} was removed from ${currentBusiness?.name ?? 'this business'}.`)
      await loadMembers()
      await refreshBusinesses()
      return true
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Failed to remove employee')
      return false
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
          <div className={`team-list ${settingsUserId !== null ? 'has-open-settings' : ''}`}>
            {members.map((member) => {
              const isOwnerMember = member.userId === ownerId
              const isCurrentUser = member.userId === user?.id
              const canEditAccess = !isOwnerMember && !isCurrentUser
              const isSettingsOpen = settingsUserId === member.userId
              const isConfirmingRemove = confirmRemoveUserId === member.userId
              const settingsPanelId = `member-settings-${member.userId}`

              return (
                <div
                  className={`user-card team-card ${isSettingsOpen ? 'is-settings-open' : ''}`}
                  key={`${member.businessId}-${member.userId}`}
                >
                  <div className="team-card-header">
                    <h2 className="team-card-name">
                      <span
                        className={`member-color-dot ${member.color ? '' : 'is-none'}`}
                        style={member.color ? { background: member.color } : undefined}
                        aria-hidden="true"
                      />
                      {member.userName}
                    </h2>

                    {canManageEmployees && (
                      <button
                        type="button"
                        className={`member-settings-toggle ${isSettingsOpen ? 'is-open' : ''}`}
                        onClick={() => toggleSettings(member.userId)}
                        aria-expanded={isSettingsOpen}
                        aria-controls={settingsPanelId}
                        aria-label={`${isSettingsOpen ? 'Close' : 'Open'} settings for ${member.userName}`}
                        title={isSettingsOpen ? 'Close settings' : 'Employee settings'}
                      >
                        <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
                          <path
                            fill="currentColor"
                            d="M19.14 12.94a7.07 7.07 0 0 0 .05-.94 7.07 7.07 0 0 0-.05-.94l2.03-1.58a.5.5 0 0 0 .12-.64l-1.92-3.32a.5.5 0 0 0-.6-.22l-2.39.96a7.03 7.03 0 0 0-1.63-.94l-.36-2.54a.5.5 0 0 0-.5-.42h-3.84a.5.5 0 0 0-.5.42l-.36 2.54a7.03 7.03 0 0 0-1.63.94l-2.39-.96a.5.5 0 0 0-.6.22L2.65 8.84a.5.5 0 0 0 .12.64l2.03 1.58a7.07 7.07 0 0 0-.05.94c0 .32.02.63.05.94l-2.03 1.58a.5.5 0 0 0-.12.64l1.92 3.32a.5.5 0 0 0 .6.22l2.39-.96c.5.38 1.05.7 1.63.94l.36 2.54a.5.5 0 0 0 .5.42h3.84a.5.5 0 0 0 .5-.42l.36-2.54a7.03 7.03 0 0 0 1.63-.94l2.39.96a.5.5 0 0 0 .6-.22l1.92-3.32a.5.5 0 0 0-.12-.64l-2.03-1.58ZM12 15.5A3.5 3.5 0 1 1 12 8.5a3.5 3.5 0 0 1 0 7Z"
                          />
                        </svg>
                      </button>
                    )}
                  </div>

                  <div className="member-meta">
                    <p>
                      <strong>Role:</strong>{' '}
                      {isOwnerMember ? 'Owner' : member.title?.trim() ? member.title : 'Not specified'}
                    </p>
                    <p>
                      <strong>Permissions:</strong>{' '}
                      {isOwnerMember ? 'Owner' : member.role === 'MANAGER' ? 'Manager' : 'Employee'}
                    </p>
                  </div>

                  {canManageEmployees && isSettingsOpen && (
                    <div className="member-settings-panel" id={settingsPanelId}>
                      {canEditAccess && (
                        <label className="member-settings-field">
                          <span className="member-settings-label">Permissions</span>
                          <select
                            className="role-select small-select"
                            value={member.role}
                            onChange={(event) => handleRoleChange(member, event.target.value as BusinessRole)}
                          >
                            {roleOptions.map((role) => (
                              <option key={role} value={role}>
                                {role === 'MANAGER' ? 'Manager' : 'Employee'}
                              </option>
                            ))}
                          </select>
                        </label>
                      )}

                      <div className="member-settings-field">
                        <span className="member-settings-label">Schedule colour</span>
                        <MemberColorPicker
                          key={member.color ?? 'none'}
                          color={member.color}
                          onChange={(color) => handleColorChange(member, color)}
                        />
                      </div>

                      {canEditAccess ? (
                        isConfirmingRemove ? (
                          <div className="member-remove-confirm" role="alertdialog" aria-labelledby={`${settingsPanelId}-confirm`}>
                            <p id={`${settingsPanelId}-confirm`}>
                              Remove <strong>{member.userName}</strong> from {currentBusiness.name}? Their access to this
                              business will be revoked.
                            </p>
                            <div className="member-remove-confirm-actions">
                              <button
                                type="button"
                                className="member-settings-button"
                                onClick={() => setConfirmRemoveUserId(null)}
                                disabled={isRemoving}
                                autoFocus
                              >
                                Cancel
                              </button>
                              <button
                                type="button"
                                className="member-settings-button is-danger-solid"
                                onClick={() => confirmRemoveEmployee(member)}
                                disabled={isRemoving}
                              >
                                {isRemoving ? 'Removing…' : 'Remove'}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            type="button"
                            className="member-settings-button is-danger"
                            onClick={() => setConfirmRemoveUserId(member.userId)}
                          >
                            Remove from business
                          </button>
                        )
                      ) : (
                        !isOwnerMember && (
                          <p className="member-settings-note">You can't change your own permissions or remove yourself.</p>
                        )
                      )}
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
