import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import HomePage from '@/pages/HomePage';
import DashboardPage from '@/pages/DashboardPage';
import LoginPage from '@/pages/LoginPage';
import SignUpPage from '@/pages/SignUpPage';
import AccountPage from '@/pages/AccountPage';
import AdminPage from '@/pages/AdminPage';
import ResetPasswordPage from '@/pages/ResetPasswordPage';
import CheckoutSuccessPage from '@/pages/CheckoutSuccessPage';
import CheckoutCancelPage from '@/pages/CheckoutCancelPage';
import Header from '@/components/Header';
import { useAuth } from '@/contexts/AuthContext';
import { AnimatePresence } from 'framer-motion';

const PrivateRoute = ({ children, requiredRole }) => {
  const { user, role, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div>Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  if (requiredRole && role !== requiredRole) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

function App() {
  return (
    <div className="min-h-screen bg-slate-50">
      <Header />
      <main>
        <AnimatePresence mode="wait">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignUpPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/checkout/success" element={<CheckoutSuccessPage />} />
            <Route path="/checkout/cancel" element={<CheckoutCancelPage />} />
            <Route
              path="/dashboard"
              element={<PrivateRoute><DashboardPage /></PrivateRoute>}
            />
            <Route
              path="/account"
              element={<PrivateRoute><AccountPage /></PrivateRoute>}
            />
            <Route
              path="/admin"
              element={<PrivateRoute requiredRole="admin"><AdminPage /></PrivateRoute>}
            />
          </Routes>
        </AnimatePresence>
      </main>
    </div>
  );
}

export default App;