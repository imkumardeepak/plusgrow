import React, { useState } from "react";
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
  TextInput,
} from "@mantine/core";
import {
  Bell,
  ChevronDown,
  HelpCircle,
  LogOut,
  RefreshCw,
  Search,
  Settings,
  User,
} from "lucide-react";
import { cn } from "../../../../lib/utils";

export interface HeaderProps {
  onMenuClick?: () => void;
  onSidebarToggle?: () => void;
  sidebarCollapsed?: boolean;
  isSyncing?: boolean;
  onSync?: () => void;
  userName?: string;
  userRole?: string;
  userInitials?: string;
  notificationCount?: number;
  onLogout?: () => void;
  onProfileClick?: () => void;
  className?: string;
}

export function Header({
  onMenuClick,
  onSidebarToggle,
  sidebarCollapsed,
  isSyncing = false,
  onSync,
  userName = "John Doe",
  userRole = "Warehouse Manager",
  userInitials = "JD",
  notificationCount = 3,
  onLogout,
  onProfileClick,
  className,
}: HeaderProps) {
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <Paper
      radius="xl"
      mx={{ base: "sm", md: "md" }}
      mt={{ base: "sm", md: "md" }}
      px={{ base: "sm", md: "md" }}
      py="xs"
      withBorder
      className={cn(className)}
      style={{
        background: "linear-gradient(180deg, rgba(22,33,52,0.88) 0%, rgba(15,24,40,0.92) 100%)",
        backdropFilter: "blur(18px)",
      }}
    >
      <Group justify="space-between" wrap="nowrap" gap="sm">
        <Group gap="sm" wrap="nowrap" flex={1}>
          <Burger hiddenFrom="md" opened={false} onClick={onMenuClick} aria-label="Open menu" />
          <ActionIcon
            visibleFrom="md"
            variant="subtle"
            color="gray"
            radius="xl"
            onClick={onSidebarToggle}
            aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <ChevronDown
              size={16}
              style={{
                transform: sidebarCollapsed ? "rotate(-90deg)" : "rotate(90deg)",
                transition: "transform 200ms ease",
              }}
            />
          </ActionIcon>

          <TextInput
            visibleFrom="sm"
            flex={1}
            maw={420}
            placeholder="Search inventory, SKU, order..."
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.currentTarget.value)}
            leftSection={<Search size={16} />}
            radius="xl"
            styles={{
              input: {
                backgroundColor: "rgba(255,255,255,0.03)",
                borderColor: "rgba(255,255,255,0.1)",
              },
            }}
          />
        </Group>

        <Group gap="xs" wrap="nowrap">
          <Button
            visibleFrom="sm"
            variant="light"
            color="cyan"
            radius="xl"
            leftSection={<RefreshCw size={16} className={isSyncing ? "animate-spin" : undefined} />}
            loading={isSyncing}
            onClick={onSync}
          >
            Sync
          </Button>

          <ActionIcon hiddenFrom="sm" variant="subtle" color="gray" radius="xl" aria-label="Search">
            <Search size={16} />
          </ActionIcon>

          <Indicator
            inline
            disabled={notificationCount <= 0}
            color="red"
            size={8}
            offset={6}
            processing={notificationCount > 0}
          >
            <ActionIcon variant="subtle" color="gray" radius="xl" aria-label="Notifications">
              <Bell size={16} />
            </ActionIcon>
          </Indicator>

          <Menu shadow="lg" width={240} radius="xl" position="bottom-end">
            <Menu.Target>
              <Button variant="subtle" color="gray" radius="xl" px="xs" rightSection={<ChevronDown size={14} />}>
                <Group gap="xs" wrap="nowrap">
                  <Avatar radius="xl" color="cyan">
                    {userInitials}
                  </Avatar>
                  <Stack gap={0} visibleFrom="sm" align="flex-start">
                    <Text size="sm" fw={600} c="white" lh={1.15}>
                      {userName}
                    </Text>
                    <Text size="xs" c="dimmed">
                      {userRole}
                    </Text>
                  </Stack>
                </Group>
              </Button>
            </Menu.Target>

            <Menu.Dropdown>
              <Menu.Label>{userName}</Menu.Label>
              <Menu.Item leftSection={<User size={15} />} onClick={onProfileClick}>
                Profile
              </Menu.Item>
              <Menu.Item leftSection={<Settings size={15} />}>Settings</Menu.Item>
              <Menu.Item leftSection={<HelpCircle size={15} />}>Help & Support</Menu.Item>
              <Menu.Divider />
              <Menu.Item color="red" leftSection={<LogOut size={15} />} onClick={onLogout}>
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
