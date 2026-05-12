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
import { Button, Group, Modal, Text } from "@mantine/core";
import { Notifications } from "@mantine/notifications";
import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";
import { DashboardLayout } from "./components/templates/DashboardLayout";
import { PageLoader } from "./components/molecules/PageLoader/PageLoader";

// Lazy load pages for code splitting
const Login = lazy(() => import("./pages/Login"));
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
const RoleMaster = lazy(() => import("./pages/RoleMaster"));
const UserMaster = lazy(() => import("./pages/UserMaster"));

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

const UnauthorizedModal = () => (
  <Modal opened centered withCloseButton={false} onClose={() => undefined} title="Access denied">
    <Text fw={800} size="lg">You are not authorized</Text>
    <Text mt="xs" size="sm" c="dimmed">
      Your role does not have permission to open this page.
    </Text>
    <Group justify="flex-end" mt="md">
      <Button component="a" href="/" size="sm">
        Go to dashboard
      </Button>
    </Group>
  </Modal>
);

const PermissionRoute = ({
  pageKey,
  children,
}: {
  pageKey: string;
  children: React.ReactNode;
}) => {
  const { hasPermission, isLoading } = useAuth();

  if (isLoading) {
    return <PageLoader message="Checking permissions…" />;
  }

  if (!hasPermission(pageKey, "view")) {
    return <UnauthorizedModal />;
  }

  return <>{children}</>;
};

const pageElement = (pageKey: string, children: React.ReactNode) => (
  <PermissionRoute pageKey={pageKey}>
    <Suspense fallback={<PageLoader />}>{children}</Suspense>
  </PermissionRoute>
);

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
                  element={<Navigate to="/user-master" replace />}
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
                    element={pageElement("dashboard", <Dashboard />)}
                  />
                  <Route
                    path="inward"
                    element={pageElement("inward", <Inward />)}
                  />
                  <Route path="sticker" element={<Navigate to="/inward" replace />} />
                  <Route
                    path="putaway"
                    element={pageElement("putaway", <PutAway />)}
                  />
                  <Route
                    path="outward"
                    element={pageElement("outward", <Outward />)}
                  />
                  <Route
                    path="packing"
                    element={pageElement("packing", <Packing />)}
                  />
                  <Route
                    path="dispatch"
                    element={pageElement("dispatch", <Dispatch />)}
                  />
                  <Route
                    path="importers"
                    element={pageElement("importers", <Importers />)}
                  />
                  <Route
                    path="manufacturers"
                    element={pageElement("manufacturers", <Manufacturers />)}
                  />
                  <Route
                    path="commodities"
                    element={pageElement("commodities", <Commodities />)}
                  />
                  <Route
                    path="bins"
                    element={pageElement("bins", <Bins />)}
                  />
                  <Route
                    path="locations"
                    element={pageElement("locations", <Locations />)}
                  />
                  <Route
                    path="mpd"
                    element={pageElement("mpd", <MPD />)}
                  />
                  <Route
                    path="sticker-printer-config"
                    element={pageElement("sticker-printer-config", <StickerPrinterConfigMaster />)}
                  />
                  <Route
                    path="stock-check"
                    element={pageElement("stock-check", <StockCheck />)}
                  />
                  <Route
                    path="stock-movement"
                    element={pageElement("stock-movement", <StockMovement />)}
                  />
                  <Route
                    path="warehouse-map"
                    element={pageElement("warehouse-map", <WarehouseMap />)}
                  />
                  <Route
                    path="role-master"
                    element={pageElement("role-master", <RoleMaster />)}
                  />
                  <Route
                    path="user-master"
                    element={pageElement("user-master", <UserMaster />)}
                  />
                  <Route
                    path="profile"
                    element={pageElement("profile", <Profile />)}
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
