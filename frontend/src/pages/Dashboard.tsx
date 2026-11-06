import { useEffect, useState } from 'react'
import type { Business, BusinessMember } from '../types/Business'
import type { User } from '../types/User'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080'

type BusinessDetailField = 'address' | 'phone' | 'description'

type DashboardProps = {
  user: User
  deleteAccount: () => void
  updateBusinessDetails: (
    businessId: number,
    details: { address: string; phone: string; description: string },
  ) => Promise<void>
  deleteBusiness: (businessId: number) => Promise<void>
  refreshBusinesses: () => Promise<void>
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
  refreshBusinesses,
  businesses,
  selectedBusinessId,
  setSelectedBusinessId,
  createBusiness,
}: DashboardProps) {
  const [businessName, setBusinessName] = useState('')
  const [message, setMessage] = useState('')
  const [businessMembers, setBusinessMembers] = useState<BusinessMember[]>([])
  const [isCreateFormOpen, setIsCreateFormOpen] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [settingsDraft, setSettingsDraft] = useState<Record<string, boolean>>({})
  const [detailDrafts, setDetailDrafts] = useState({
    address: '',
    phone: '',
    description: '',
  })
  const [editingDetail, setEditingDetail] = useState<BusinessDetailField | null>(null)
  const [savingDetail, setSavingDetail] = useState<BusinessDetailField | null>(null)

  const selectedBusiness = businesses.find((business) => business.id === selectedBusinessId) || null
  const currentUserRole =
    selectedBusiness && businessMembers.length > 0
      ? businessMembers.find((member) => member.userId === user.id)?.role ?? 'EMPLOYEE'
      : selectedBusiness && selectedBusiness.ownerId === user.id
        ? 'OWNER'
        : 'EMPLOYEE'
  const canEditBusiness = currentUserRole === 'OWNER'
  const canDeleteBusiness = canEditBusiness

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
        const response = await fetch(`${API_BASE_URL}/api/businesses/${selectedBusinessId}/members`, {
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

  const employeeCount = businessMembers.filter(
    (member) => member.role === 'EMPLOYEE' || member.role === 'MANAGER',
  ).length
  const managerCount = businessMembers.filter((member) => member.role === 'MANAGER').length

  const optionalPageOptions = [
    { key: 'schedule', label: 'Schedule' },
    { key: 'inventory', label: 'Inventory' },
    { key: 'tasks', label: 'Tasks' },
    { key: 'customers', label: 'Customers' },
  ]

  useEffect(() => {
    if (!selectedBusiness) {
      setSettingsDraft({})
      return
    }

    const enabledPages = selectedBusiness.enabledPages ?? ['dashboard', 'employees', 'profile', 'schedule', 'inventory', 'tasks', 'customers']
    const nextDraft = Object.fromEntries(optionalPageOptions.map((page) => [page.key, enabledPages.includes(page.key)]))
    setSettingsDraft(nextDraft)
  }, [selectedBusinessId, selectedBusiness])

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

    const confirmed = window.confirm(`Are you sure you want to delete "${selectedBusiness.name}"? This action cannot be undone.`)

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

  const handleSaveBusinessSettings = async () => {
    if (!selectedBusiness) {
      return
    }

    if (!canDeleteBusiness) {
      setMessage('Only the owner can manage business settings.')
      return
    }

    const token = localStorage.getItem('token') || sessionStorage.getItem('token')

    if (!token) {
      return
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/businesses/${selectedBusiness.id}/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          enabledPages: ['dashboard', 'employees', 'profile', ...optionalPageOptions.filter((page) => settingsDraft[page.key]).map((page) => page.key)],
        }),
      })

      const data = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(typeof data === 'string' ? data : 'Failed to update business settings')
      }

      setMessage('Business settings saved successfully.')
      setIsSettingsOpen(false)
      await refreshBusinesses()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Failed to update business settings')
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

    if (!canEditBusiness) {
      setMessage('Only the owner can edit business details.')
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
          <div className="business-selector-row business-selector-row-with-settings">
            <select
              className="role-select business-selector business-selector-with-settings"
              value={selectedBusinessId ?? ''}
              onChange={(event) => setSelectedBusinessId(Number(event.target.value))}
            >
              {businesses.map((business) => (
                <option key={business.id} value={business.id}>
                  {business.name}
                </option>
              ))}
            </select>

            {selectedBusiness && selectedBusiness.ownerId === user.id && (
              <button
                type="button"
                className="secondary-button business-settings-button"
                onClick={() => setIsSettingsOpen((current) => !current)}
                aria-label="Open business settings"
                title="Business settings"
              >
                ⚙
              </button>
            )}
          </div>
        )}

        {selectedBusiness && (
          <>
            {isSettingsOpen && canDeleteBusiness ? (
              <div className="business-settings-panel">
                <h2>Business Settings</h2>

                <div className="business-form">
                  <div className="settings-list">
                    {optionalPageOptions.map((page) => (
                      <label key={page.key} className="settings-toggle-row">
                        <input
                          type="checkbox"
                          checked={Boolean(settingsDraft[page.key])}
                          onChange={(event) =>
                            setSettingsDraft((current) => ({
                              ...current,
                              [page.key]: event.target.checked,
                            }))
                          }
                        />
                        <span>{page.label}</span>
                      </label>
                    ))}
                  </div>

                  <div className="business-action-row">
                    <button
                      type="button"
                      className="delete-button business-action-button"
                      onClick={handleDeleteBusiness}
                    >
                      Delete Business
                    </button>

                    <button
                      type="button"
                      className="primary-button business-action-button"
                      onClick={() => void handleSaveBusinessSettings()}
                    >
                      Save Settings
                    </button>
                  </div>
                </div>
              </div>
            ) : (
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
                        {!isEditing && canEditBusiness && (
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
                            disabled={!canEditBusiness}
                          />

                          <div className="business-detail-actions">
                            <button
                              type="button"
                              className="primary-button business-detail-save-button"
                              onClick={() => void handleSaveBusinessDetail(key)}
                              disabled={savingDetail === key || !canEditBusiness}
                            >
                              {savingDetail === key ? 'Saving...' : 'Save'}
                            </button>
                            <button
                              type="button"
                              className="business-detail-cancel-button"
                              onClick={() => cancelBusinessDetailEdit(key)}
                              disabled={!canEditBusiness}
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
          </>
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

      <div className="business-section">
        <h2>Create business</h2>

        <div className="business-action-row">
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

        {isCreateFormOpen && (
          <div className="business-form inline-create-form">
            <input
              type="text"
              placeholder="Business name"
              value={businessName}
              onChange={(event) => setBusinessName(event.target.value)}
            />

            <button type="button" className="primary-button" onClick={() => void handleCreateBusiness()}>
              Create Business
            </button>
          </div>
        )}
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
