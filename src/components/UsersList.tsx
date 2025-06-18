import React, { useEffect, useState } from 'react';
// Import the subscribeToUsers function
import { subscribeToUsers } from '@/lib/dataService';
// We still need supabase client for initial fetch, but dataService is preferred for operations
// import { supabase } from '../supabaseClient'; 

const UsersList: React.FC = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Function to fetch initial users
    const fetchInitialUsers = async () => {
      // Using the getUsers function from dataService.ts for consistency
      // Make sure getUsers in dataService.ts is properly implemented to fetch from Supabase
      // If getUsers is not implemented yet, you might need to implement it first.
      // For now, let's assume getUsers fetches from supabase as shown in your original code.
       const { data, error } = await supabase.from('users').select('*'); // Keep this for initial fetch if getUsers not ready

      if (error) {
        setError(error.message);
      } else {
        setUsers(data || []);
      }
    };

    // Call the function to fetch initial users
    fetchInitialUsers();

    // Set up the real-time subscription
    const usersChannel = subscribeToUsers((payload) => {
      console.log('Real-time user change:', payload);

      // Handle different event types
      if (payload.eventType === 'INSERT') {
        // Add new user to the list
        setUsers((prevUsers) => [...prevUsers, payload.new]);
      } else if (payload.eventType === 'DELETE') {
        // Remove deleted user from the list
        setUsers((prevUsers) => prevUsers.filter(user => user.id !== payload.old.id));
      } else if (payload.eventType === 'UPDATE') {
        // Update existing user in the list
        setUsers((prevUsers) => prevUsers.map(user => user.id === payload.new.id ? payload.new : user));
      }
      // You might want to handle 'error' event types from the subscription if needed
    });

    // Cleanup function: unsubscribe when the component unmounts
    return () => {
      console.log('Unsubscribing from users channel');
      usersChannel.unsubscribe();
    };

  }, []); // Empty dependency array ensures this effect runs only once on mount

  return (
    <div>
      <h2>Users</h2>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <ul>
        {users.map((user, idx) => (
          // Use a unique key, preferably user.id if available
          <li key={user.id || idx}>{JSON.stringify(user)}</li>
        ))}
      </ul>
    </div>
  );
};

export default UsersList;
