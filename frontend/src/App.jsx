import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Purchases from './pages/Purchases';
import Transfers from './pages/Transfers';
import Assignments from './pages/Assignments';

import { Toaster } from 'react-hot-toast';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  return (
    <>
      <Toaster position="top-right" />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="purchases" element={
            <ProtectedRoute allowedRoles={['Admin', 'Base Commander']}>
              <Purchases />
            </ProtectedRoute>
          } />
          <Route path="transfers" element={<Transfers />} />
          <Route path="assignments" element={<Assignments />} />
        </Route>
      </Routes>
    </>
  );
}

export default App;
