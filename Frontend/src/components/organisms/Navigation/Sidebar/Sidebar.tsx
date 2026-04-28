import React from "react";
import { NavLink as RouterNavLink, useLocation } from "react-router-dom";
import {
  ActionIcon,
  AppShell,
  Box,
  Divider,
  Group,
  NavLink,
  ScrollArea,
  Stack,
  Text,
  ThemeIcon,
} from "@mantine/core";
import {
  LayoutDashboard,
  PackageCheck,
  Warehouse,
  X,
} from "lucide-react";
import { Logo } from "../../../atoms/Logo";
import { navigationGroups } from "../navigation";

export interface SidebarProps {
  onMobileClose?: () => void;
}

export function Sidebar({ onMobileClose }: SidebarProps) {
  const location = useLocation();

  return (
    <AppShell.Navbar
      p="md"
      withBorder
      style={{
        background:
          "linear-gradient(180deg, rgba(9,17,30,0.98) 0%, rgba(7,13,24,0.99) 100%)",
        borderColor: "rgba(148, 163, 184, 0.12)",
      }}
    >
      <AppShell.Section>
        <Group justify="space-between" wrap="nowrap" mb="md">
          <Group gap="sm" wrap="nowrap">
            <Box
              p={10}
              style={{
                borderRadius: 18,
                background:
                  "linear-gradient(135deg, rgba(23,185,236,0.18), rgba(10,139,191,0.08))",
                border: "1px solid rgba(30, 192, 243, 0.18)",
              }}
            >
              <Logo width={34} height={34} className="w-[34px] h-[34px]" />
            </Box>
            <Stack gap={0}>
              <Text fw={800} c="white" lh={1.1}>
                PlusGrow WMS
              </Text>
              <Text size="xs" c="dimmed">
                SaaS operations suite
              </Text>
            </Stack>
          </Group>

          <ActionIcon
            hiddenFrom="md"
            variant="subtle"
            color="gray"
            onClick={onMobileClose}
            aria-label="Close menu"
          >
            <X size={18} />
          </ActionIcon>
        </Group>

        <Box
          p="sm"
          style={{
            borderRadius: 20,
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.07)",
          }}
        >
          <Group gap="sm" wrap="nowrap" align="flex-start">
            <ThemeIcon
              size={40}
              radius="xl"
              variant="light"
              color="cyan"
            >
              <LayoutDashboard size={18} />
            </ThemeIcon>
            <Stack gap={3}>
              <Text size="sm" fw={700} c="white">
                Unified Navigation
              </Text>
              <Text size="11px" c="dimmed" lh={1.45}>
                Static header on top. Primary modules in sidebar. Better for
                daily ops flow.
              </Text>
            </Stack>
          </Group>
        </Box>
      </AppShell.Section>

      <Divider my="md" color="rgba(255,255,255,0.08)" />

      <AppShell.Section grow component={ScrollArea}>
        <Stack gap="lg" pb="xl">
          {navigationGroups.map((group) => (
            <Stack key={group.id} gap="xs">
              <Text
                size="xs"
                tt="uppercase"
                fw={700}
                c="dimmed"
                px="xs"
                style={{ letterSpacing: "0.16em" }}
              >
                {group.label}
              </Text>

              {group.items.map((item) => (
                <NavLink
                  key={item.id}
                  component={RouterNavLink}
                  to={item.href}
                  onClick={onMobileClose}
                  active={location.pathname === item.href}
                  variant="light"
                  color="cyan"
                  leftSection={<item.icon size={18} />}
                  label={item.label}
                  radius="xl"
                  styles={{
                    root: {
                      minHeight: 44,
                      borderRadius: 18,
                      color:
                        location.pathname === item.href
                          ? "var(--mantine-color-cyan-0)"
                          : "var(--mantine-color-gray-3)",
                      background:
                        location.pathname === item.href
                          ? "linear-gradient(90deg, rgba(23,185,236,0.22) 0%, rgba(10,139,191,0.18) 100%)"
                          : "transparent",
                      border:
                        location.pathname === item.href
                          ? "1px solid rgba(30, 192, 243, 0.24)"
                          : "1px solid transparent",
                    },
                    label: {
                      fontWeight: 600,
                    },
                    description: {
                      color: "var(--mantine-color-gray-5)",
                    },
                  }}
                />
              ))}
            </Stack>
          ))}
        </Stack>
      </AppShell.Section>

      <Divider my="md" color="rgba(255,255,255,0.08)" />

      <AppShell.Section>
        <Stack gap="xs">
          <Group gap="xs" wrap="nowrap">
            <ThemeIcon size={36} radius="xl" variant="light" color="cyan">
              <Warehouse size={16} />
            </ThemeIcon>
            <Stack gap={0}>
              <Text size="sm" fw={700} c="white">
                Warehouse Control
              </Text>
              <Text size="11px" c="dimmed">
                Stable desktop navigation
              </Text>
            </Stack>
          </Group>
          <Group gap="xs" wrap="nowrap">
            <ThemeIcon size={36} radius="xl" variant="light" color="indigo">
              <PackageCheck size={16} />
            </ThemeIcon>
            <Stack gap={0}>
              <Text size="sm" fw={700} c="white">
                Process Ready
              </Text>
              <Text size="11px" c="dimmed">
                Shared shell across ops pages
              </Text>
            </Stack>
          </Group>
        </Stack>
      </AppShell.Section>
    </AppShell.Navbar>
  );
}

Sidebar.displayName = "Sidebar";
