/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './context/AuthContext';
import { WmsProvider } from './context/WmsContext';
import { DashboardLayout } from './components/templates/DashboardLayout';
import { PageLoader } from './components/molecules/PageLoader/PageLoader';

// Lazy load pages for code splitting
const Dashboard = lazy(() => import('./pages/Dashboard').then(m => ({ default: m.Dashboard })));
const Inward = lazy(() => import('./pages/Inward').then(m => ({ default: m.Inward })));
const Sticker = lazy(() => import('./pages/Sticker').then(m => ({ default: m.Sticker })));
const Receiving = lazy(() => import('./pages/Receiving').then(m => ({ default: m.Receiving })));
const PutAway = lazy(() => import('./pages/PutAway').then(m => ({ default: m.PutAway })));
const Outward = lazy(() => import('./pages/Outward').then(m => ({ default: m.Outward })));
const Packing = lazy(() => import('./pages/Packing').then(m => ({ default: m.Packing })));
const Dispatch = lazy(() => import('./pages/Dispatch').then(m => ({ default: m.Dispatch })));
const Importers = lazy(() => import('./pages/Importers').then(m => ({ default: m.Importers })));
const Manufacturers = lazy(() => import('./pages/Manufacturers').then(m => ({ default: m.Manufacturers })));
const Commodities = lazy(() => import('./pages/Commodities').then(m => ({ default: m.Commodities })));
const MPD = lazy(() => import('./pages/MPD').then(m => ({ default: m.MPD })));
const StockCheck = lazy(() => import('./pages/StockCheck').then(m => ({ default: m.StockCheck })));
const StockMovement = lazy(() => import('./pages/StockMovement').then(m => ({ default: m.StockMovement })));
const WarehouseMap = lazy(() => import('./pages/WarehouseMap').then(m => ({ default: m.WarehouseMap })));
const Login = lazy(() => import('./pages/Login').then(m => ({ default: m.Login })));
const Register = lazy(() => import('./pages/Register').then(m => ({ default: m.Register })));
const Profile = lazy(() => import('./pages/Profile').then(m => ({ default: m.Profile })));

// Protected Route Wrapper
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, isLoading } = useAuth();
  
  if (isLoading) {
    return (
      <div className="theme-shell flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 rounded-full border-[3px] border-brand-400 border-t-transparent animate-spin" />
          <p className="text-neutral-300">Loading...</p>
        </div>
      </div>
    );
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
};

// Create Query Client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      refetchOnWindowFocus: false,
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <WmsProvider>
          <AuthProvider>
            <Toaster position="top-right" richColors />
            <Routes>
              {/* Public Routes */}
              <Route path="/login" element={
                <Suspense fallback={<PageLoader />}>
                  <Login />
                </Suspense>
              } />
              <Route path="/register" element={
                <Suspense fallback={<PageLoader />}>
                  <Register />
                </Suspense>
              } />
              
              {/* Protected Routes */}
              <Route path="/" element={
                <ProtectedRoute>
                  <DashboardLayout />
                </ProtectedRoute>
              }>
                <Route index element={
                  <Suspense fallback={<PageLoader />}>
                    <Dashboard />
                  </Suspense>
                } />
                <Route path="inward" element={
                  <Suspense fallback={<PageLoader />}>
                    <Inward />
                  </Suspense>
                } />
                <Route path="sticker" element={
                  <Suspense fallback={<PageLoader />}>
                    <Sticker />
                  </Suspense>
                } />
                <Route path="receiving" element={
                  <Suspense fallback={<PageLoader />}>
                    <Receiving />
                  </Suspense>
                } />
                <Route path="putaway" element={
                  <Suspense fallback={<PageLoader />}>
                    <PutAway />
                  </Suspense>
                } />
                <Route path="outward" element={
                  <Suspense fallback={<PageLoader />}>
                    <Outward />
                  </Suspense>
                } />
                <Route path="packing" element={
                  <Suspense fallback={<PageLoader />}>
                    <Packing />
                  </Suspense>
                } />
                <Route path="dispatch" element={
                  <Suspense fallback={<PageLoader />}>
                    <Dispatch />
                  </Suspense>
                } />
                <Route path="importers" element={
                  <Suspense fallback={<PageLoader />}>
                    <Importers />
                  </Suspense>
                } />
                <Route path="manufacturers" element={
                  <Suspense fallback={<PageLoader />}>
                    <Manufacturers />
                  </Suspense>
                } />
                <Route path="commodities" element={
                  <Suspense fallback={<PageLoader />}>
                    <Commodities />
                  </Suspense>
                } />
                <Route path="mpd" element={
                  <Suspense fallback={<PageLoader />}>
                    <MPD />
                  </Suspense>
                } />
                <Route path="stock-check" element={
                  <Suspense fallback={<PageLoader />}>
                    <StockCheck />
                  </Suspense>
                } />
                <Route path="stock-movement" element={
                  <Suspense fallback={<PageLoader />}>
                    <StockMovement />
                  </Suspense>
                } />
                <Route path="warehouse-map" element={
                  <Suspense fallback={<PageLoader />}>
                    <WarehouseMap />
                  </Suspense>
                } />
                <Route path="profile" element={
                  <Suspense fallback={<PageLoader />}>
                    <Profile />
                  </Suspense>
                } />
              </Route>
              
              {/* Catch all - redirect to login */}
              <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
          </AuthProvider>
        </WmsProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
