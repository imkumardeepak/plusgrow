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
  HelpCircle,
  LogOut,
  RefreshCw,
  Search,
  Settings,
  User,
} from "lucide-react";
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
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <Paper
      radius={0}
      h="100%"
      px={{ base: "sm", md: "lg" }}
      py="sm"
      withBorder
      style={{
        background:
          "linear-gradient(180deg, rgba(10,18,31,0.96) 0%, rgba(10,18,31,0.92) 100%)",
        borderColor: "rgba(148, 163, 184, 0.14)",
        backdropFilter: "blur(18px)",
      }}
    >
      <Group justify="space-between" wrap="nowrap" h="100%" gap="md">
        <Group gap="sm" wrap="nowrap" style={{ minWidth: 0 }}>
          <Burger
            hiddenFrom="md"
            opened={false}
            onClick={onMenuClick}
            aria-label="Open navigation"
          />

          <Logo style={{ maxHeight: 36, objectFit: "contain" }} />
        </Group>

        <Group gap="xs" wrap="nowrap">
          <TextInput
            visibleFrom="sm"
            w={{ sm: 220, lg: 320 }}
            placeholder="Search SKU, invoice, location..."
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

          <ActionIcon
            hiddenFrom="sm"
            variant="subtle"
            color="gray"
            radius="xl"
            aria-label="Search"
          >
            <Search size={16} />
          </ActionIcon>

          <Button
            visibleFrom="sm"
            variant="light"
            color="cyan"
            radius="xl"
            leftSection={
              <RefreshCw
                size={16}
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
              radius="xl"
              aria-label="Notifications"
            >
              <Bell size={16} />
            </ActionIcon>
          </Indicator>

          <Menu shadow="lg" width={240} radius="xl" position="bottom-end">
            <Menu.Target>
              <Button variant="subtle" color="gray" radius="xl" px="xs">
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
