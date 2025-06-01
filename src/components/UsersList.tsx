import React, { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'

const UsersList: React.FC = () => {
  const [users, setUsers] = useState<any[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchUsers = async () => {
      const { data, error } = await supabase.from('users').select('*')
      if (error) {
        setError(error.message)
      } else {
        setUsers(data || [])
      }
    }

    fetchUsers()
  }, [])

  return (
    <div>
      <h2>Users</h2>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <ul>
        {users.map((user, idx) => (
          <li key={idx}>{JSON.stringify(user)}</li>
        ))}
      </ul>
    </div>
  )
}

export default UsersList