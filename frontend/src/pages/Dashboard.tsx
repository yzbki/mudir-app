import { useEffect, useState } from 'react'
import type { Business, BusinessMember } from '../types/Business'
import type { User } from '../types/User'

type BusinessDetailField = 'address' | 'phone' | 'description'

type DashboardProps = {
  user: User
  deleteAccount: () => void
  updateBusinessDetails: (
    businessId: number,
    details: { address: string; phone: string; description: string },
  ) => Promise<void>
  deleteBusiness: (businessId: number) => Promise<void>
  businesses: Business[]
  selectedBusinessId: number | null
  setSelectedBusinessId: (businessId: number) => void
  createBusiness: (name: string) => Promise<void>
}

function Dashboard({
  user,
  deleteAccount,
  updateBusinessDetails,
  deleteBusiness,
  businesses,
  selectedBusinessId,
  setSelectedBusinessId,
  createBusiness,
}: DashboardProps) {
  const [businessName, setBusinessName] = useState('')
  const [message, setMessage] = useState('')
  const [businessMembers, setBusinessMembers] = useState<BusinessMember[]>([])
  const [isCreateFormOpen, setIsCreateFormOpen] = useState(false)
  const [detailDrafts, setDetailDrafts] = useState({
    address: '',
    phone: '',
    description: '',
  })
  const [editingDetail, setEditingDetail] = useState<BusinessDetailField | null>(null)
  const [savingDetail, setSavingDetail] = useState<BusinessDetailField | null>(null)

  const selectedBusiness = businesses.find((business) => business.id === selectedBusinessId) || null
  const canDeleteBusiness = Boolean(selectedBusiness && selectedBusiness.ownerId === user.id)

  useEffect(() => {
    if (!selectedBusinessId) {
      setBusinessMembers([])
      return
    }

    const token = localStorage.getItem('token') || sessionStorage.getItem('token')

    if (!token) {
      setBusinessMembers([])
      return
    }

    const loadBusinessMembers = async () => {
      try {
        const response = await fetch(`http://localhost:8080/api/businesses/${selectedBusinessId}/members`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        if (!response.ok) {
          throw new Error('Failed to fetch business members')
        }

        const data: BusinessMember[] = await response.json()
        setBusinessMembers(data)
      } catch (error) {
        console.error(error)
        setBusinessMembers([])
      }
    }

    void loadBusinessMembers()
  }, [selectedBusinessId])

  useEffect(() => {
    setDetailDrafts({
      address: selectedBusiness?.address ?? '',
      phone: selectedBusiness?.phone ?? '',
      description: selectedBusiness?.description ?? '',
    })
    setEditingDetail(null)
    setSavingDetail(null)
  }, [selectedBusinessId, businesses])

  const employeeCount = businessMembers.filter((member) => member.role === 'EMPLOYEE').length
  const managerCount = businessMembers.filter((member) => member.role === 'MANAGER').length

  const handleCreateBusiness = async () => {
    if (!businessName.trim()) {
      setMessage('Please enter a business name.')
      return
    }

    await createBusiness(businessName)
    setBusinessName('')
    setIsCreateFormOpen(false)
    setMessage('Business created successfully.')
  }

  const handleDeleteBusiness = async () => {
    if (!selectedBusiness) {
      return
    }

    if (!canDeleteBusiness) {
      setMessage('Only the owner can delete this business.')
      return
    }

    const confirmed = window.confirm(`Are you sure you want to delete "${selectedBusiness.name}"?`)

    if (!confirmed) {
      return
    }

    try {
      await deleteBusiness(selectedBusiness.id)
      setMessage('Business deleted successfully.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Failed to delete business.')
    }
  }

  const getSelectedBusinessDetail = (field: BusinessDetailField) => {
    if (!selectedBusiness) {
      return ''
    }

    if (field === 'address') {
      return selectedBusiness.address ?? ''
    }

    if (field === 'phone') {
      return selectedBusiness.phone ?? ''
    }

    return selectedBusiness.description ?? ''
  }

  const handleSaveBusinessDetail = async (field: BusinessDetailField) => {
    if (!selectedBusiness) {
      return
    }

    setSavingDetail(field)

    try {
      await updateBusinessDetails(selectedBusiness.id, {
        address: field === 'address' ? detailDrafts.address : selectedBusiness.address ?? '',
        phone: field === 'phone' ? detailDrafts.phone : selectedBusiness.phone ?? '',
        description: field === 'description' ? detailDrafts.description : selectedBusiness.description ?? '',
      })
      setEditingDetail(null)
      setMessage('Business details updated successfully.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Failed to update business details.')
    } finally {
      setSavingDetail(null)
    }
  }

  const cancelBusinessDetailEdit = (field: BusinessDetailField) => {
    setEditingDetail(null)
    setDetailDrafts((current) => ({
      ...current,
      [field]: getSelectedBusinessDetail(field),
    }))
  }

  const businessDetailFields: Array<{ key: BusinessDetailField; label: string; placeholder: string }> = [
    { key: 'address', label: 'Address:', placeholder: 'Enter business address' },
    { key: 'phone', label: 'Phone:', placeholder: 'Enter business phone' },
    { key: 'description', label: 'Description:', placeholder: 'Enter business description' },
  ]

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Dashboard</h1>
          <p className="page-subtitle">Overview of your businesses.</p>
        </div>
      </div>

      <div className="business-section">
        <h2>Current business</h2>

        {businesses.length === 0 ? (
          <>
            <div className="empty-state small-empty-state">
              <h2>No businesses yet</h2>
              <p>Create your first business to get started.</p>
            </div>

            <div className="business-selector-row empty-business-actions">
              <button
                type="button"
                className="primary-button business-action-button"
                onClick={() => {
                  setIsCreateFormOpen((current) => !current)
                  if (!isCreateFormOpen) {
                    setMessage('')
                  }
                }}
              >
                {isCreateFormOpen ? 'Cancel' : '+ Create Business'}
              </button>
            </div>
          </>
        ) : (
          <div className="business-selector-row">
            <select
              className="role-select business-selector"
              value={selectedBusinessId ?? ''}
              onChange={(event) => setSelectedBusinessId(Number(event.target.value))}
            >
              {businesses.map((business) => (
                <option key={business.id} value={business.id}>
                  {business.name}
                </option>
              ))}
            </select>

            <div className="business-action-row">
              {selectedBusiness && (
                <button
                  type="button"
                  className="delete-button business-action-button"
                  onClick={handleDeleteBusiness}
                  disabled={!canDeleteBusiness}
                >
                  Delete Business
                </button>
              )}

              <button
                type="button"
                className="primary-button business-action-button"
                onClick={() => {
                  setIsCreateFormOpen((current) => !current)
                  if (!isCreateFormOpen) {
                    setMessage('')
                  }
                }}
              >
                {isCreateFormOpen ? 'Cancel' : '+ Create Business'}
              </button>
            </div>
          </div>
        )}

        {isCreateFormOpen && (
          <div className="business-form inline-create-form">
            <input
              type="text"
              placeholder="Business name"
              value={businessName}
              onChange={(event) => setBusinessName(event.target.value)}
            />

            <button className="primary-button" onClick={() => void handleCreateBusiness()}>
              Create Business
            </button>
          </div>
        )}

        {selectedBusiness && (
          <div className="business-details-panel">
            <div className="business-detail-row">
              <div className="business-detail-label">
                <span>Name:</span>
              </div>
              <div className="business-detail-value business-detail-readonly">{selectedBusiness.name}</div>
            </div>

            {businessDetailFields.map(({ key, label, placeholder }) => {
              const isEditing = editingDetail === key
              const fieldValue = detailDrafts[key]

              return (
                <div className="business-detail-row" key={key}>
                  <div className="business-detail-label">
                    <span>{label}</span>
                    {!isEditing && (
                      <button
                        type="button"
                        className="business-detail-edit-button"
                        onClick={() => {
                          setEditingDetail(key)
                          setDetailDrafts((current) => ({
                            ...current,
                            [key]: getSelectedBusinessDetail(key),
                          }))
                        }}
                        aria-label={`Edit ${label}`}
                      >
                        ✎
                      </button>
                    )}
                  </div>

                  {isEditing ? (
                    <>
                      <input
                        type="text"
                        placeholder={placeholder}
                        value={fieldValue}
                        onChange={(event) =>
                          setDetailDrafts((current) => ({
                            ...current,
                            [key]: event.target.value,
                          }))
                        }
                      />

                      <div className="business-detail-actions">
                        <button
                          type="button"
                          className="primary-button business-detail-save-button"
                          onClick={() => void handleSaveBusinessDetail(key)}
                          disabled={savingDetail === key}
                        >
                          {savingDetail === key ? 'Saving...' : 'Save'}
                        </button>
                        <button
                          type="button"
                          className="business-detail-cancel-button"
                          onClick={() => cancelBusinessDetailEdit(key)}
                        >
                          Cancel
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="business-detail-value">{fieldValue || 'Not provided'}</div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {message && <p className="message">{message}</p>}
      </div>

      <div className="stats-grid dashboard-stats">
        <div className="stat-card">
          <span>Business</span>
          <strong>{selectedBusiness ? selectedBusiness.name : '?'}</strong>
        </div>

        <div className="stat-card">
          <span>Employees</span>
          <strong>{selectedBusiness ? employeeCount : '0'}</strong>
        </div>

        <div className="stat-card">
          <span>Managers</span>
          <strong>{selectedBusiness ? managerCount : '0'}</strong>
        </div>

        <div className="stat-card">
          <span>Customers</span>
          <strong>0</strong>
        </div>

        <div className="stat-card">
          <span>Inventory Items</span>
          <strong>0</strong>
        </div>

        <div className="stat-card">
          <span>Open Tasks</span>
          <strong>0</strong>
        </div>
      </div>

      <div className="account-card dashboard-account">
        <h2>Account</h2>
        <p>{user.name}</p>
        <p>{user.email}</p>

        <button className="delete-button" onClick={deleteAccount}>
          Delete Account
        </button>
      </div>
    </>
  )
}

export default Dashboard
