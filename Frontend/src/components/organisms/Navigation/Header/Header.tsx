import React from "react";
import {
  ActionIcon,
  Avatar,
  Burger,
  Button,
  Divider,
  Group,
  Indicator,
  Menu,
  Paper,
  ScrollArea,
  Stack,
  Text,
  UnstyledButton,
} from "@mantine/core";
import {
  Bell,
  CheckCheck,
  HelpCircle,
  LogOut,
  RefreshCw,
  Settings,
  Trash2,
  User,
} from "lucide-react";
import { Logo } from "../../../atoms/Logo";
import type { RealtimeNotification } from "../../../../context/NotificationContext";

export interface HeaderProps {
  onMenuClick?: () => void;
  isSyncing?: boolean;
  onSync?: () => void;
  userName?: string;
  userRole?: string;
  userInitials?: string;
  notificationCount?: number;
  notifications?: RealtimeNotification[];
  notificationConnectionStatus?: "connected" | "connecting" | "disconnected" | "error";
  onMarkNotificationsRead?: () => void;
  onClearNotifications?: () => void;
  onLogout?: () => void;
  onProfileClick?: () => void;
}

function formatNotificationTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Now";
  }

  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function Header({
  onMenuClick,
  isSyncing = false,
  onSync,
  userName = "John Doe",
  userRole = "Warehouse Manager",
  userInitials = "JD",
  notificationCount = 0,
  notifications = [],
  notificationConnectionStatus = "disconnected",
  onMarkNotificationsRead,
  onClearNotifications,
  onLogout,
  onProfileClick,
}: HeaderProps) {
  return (
    <Paper
      radius={0}
      h="100%"
      px={{ base: 10, md: 16 }}
      py={8}
      withBorder
      style={{
        background:
          "linear-gradient(180deg, rgba(10,18,31,0.96) 0%, rgba(10,18,31,0.92) 100%)",
        borderColor: "rgba(148, 163, 184, 0.14)",
        backdropFilter: "blur(18px)",
      }}
    >
      <Group justify="space-between" wrap="nowrap" h="100%" gap="sm">
        <Group gap={10} wrap="nowrap" style={{ minWidth: 0 }}>
          <Burger
            hiddenFrom="md"
            opened={false}
            onClick={onMenuClick}
            aria-label="Open navigation"
            size="sm"
          />

          <Group gap={8} wrap="nowrap" style={{ minWidth: 0 }}>
            <Logo style={{ maxHeight: 30, objectFit: "contain" }} />
            <Text
              size="sm"
              fw={800}
              c="white"
              style={{ letterSpacing: "0.12em", lineHeight: 1 }}
            >
              WMS
            </Text>
          </Group>
        </Group>

        <Group gap={6} wrap="nowrap">
          <Button
            visibleFrom="sm"
            variant="light"
            color="cyan"
            radius="md"
            size="xs"
            px="sm"
            leftSection={
              <RefreshCw
                size={14}
                className={isSyncing ? "animate-spin" : undefined}
              />
            }
            loading={isSyncing}
            onClick={onSync}
          >
            Sync
          </Button>

          <Menu shadow="lg" width={340} radius="lg" position="bottom-end">
            <Menu.Target>
              <Indicator
                inline
                disabled={notificationCount <= 0}
                label={notificationCount > 9 ? "9+" : notificationCount}
                color="red"
                size={16}
                offset={4}
                processing={notificationCount > 0}
              >
                <ActionIcon
                  variant="subtle"
                  color="gray"
                  radius="md"
                  size="md"
                  aria-label="Notifications"
                  onClick={onMarkNotificationsRead}
                >
                  <Bell size={15} />
                </ActionIcon>
              </Indicator>
            </Menu.Target>

            <Menu.Dropdown>
              <Group justify="space-between" px="sm" py={6} wrap="nowrap">
                <Stack gap={0}>
                  <Text size="sm" fw={800}>
                    Notifications
                  </Text>
                  <Text size="11px" c="dimmed">
                    {notificationConnectionStatus === "connected"
                      ? "Live WMS activity"
                      : `Live status: ${notificationConnectionStatus}`}
                  </Text>
                </Stack>
                <Group gap={4} wrap="nowrap">
                  <ActionIcon
                    size="sm"
                    variant="subtle"
                    color="gray"
                    aria-label="Mark notifications as read"
                    onClick={onMarkNotificationsRead}
                  >
                    <CheckCheck size={14} />
                  </ActionIcon>
                  <ActionIcon
                    size="sm"
                    variant="subtle"
                    color="red"
                    aria-label="Clear notifications"
                    onClick={onClearNotifications}
                  >
                    <Trash2 size={14} />
                  </ActionIcon>
                </Group>
              </Group>

              <Divider />

              {notifications.length > 0 ? (
                <ScrollArea.Autosize mah={320} type="auto">
                  <Stack gap={0}>
                    {notifications.map((notification) => (
                      <Menu.Item key={notification.id} closeMenuOnClick={false}>
                        <Group align="flex-start" gap="xs" wrap="nowrap">
                          <Indicator
                            disabled={notification.read}
                            color="cyan"
                            size={7}
                            offset={2}
                          >
                            <Bell size={14} />
                          </Indicator>
                          <Stack gap={2} style={{ minWidth: 0 }}>
                            <Group justify="space-between" gap="xs" wrap="nowrap">
                              <Text size="xs" fw={800} lineClamp={1}>
                                {notification.title}
                              </Text>
                              <Text size="10px" c="dimmed" miw={42} ta="right">
                                {formatNotificationTime(notification.createdAt)}
                              </Text>
                            </Group>
                            <Text size="11px" c="dimmed" lineClamp={2}>
                              {notification.message}
                            </Text>
                          </Stack>
                        </Group>
                      </Menu.Item>
                    ))}
                  </Stack>
                </ScrollArea.Autosize>
              ) : (
                <Stack gap={4} align="center" px="md" py="xl">
                  <Bell size={20} color="var(--mantine-color-dimmed)" />
                  <Text size="sm" fw={700}>
                    No notifications
                  </Text>
                  <Text size="xs" c="dimmed" ta="center">
                    New inward and location activity will appear here.
                  </Text>
                </Stack>
              )}
            </Menu.Dropdown>
          </Menu>

          <Menu shadow="lg" width={220} radius="lg" position="bottom-end">
            <Menu.Target>
              <UnstyledButton
                style={{
                  display: "flex",
                  alignItems: "center",
                  minHeight: 40,
                  padding: "4px 8px",
                  borderRadius: "var(--mantine-radius-md)",
                  cursor: "pointer",
                  transition: "background-color 0.15s ease",
                }}
                className="hover:bg-white/5 active:bg-white/10"
              >
                <Group gap={8} wrap="nowrap">
                  <Avatar radius="xl" color="cyan" size={30}>
                    {userInitials}
                  </Avatar>
                  <Stack gap={0} visibleFrom="sm" align="flex-start">
                    <Text size="xs" fw={600} c="white" lh={1.1}>
                      {userName}
                    </Text>
                    <Text size="10px" c="dimmed" lh={1.1}>
                      {userRole}
                    </Text>
                  </Stack>
                </Group>
              </UnstyledButton>
            </Menu.Target>

            <Menu.Dropdown>
              <Menu.Label>{userName}</Menu.Label>
              <Menu.Item
                leftSection={<User size={15} />}
                onClick={onProfileClick}
              >
                Profile
              </Menu.Item>
              <Menu.Item leftSection={<Settings size={15} />}>
                Settings
              </Menu.Item>
              <Menu.Item leftSection={<HelpCircle size={15} />}>
                Help & Support
              </Menu.Item>
              <Menu.Divider />
              <Menu.Item
                color="red"
                leftSection={<LogOut size={15} />}
                onClick={onLogout}
              >
                Sign out
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>
        </Group>
      </Group>
    </Paper>
  );
}

Header.displayName = "Header";
