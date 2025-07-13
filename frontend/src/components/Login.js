import React, { useState } from 'react';
import { api } from '../lib/api';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    const body = new URLSearchParams({ username, password });
    try {
      const { data } = await api.post('/auth/token', body);
      localStorage.setItem('aquila.jwt', data.access_token);
      window.location.reload();
    } catch (err) {
      alert('Login failed');
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2 max-w-xs mx-auto mt-20">
      <input
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        placeholder="username"
        className="border p-2 w-full"
      />
      <input
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        type="password"
        placeholder="password"
        className="border p-2 w-full"
      />
      <button className="bg-blue-600 text-white px-4 py-2 w-full">
        Login
      </button>
    </form>
  );
}
