import React from "react";
import { NavLink as RouterNavLink, useLocation } from "react-router-dom";
import {
  ActionIcon,
  AppShell,
  Group,
  NavLink,
  ScrollArea,
  Stack,
  Text,
} from "@mantine/core";
import { X } from "lucide-react";
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
        <Group justify="flex-end" wrap="nowrap" mb="md">
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
      </AppShell.Section>

      <AppShell.Section grow component={ScrollArea}>
        <Stack gap="lg" pb="xl">
          {navigationGroups.map((group) => (
            <Stack key={group.id} gap="xs">
              <Group gap="xs" px="xs" wrap="nowrap">
                <group.icon size={12} />
                <Text
                  size="xs"
                  tt="uppercase"
                  fw={700}
                  c="dimmed"
                  style={{ letterSpacing: "0.16em" }}
                >
                  {group.label}
                </Text>
              </Group>

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
    </AppShell.Navbar>
  );
}

Sidebar.displayName = "Sidebar";
