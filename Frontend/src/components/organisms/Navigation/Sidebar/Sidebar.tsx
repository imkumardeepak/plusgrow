import React, { useState } from "react";
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
import { ChevronDown, ChevronRight, X } from "lucide-react";
import { navigationGroups } from "../navigation";

export interface SidebarProps {
  onMobileClose?: () => void;
}

export function Sidebar({ onMobileClose }: SidebarProps) {
  const location = useLocation();
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  const toggleGroup = (groupId: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  };

  return (
    <AppShell.Navbar
      p="md"
      withBorder
      style={{
        width: 240,
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

      <AppShell.Section
        grow
        component={ScrollArea}
        styles={{
          root: {
            "& [data-scrollbar]": {
              width: "6px !important",
            },
            "& [data-scrollbar-thumb]": {
              backgroundColor: "rgba(100, 116, 139, 0.5) !important",
              borderRadius: "3px !important",
            },
            "& [data-scrollbar-thumb]:hover": {
              backgroundColor: "rgba(148, 163, 184, 0.7) !important",
            },
            "& [data-scrollbar-track]": {
              backgroundColor: "rgba(15, 23, 42, 0.3) !important",
              borderRadius: "3px !important",
            },
          },
        }}
      >
        <Stack gap="xs" pb="xl">
          {navigationGroups.map((group) => {
            const isExpanded = expandedGroups.has(group.id);
            const hasActiveItem = group.items.some(
              (item) => location.pathname === item.href,
            );

            return (
              <Stack key={group.id} gap={4}>
                <Group
                  justify="space-between"
                  wrap="nowrap"
                  px="xs"
                  style={{
                    cursor: "pointer",
                    borderRadius: 8,
                    padding: "4px 8px",
                    transition: "background 0.15s ease",
                  }}
                  onClick={() => toggleGroup(group.id)}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background =
                      "rgba(255, 255, 255, 0.05)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                  }}
                >
                  <Group gap="xs" wrap="nowrap">
                    <group.icon
                      size={12}
                      color={
                        hasActiveItem
                          ? "var(--mantine-color-cyan-4)"
                          : "var(--mantine-color-dimmed)"
                      }
                    />
                    <Text
                      size="xs"
                      tt="uppercase"
                      fw={700}
                      c={hasActiveItem ? "cyan.4" : "dimmed"}
                      style={{ letterSpacing: "0.16em" }}
                    >
                      {group.label}
                    </Text>
                  </Group>
                  <ActionIcon size="sm" variant="transparent" color="dimmed">
                    {isExpanded ? (
                      <ChevronDown size={14} />
                    ) : (
                      <ChevronRight size={14} />
                    )}
                  </ActionIcon>
                </Group>

                {/* Submenu with Tailwind CSS animation */}
                <div
                  className={`overflow-hidden transition-all duration-300 ease-in-out ${
                    isExpanded ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
                  }`}
                >
                  <Stack gap={2}>
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
                </div>
              </Stack>
            );
          })}
        </Stack>
      </AppShell.Section>
    </AppShell.Navbar>
  );
}

Sidebar.displayName = "Sidebar";
