import { useEffect, useState } from 'react'
import type { Business } from '../types/Business'
import type { User } from '../types/User'

type ProfileProps = {
  user: User | null
  businesses: Business[]
  onUpdateUser: (name: string) => Promise<void>
}

function Profile({ user, businesses, onUpdateUser }: ProfileProps) {
  const [profileName, setProfileName] = useState(user?.name ?? '')
  const [draftName, setDraftName] = useState(user?.name ?? '')
  const [isEditingName, setIsEditingName] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    setProfileName(user?.name ?? '')
    setDraftName(user?.name ?? '')
    setIsEditingName(false)
  }, [user])

  if (!user) {
    return null
  }

  const ownedBusinessCount = businesses.filter((business) => business.ownerId === user.id).length
  const employeeBusinessCount = businesses.filter((business) => business.ownerId !== user.id).length

  const handleSaveName = async () => {
    const trimmedName = draftName.trim()

    if (!trimmedName || trimmedName === profileName) {
      setIsEditingName(false)
      setDraftName(profileName)
      return
    }

    setIsSaving(true)
    try {
      await onUpdateUser(trimmedName)
      setProfileName(trimmedName)
      setIsEditingName(false)
    } finally {
      setIsSaving(false)
    }
  }

  const cancelNameEdit = () => {
    setIsEditingName(false)
    setDraftName(profileName)
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Profile</h1>
          <p className="page-subtitle">Manage your account details.</p>
        </div>
      </div>

      <div className="account-card" style={{ maxWidth: '720px' }}>
        <h2>Account details</h2>

        <div className="business-details-panel" style={{ marginTop: '20px' }}>
          <div className="business-detail-row">
            <div className="business-detail-label">
              <span>Name:</span>
              {!isEditingName && (
                <button
                  type="button"
                  className="business-detail-edit-button"
                  onClick={() => {
                    setDraftName(profileName)
                    setIsEditingName(true)
                  }}
                  aria-label="Edit name"
                >
                  ✎
                </button>
              )}
            </div>

            {isEditingName ? (
              <>
                <input
                  type="text"
                  value={draftName}
                  onChange={(event) => setDraftName(event.target.value)}
                  autoFocus
                />

                <div className="business-detail-actions">
                  <button
                    type="button"
                    className="primary-button business-detail-save-button"
                    onClick={() => void handleSaveName()}
                    disabled={isSaving || !draftName.trim()}
                  >
                    {isSaving ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    type="button"
                    className="business-detail-cancel-button"
                    onClick={cancelNameEdit}
                  >
                    Cancel
                  </button>
                </div>
              </>
            ) : (
              <div className="business-detail-value">{profileName}</div>
            )}
          </div>

          <div className="business-detail-row">
            <div className="business-detail-label">
              <span>Email:</span>
            </div>
            <div className="business-detail-value">{user.email}</div>
          </div>
        </div>

        <div className="stats-grid dashboard-stats" style={{ marginTop: '28px', marginBottom: '0' }}>
          <div className="stat-card">
            <span>Businesses Owned</span>
            <strong>{ownedBusinessCount}</strong>
          </div>
          <div className="stat-card">
            <span>Businesses Employed</span>
            <strong>{employeeBusinessCount}</strong>
          </div>
        </div>
      </div>
    </>
  )
}

export default Profile