import { useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ProtectedRoute, PublicRoute } from '@/components/common/route-guards';
import { AppLayout } from '@/components/common/app-layout';
import { LoginPage } from '@/features/auth/login-page';
import { RegisterPage } from '@/features/auth/register-page';
import { DashboardPage } from '@/features/dashboard/dashboard-page';
import { TransactionsPage } from '@/features/transactions/transactions-page';
import { AccountsPage } from '@/features/accounts/accounts-page';
import { BudgetsPage } from '@/features/budgets/budgets-page';
import { GoalsPage } from '@/features/goals/goals-page';
import { ReportsPage } from '@/features/reports/reports-page';
import { SecurityCenterPage } from '@/features/security/security-center-page';

const ROUTE_TITLES: Record<string, string> = {
  '/login': 'NEST · Sign In',
  '/register': 'NEST · Create Account',
  '/dashboard': 'NEST · Dashboard',
  '/transactions': 'NEST · Transactions',
  '/accounts': 'NEST · Accounts',
  '/budgets': 'NEST · Budgets',
  '/goals': 'NEST · Goals',
  '/reports': 'NEST · Reports',
  '/security': 'NEST · Security Center',
  '/settings': 'NEST · Settings',
};

export function App() {
  const location = useLocation();

  useEffect(() => {
    const title = ROUTE_TITLES[location.pathname] || 'NEST — Network for Everyday Spending & Tracking';
    document.title = title;
  }, [location.pathname]);

  return (
    <Routes>
      {/* Public routes */}
      <Route
        path="/login"
        element={
          <PublicRoute>
            <LoginPage />
          </PublicRoute>
        }
      />
      <Route
        path="/register"
        element={
          <PublicRoute>
            <RegisterPage />
          </PublicRoute>
        }
      />

      {/* Protected routes with layout */}
      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/accounts" element={<AccountsPage />} />
        <Route path="/transactions" element={<TransactionsPage />} />
        <Route path="/budgets" element={<BudgetsPage />} />
        <Route path="/goals" element={<GoalsPage />} />
        <Route path="/reports" element={<ReportsPage />} />
        <Route path="/security" element={<SecurityCenterPage />} />
        <Route path="/settings" element={<PlaceholderPage title="Settings" />} />
      </Route>

      {/* Redirects */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <div className="text-center">
        <h1 className="text-xl font-bold text-[#101828] dark:text-[#F3F4F6]">{title}</h1>
        <p className="mt-1 text-xs text-[#475467] dark:text-[#B7C0CC]">NEST workspace module under development</p>
      </div>
    </div>
  );
}

function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F6F8FB] dark:bg-[#0A0D12] px-4 transition-colors duration-200">
      <div className="text-center">
        <h1 className="text-5xl font-extrabold text-[#101828] dark:text-[#F3F4F6] tracking-tight">404</h1>
        <p className="mt-2 text-xs font-semibold text-[#475467] dark:text-[#B7C0CC]">Resource not found in NEST workspace</p>
        <a
          href="/"
          className="mt-4 inline-flex items-center justify-center rounded-lg bg-[#101828] dark:bg-[#F3F4F6] px-4 py-2 text-xs font-bold text-white dark:text-[#0A0D12] shadow-xs hover:bg-[#1E293B] dark:hover:bg-[#E5E7EB] transition"
        >
          Return to Dashboard
        </a>
      </div>
    </main>
  );
}
