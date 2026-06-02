import React, { useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { AppShell, Box, Paper, Stack, Text } from "@mantine/core";
import { Sidebar } from "../../organisms/Navigation/Sidebar/Sidebar";
import { Header } from "../../organisms/Navigation/Header/Header";
import {
  Breadcrumbs,
  BreadcrumbItem,
} from "../../organisms/Navigation/Breadcrumbs/Breadcrumbs";
import { useWms } from "../../../context/WmsContext";
import { useAuth } from "../../../context/AuthContext";
import { useNotifications } from "../../../context/NotificationContext";
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { refreshData, isLoading } = useWms();
  const { user, logout } = useAuth();
  const {
    notifications,
    unreadCount,
    connectionStatus,
    markAllRead,
    clearNotifications,
  } = useNotifications();
  const navigate = useNavigate();

  const authUser = user as {
    fullName?: string;
    full_name?: string;
    roleName?: string;
    role?: { name?: string | null } | null;
  } | null;

  const resolvedUserName = authUser?.fullName ?? authUser?.full_name ?? "User";
  const resolvedUserRole = authUser?.roleName ?? authUser?.role?.name ?? "User";
  const isPartyRole = resolvedUserRole.trim().toLowerCase() === "party";
  const pageEyebrow =
    pageTitle ?? breadcrumbs?.[breadcrumbs.length - 1]?.label ?? "Operations";

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
      padding={0}
      header={{ height: { base: 76, md: 84 } }}
      navbar={{
        width: isPartyRole ? 0 : { base: "100%", md: 240, lg: 240 },
        breakpoint: "md",
        collapsed: { mobile: isPartyRole || !mobileMenuOpen, desktop: isPartyRole },
      }}
      withBorder={false}
      transitionDuration={180}
      transitionTimingFunction="ease"
      style={{
        background:
          "radial-gradient(circle at top left, rgba(35, 196, 255, 0.16), transparent 24%), radial-gradient(circle at top right, rgba(62, 99, 221, 0.18), transparent 26%), linear-gradient(180deg, #0f1726 0%, #0b1320 48%, #070d18 100%)",
      }}
    >
      {isPartyRole ? null : (
        <Sidebar onMobileClose={() => setMobileMenuOpen(false)} />
      )}

      <AppShell.Header withBorder={false} bg="transparent">
        <Header
          onMenuClick={() => setMobileMenuOpen(true)}
          showMenuButton={!isPartyRole}
          onSync={refreshData}
          isSyncing={isLoading}
          userName={resolvedUserName}
          userRole={resolvedUserRole}
          userInitials={getInitials(resolvedUserName)}
          notificationCount={unreadCount}
          notifications={notifications}
          notificationConnectionStatus={connectionStatus}
          onMarkNotificationsRead={markAllRead}
          onClearNotifications={clearNotifications}
          onLogout={handleLogout}
          onProfileClick={() => navigate("/profile")}
        />
      </AppShell.Header>

      <AppShell.Main>
        <Box
          className={cn("min-h-[calc(100dvh-5.25rem)]", contentClassName)}
          px={{ base: "sm", md: "md", lg: "lg" }}
          py={{ base: "sm", md: "md" }}
        >
          <Box mx="auto" maw={1680}>
            <Stack gap="md">
              {showBreadcrumbs ? (
                <Paper
                  visibleFrom="md"
                  radius="xl"
                  px={{ base: "sm", md: "md" }}
                  py="xs"
                  withBorder
                  style={{
                    background: "rgba(8, 14, 25, 0.68)",
                    borderColor: "rgba(148, 163, 184, 0.12)",
                    backdropFilter: "blur(16px)",
                    boxShadow: "0 12px 32px rgba(2, 8, 23, 0.16)",
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
                      "linear-gradient(135deg, rgba(12, 21, 35, 0.96) 0%, rgba(8, 15, 26, 0.98) 100%)",
                    borderColor: "rgba(148, 163, 184, 0.12)",
                    boxShadow: "0 24px 64px rgba(2, 8, 23, 0.24)",
                  }}
                >
                  <Stack gap={8}>
                    <Text
                      size="xs"
                      tt="uppercase"
                      fw={700}
                      c="cyan.3"
                      style={{ letterSpacing: "0.16em" }}
                    >
                      {pageEyebrow}
                    </Text>
                    {pageTitle ? (
                      <Text
                        component="h1"
                        fz={{ base: 24, md: 30 }}
                        fw={800}
                        c="white"
                        lh={1.1}
                      >
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
