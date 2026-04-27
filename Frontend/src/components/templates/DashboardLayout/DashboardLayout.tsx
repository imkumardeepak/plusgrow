import React, { useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { AppShell, Box, Paper, Stack, Text, useMantineTheme } from "@mantine/core";
import { Sidebar } from "../../organisms/Navigation/Sidebar/Sidebar";
import { Header } from "../../organisms/Navigation/Header/Header";
import { Breadcrumbs, BreadcrumbItem } from "../../organisms/Navigation/Breadcrumbs/Breadcrumbs";
import { useWms } from "../../../context/WmsContext";
import { useAuth } from "../../../context/AuthContext";
import { cn } from "../../../lib/utils";

export interface DashboardLayoutProps {
  breadcrumbs?: BreadcrumbItem[];
  showBreadcrumbs?: boolean;
  pageTitle?: string;
  pageDescription?: string;
  contentClassName?: string;
}

export function DashboardLayout({
  breadcrumbs,
  showBreadcrumbs = true,
  pageTitle,
  pageDescription,
  contentClassName,
}: DashboardLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { refreshData, isLoading } = useWms();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const theme = useMantineTheme();

  const authUser = user as
    | {
        fullName?: string;
        full_name?: string;
        roleName?: string;
        role?: { name?: string | null } | null;
      }
    | null;

  const resolvedUserName = authUser?.fullName ?? authUser?.full_name ?? "User";
  const resolvedUserRole = authUser?.roleName ?? authUser?.role?.name ?? "User";

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const getInitials = (name: string) =>
    name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

  return (
    <AppShell
      padding={{ base: "sm", md: "md" }}
      header={{ height: { base: 78, md: 88 } }}
      navbar={{
        width: sidebarCollapsed ? 92 : 312,
        breakpoint: "md",
        collapsed: { mobile: !mobileMenuOpen, desktop: false },
      }}
      withBorder={false}
      transitionDuration={220}
      transitionTimingFunction="ease"
      style={{
        background:
          "radial-gradient(circle at top, rgba(17,167,223,0.16), transparent 34%), linear-gradient(180deg, #111e31 0%, #09111f 44%, #060d19 100%)",
      }}
    >
      <Sidebar
        collapsed={sidebarCollapsed}
        mobileOpen={mobileMenuOpen}
        onMobileClose={() => setMobileMenuOpen(false)}
        onCollapseChange={setSidebarCollapsed}
      />

      <AppShell.Header withBorder={false} bg="transparent">
        <Header
          onMenuClick={() => setMobileMenuOpen(true)}
          onSidebarToggle={() => setSidebarCollapsed((current) => !current)}
          sidebarCollapsed={sidebarCollapsed}
          onSync={refreshData}
          isSyncing={isLoading}
          userName={resolvedUserName}
          userRole={resolvedUserRole}
          userInitials={getInitials(resolvedUserName)}
          onLogout={handleLogout}
          onProfileClick={() => navigate("/profile")}
        />
      </AppShell.Header>

      <AppShell.Main>
        <Box className={cn("min-h-[calc(100dvh-7rem)]", contentClassName)}>
          <Box mx="auto" maw={1680}>
            <Stack gap="md">
              {showBreadcrumbs ? (
                <Paper
                  radius="xl"
                  p="md"
                  withBorder
                  style={{
                    backgroundColor: "rgba(10, 18, 32, 0.78)",
                    borderColor: "rgba(255,255,255,0.08)",
                    boxShadow: theme.shadows.sm,
                  }}
                >
                  <Breadcrumbs items={breadcrumbs} />
                </Paper>
              ) : null}

              {pageTitle || pageDescription ? (
                <Paper
                  radius="xl"
                  p="lg"
                  withBorder
                  style={{
                    background:
                      "linear-gradient(180deg, rgba(15,24,40,0.88) 0%, rgba(10,18,32,0.94) 100%)",
                    borderColor: "rgba(255,255,255,0.08)",
                  }}
                >
                  {pageTitle ? (
                    <Text component="h1" fz={{ base: 24, md: 30 }} fw={800} c="white">
                      {pageTitle}
                    </Text>
                  ) : null}
                  {pageDescription ? (
                    <Text mt={6} size="sm" c="dimmed">
                      {pageDescription}
                    </Text>
                  ) : null}
                </Paper>
              ) : null}

              <Outlet />
            </Stack>
          </Box>
        </Box>
      </AppShell.Main>
    </AppShell>
  );
}

DashboardLayout.displayName = "DashboardLayout";
