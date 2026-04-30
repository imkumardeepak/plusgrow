import React from "react";
import {
  ActionIcon,
  Avatar,
  Burger,
  Button,
  Group,
  Indicator,
  Menu,
  Paper,
  Stack,
  Text,
} from "@mantine/core";
import { Bell, HelpCircle, LogOut, RefreshCw, Settings, User } from "lucide-react";
import { Logo } from "../../../atoms/Logo";

export interface HeaderProps {
  onMenuClick?: () => void;
  isSyncing?: boolean;
  onSync?: () => void;
  userName?: string;
  userRole?: string;
  userInitials?: string;
  notificationCount?: number;
  onLogout?: () => void;
  onProfileClick?: () => void;
}

export function Header({
  onMenuClick,
  isSyncing = false,
  onSync,
  userName = "John Doe",
  userRole = "Warehouse Manager",
  userInitials = "JD",
  notificationCount = 3,
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

          <Indicator
            inline
            disabled={notificationCount <= 0}
            color="red"
            size={8}
            offset={6}
            processing={notificationCount > 0}
          >
            <ActionIcon
              variant="subtle"
              color="gray"
              radius="md"
              size="md"
              aria-label="Notifications"
            >
              <Bell size={15} />
            </ActionIcon>
          </Indicator>

          <Menu shadow="lg" width={220} radius="lg" position="bottom-end">
            <Menu.Target>
              <Button variant="subtle" color="gray" radius="md" px={6} h={36}>
                <Group gap={8} wrap="nowrap">
                  <Avatar radius="xl" color="cyan" size={28}>
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
              </Button>
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
