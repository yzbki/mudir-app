import { useEffect, useState } from 'react'
import type { Business, BusinessMember, BusinessRole } from '../types/Business'
import type { User } from '../types/User'

type EmployeesProps = {
  user: User | null
}

const roleOptions: BusinessRole[] = ['MANAGER', 'EMPLOYEE']

function Employees({ user }: EmployeesProps) {
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [selectedBusinessId, setSelectedBusinessId] = useState('')
  const [businessName, setBusinessName] = useState('')
  const [users, setUsers] = useState<User[]>([])
  const [selectedUserId, setSelectedUserId] = useState('')
  const [selectedRole, setSelectedRole] = useState<BusinessRole>('EMPLOYEE')
  const [team, setTeam] = useState<BusinessMember[]>([])
  const [message, setMessage] = useState('')

  const getToken = () =>
    localStorage.getItem('token') || sessionStorage.getItem('token') || ''

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
      setUsers(data)

      if (!selectedUserId && data.length > 0) {
        setSelectedUserId(String(data[0].id))
      }
    } catch (error) {
      console.error(error)
    }
  }

  const loadBusinesses = async () => {
    const token = getToken()

    if (!token) return

    try {
      const response = await fetch('http://localhost:8080/api/businesses', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) throw new Error('Failed to fetch businesses')

      const data = await response.json()
      setBusinesses(data)

      if (!selectedBusinessId && data.length > 0) {
        setSelectedBusinessId(String(data[0].id))
      }
    } catch (error) {
      console.error(error)
    }
  }

  useEffect(() => {
    if (!user) return

    loadUsers()
    loadBusinesses()
  }, [user])

  useEffect(() => {
    if (!selectedBusinessId) {
      setTeam([])
      return
    }

    const business = businesses.find((item) => String(item.id) === selectedBusinessId)

    if (!business) {
      setTeam([])
      return
    }

    setTeam([
      {
        id: Number(`${business.id}1`),
        businessId: business.id,
        userId: business.ownerId,
        userName: business.ownerName,
        role: 'OWNER',
      },
    ])
  }, [selectedBusinessId, businesses])

  const handleCreateBusiness = async () => {
    const token = getToken()

    if (!token || !businessName.trim()) {
      setMessage('Please enter a business name.')
      return
    }

    try {
      const response = await fetch('http://localhost:8080/api/businesses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: businessName.trim() }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(typeof data === 'string' ? data : 'Failed to create business')
      }

      setBusinessName('')
      setMessage('Business created successfully.')
      await loadBusinesses()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Failed to create business')
    }
  }

  const handleAddEmployee = async () => {
    const token = getToken()

    if (!token || !selectedBusinessId || !selectedUserId) {
      setMessage('Choose a business and employee first.')
      return
    }

    try {
      const response = await fetch(
        `http://localhost:8080/api/businesses/${selectedBusinessId}/employees`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            userId: Number(selectedUserId),
            role: selectedRole,
          }),
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(typeof data === 'string' ? data : 'Failed to assign employee role')
      }

      const member: BusinessMember = {
        id: data.id ?? Date.now(),
        businessId: Number(selectedBusinessId),
        userId: Number(selectedUserId),
        userName:
          users.find((person) => String(person.id) === selectedUserId)?.name || 'Employee',
        role: data.role || selectedRole,
      }

      setTeam((current) => {
        const filtered = current.filter((person) => person.userId !== member.userId)
        return [...filtered, member]
      })

      setMessage('Employee role assigned successfully.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Failed to assign employee role')
    }
  }

  const selectedBusiness = businesses.find((item) => String(item.id) === selectedBusinessId)
  const managerCount = team.filter((person) => person.role === 'MANAGER' || person.role === 'OWNER').length

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Employees</h1>

          <p className="page-subtitle">
            Manage your businesses and team roles.
          </p>
        </div>
      </div>

      <div className="business-section">
        <h2>Create business</h2>

        <div className="business-form">
          <input
            type="text"
            value={businessName}
            onChange={(event) => setBusinessName(event.target.value)}
            placeholder="Business name"
          />

          <button className="primary-button" onClick={handleCreateBusiness}>
            + Create Business
          </button>
        </div>
      </div>

      <div className="business-section">
        <h2>Business overview</h2>

        {businesses.length === 0 ? (
          <div className="empty-state small-empty-state">
            <h2>No businesses yet</h2>
            <p>Create your first business to start building your team.</p>
          </div>
        ) : (
          <>
            <select
              className="role-select"
              value={selectedBusinessId}
              onChange={(event) => setSelectedBusinessId(event.target.value)}
            >
              {businesses.map((business) => (
                <option key={business.id} value={String(business.id)}>
                  {business.name}
                </option>
              ))}
            </select>

            <div className="stats-grid">
              <div className="stat-card">
                <span>Business</span>
                <strong>{selectedBusiness ? selectedBusiness.name : '—'}</strong>
              </div>

              <div className="stat-card">
                <span>Total Members</span>
                <strong>{team.length}</strong>
              </div>

              <div className="stat-card">
                <span>Managers</span>
                <strong>{managerCount}</strong>
              </div>
            </div>
          </>
        )}
      </div>

      {businesses.length > 0 && (
        <div className="business-section">
          <h2>Add employee</h2>

          <div className="business-form employee-form">
            <select
              value={selectedUserId}
              onChange={(event) => setSelectedUserId(event.target.value)}
            >
              {users.map((member) => (
                <option key={member.id} value={String(member.id)}>
                  {member.name} ({member.email})
                </option>
              ))}
            </select>

            <select
              value={selectedRole}
              onChange={(event) => setSelectedRole(event.target.value as BusinessRole)}
              className="role-select"
            >
              {roleOptions.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>

            <button className="primary-button" onClick={handleAddEmployee}>
              Assign Role
            </button>
          </div>
        </div>
      )}

      {team.length > 0 && (
        <div className="business-section">
          <h2>Team members</h2>

          <div className="team-list">
            {team.map((member) => (
              <div className="user-card team-card" key={`${member.businessId}-${member.userId}`}>
                <h2>{member.userName}</h2>
                <p>{member.role}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {message && <p className="message">{message}</p>}
    </>
  )
}

export default Employees