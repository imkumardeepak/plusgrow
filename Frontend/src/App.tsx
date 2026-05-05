/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { NotificationProvider } from "./context/NotificationContext";
import { WmsProvider } from "./context/WmsContext";
import { MantineProvider, createTheme } from "@mantine/core";
import { Notifications } from "@mantine/notifications";
import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";
import { DashboardLayout } from "./components/templates/DashboardLayout";
import { PageLoader } from "./components/molecules/PageLoader/PageLoader";

// Lazy load pages for code splitting
const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Inward = lazy(() => import("./pages/Inward"));
const PutAway = lazy(() => import("./pages/PutAway"));
const Outward = lazy(() => import("./pages/Outward"));
const Packing = lazy(() => import("./pages/Packing"));
const Dispatch = lazy(() => import("./pages/Dispatch"));
const Importers = lazy(() => import("./pages/Importers"));
const Manufacturers = lazy(() => import("./pages/Manufacturers"));
const Commodities = lazy(() => import("./pages/Commodities"));
const Bins = lazy(() => import("./pages/Bins"));
const Locations = lazy(() => import("./pages/Locations"));
const MPD = lazy(() => import("./pages/MPD"));
const StickerPrinterConfigMaster = lazy(
  () => import("./pages/StickerPrinterConfigMaster"),
);
const StockCheck = lazy(() => import("./pages/StockCheck"));
const StockMovement = lazy(() => import("./pages/StockMovement"));
const WarehouseMap = lazy(() => import("./pages/WarehouseMap"));
const Profile = lazy(() => import("./pages/Profile"));

// Protected Route Wrapper
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <PageLoader message="Verifying session…" />;
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

const theme = createTheme({
  primaryColor: "cyan",
  fontFamily: "Manrope, sans-serif",
  headings: {
    fontFamily: "Poppins, sans-serif",
    fontWeight: "700",
  },
  defaultRadius: "lg",
  colors: {
    cyan: [
      "#e6fbff",
      "#b6f1ff",
      "#7de5ff",
      "#43d4ff",
      "#1ec0f3",
      "#11a7df",
      "#0a8bbf",
      "#0a6994",
      "#0c4e70",
      "#06131f",
    ],
  },
});

export default function App() {
  return (
    <MantineProvider theme={theme} defaultColorScheme="dark">
      <Notifications />
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AuthProvider>
            <NotificationProvider>
              <WmsProvider>
                <Routes>
                {/* Public Routes */}
                <Route
                  path="/login"
                  element={
                    <Suspense
                      fallback={<PageLoader message="Loading Login…" />}
                    >
                      <Login />
                    </Suspense>
                  }
                />
                <Route
                  path="/register"
                  element={
                    <Suspense
                      fallback={<PageLoader message="Loading Register…" />}
                    >
                      <Register />
                    </Suspense>
                  }
                />

                {/* Protected Routes */}
                <Route
                  path="/"
                  element={
                    <ProtectedRoute>
                      <DashboardLayout />
                    </ProtectedRoute>
                  }
                >
                  <Route
                    index
                    element={
                      <Suspense
                        fallback={<PageLoader message="Loading Dashboard…" />}
                      >
                        <Dashboard />
                      </Suspense>
                    }
                  />
                  <Route
                    path="inward"
                    element={
                      <Suspense fallback={<PageLoader />}>
                        <Inward />
                      </Suspense>
                    }
                  />
                  <Route path="sticker" element={<Navigate to="/inward" replace />} />
                  <Route
                    path="putaway"
                    element={
                      <Suspense fallback={<PageLoader />}>
                        <PutAway />
                      </Suspense>
                    }
                  />
                  <Route
                    path="outward"
                    element={
                      <Suspense fallback={<PageLoader />}>
                        <Outward />
                      </Suspense>
                    }
                  />
                  <Route
                    path="packing"
                    element={
                      <Suspense fallback={<PageLoader />}>
                        <Packing />
                      </Suspense>
                    }
                  />
                  <Route
                    path="dispatch"
                    element={
                      <Suspense fallback={<PageLoader />}>
                        <Dispatch />
                      </Suspense>
                    }
                  />
                  <Route
                    path="importers"
                    element={
                      <Suspense fallback={<PageLoader />}>
                        <Importers />
                      </Suspense>
                    }
                  />
                  <Route
                    path="manufacturers"
                    element={
                      <Suspense fallback={<PageLoader />}>
                        <Manufacturers />
                      </Suspense>
                    }
                  />
                  <Route
                    path="commodities"
                    element={
                      <Suspense fallback={<PageLoader />}>
                        <Commodities />
                      </Suspense>
                    }
                  />
                  <Route
                    path="bins"
                    element={
                      <Suspense fallback={<PageLoader />}>
                        <Bins />
                      </Suspense>
                    }
                  />
                  <Route
                    path="locations"
                    element={
                      <Suspense fallback={<PageLoader />}>
                        <Locations />
                      </Suspense>
                    }
                  />
                  <Route
                    path="mpd"
                    element={
                      <Suspense fallback={<PageLoader />}>
                        <MPD />
                      </Suspense>
                    }
                  />
                  <Route
                    path="sticker-printer-config"
                    element={
                      <Suspense fallback={<PageLoader />}>
                        <StickerPrinterConfigMaster />
                      </Suspense>
                    }
                  />
                  <Route
                    path="stock-check"
                    element={
                      <Suspense fallback={<PageLoader />}>
                        <StockCheck />
                      </Suspense>
                    }
                  />
                  <Route
                    path="stock-movement"
                    element={
                      <Suspense fallback={<PageLoader />}>
                        <StockMovement />
                      </Suspense>
                    }
                  />
                  <Route
                    path="warehouse-map"
                    element={
                      <Suspense fallback={<PageLoader />}>
                        <WarehouseMap />
                      </Suspense>
                    }
                  />
                  <Route
                    path="profile"
                    element={
                      <Suspense fallback={<PageLoader />}>
                        <Profile />
                      </Suspense>
                    }
                  />
                </Route>

                {/* Catch all - redirect to login */}
                <Route path="*" element={<Navigate to="/login" replace />} />
                </Routes>
              </WmsProvider>
            </NotificationProvider>
          </AuthProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </MantineProvider>
  );
}
