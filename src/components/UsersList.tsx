import React, { useEffect, useState } from 'react';
import { getUsers } from '@/lib/dataService';
import type { User } from '@/types';

const UsersList: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchLocalUsers = async () => {
      try {
        const localUsers = await getUsers();
        setUsers(localUsers);
      } catch (err: any) {
        setError(err.message);
      }
    };

    fetchLocalUsers();
  }, []);

  return (
    <div>
      <h2>Users</h2>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <ul>
        {users.map((user) => (
          <li key={user.id}>{JSON.stringify(user)}</li>
        ))}
      </ul>
    </div>
  );
};

export default UsersList;
