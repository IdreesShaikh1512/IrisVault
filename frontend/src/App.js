import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import '@/App.css';
import LandingPage from './pages/LandingPage';
import EnrollmentPage from './pages/EnrollmentPage';
import ATMPage from './pages/ATMPage';
import DashboardPage from './pages/DashboardPage';
import AdminPage from './pages/AdminPage';
import { Toaster } from './components/ui/sonner';

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/enroll" element={<EnrollmentPage />} />
          <Route path="/atm" element={<ATMPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/admin" element={<AdminPage />} />
        </Routes>
      </BrowserRouter>
      <Toaster position="top-right" richColors />
    </div>
  );
}

export default App;
