import type { User } from '../types/User'

type UsersProps = {
  users: User[]
}

function Users({
  users,
}: UsersProps) {
  return (
    <>
        <h1>Users</h1>

        <div className="users-list">
        {users.map((u) => (
            <div className="user-card" key={u.id}>
            <h2>{u.name}</h2>
            <p>{u.email}</p>
            </div>
        ))}
        </div>
    </>
  )
}

export default Users