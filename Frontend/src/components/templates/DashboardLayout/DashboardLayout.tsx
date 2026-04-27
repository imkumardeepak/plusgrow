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
  const pageEyebrow = pageTitle ?? breadcrumbs?.[breadcrumbs.length - 1]?.label ?? "Operations";

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
      padding={{ base: "xs", md: "sm" }}
      header={{ height: { base: 72, md: 82 } }}
      navbar={{
        width: { base: "100%", md: sidebarCollapsed ? 92 : 296 },
        breakpoint: "md",
        collapsed: { mobile: !mobileMenuOpen, desktop: false },
      }}
      withBorder={false}
      transitionDuration={180}
      transitionTimingFunction="ease"
      style={{
        background:
          "radial-gradient(circle at top left, rgba(35, 196, 255, 0.16), transparent 24%), radial-gradient(circle at top right, rgba(62, 99, 221, 0.18), transparent 26%), linear-gradient(180deg, #0f1726 0%, #0b1320 48%, #070d18 100%)",
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
        <Box className={cn("min-h-[calc(100dvh-5.75rem)]", contentClassName)}>
          <Box mx="auto" maw={1640}>
            <Stack gap="sm">
              {showBreadcrumbs ? (
                <Paper
                  radius="xl"
                  px={{ base: "sm", md: "md" }}
                  py="xs"
                  withBorder
                  style={{
                    background: "rgba(8, 14, 25, 0.72)",
                    borderColor: "rgba(148, 163, 184, 0.16)",
                    backdropFilter: "blur(16px)",
                    boxShadow: theme.shadows.xs,
                  }}
                >
                  <Breadcrumbs items={breadcrumbs} />
                </Paper>
              ) : null}

              {pageTitle || pageDescription ? (
                <Paper
                  radius="xl"
                  px={{ base: "md", md: "lg" }}
                  py={{ base: "md", md: "lg" }}
                  withBorder
                  style={{
                    background:
                      "linear-gradient(180deg, rgba(13, 21, 35, 0.92) 0%, rgba(9, 15, 26, 0.96) 100%)",
                    borderColor: "rgba(148, 163, 184, 0.14)",
                    boxShadow: "0 22px 60px rgba(2, 8, 23, 0.24)",
                  }}
                >
                  <Stack gap={6}>
                    <Text size="xs" tt="uppercase" fw={700} c="cyan.3" style={{ letterSpacing: "0.16em" }}>
                      {pageEyebrow}
                    </Text>
                    {pageTitle ? (
                      <Text component="h1" fz={{ base: 24, md: 30 }} fw={800} c="white" lh={1.1}>
                        {pageTitle}
                      </Text>
                    ) : null}
                    {pageDescription ? (
                      <Text maw={920} size="sm" c="dimmed" lh={1.6}>
                        {pageDescription}
                      </Text>
                    ) : null}
                  </Stack>
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
