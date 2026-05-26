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
import { useAuth } from "../../../../context/AuthContext";

export interface SidebarProps {
  onMobileClose?: () => void;
}

export function Sidebar({ onMobileClose }: SidebarProps) {
  const location = useLocation();
  const { hasPermission } = useAuth();
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
      p={10}
      withBorder
      style={{
        width: 228,
        background:
          "linear-gradient(180deg, rgba(9,17,30,0.98) 0%, rgba(7,13,24,0.99) 100%)",
        borderColor: "rgba(148, 163, 184, 0.12)",
      }}
    >
      <AppShell.Section>
        <Group justify="flex-end" wrap="nowrap" mb={6}>
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
        <Stack gap={8} pb="lg">
          {navigationGroups
            .map((group) => ({
              ...group,
              items: group.items.filter((item) =>
                hasPermission(item.id, "view"),
              ),
            }))
            .filter((group) => group.items.length > 0)
            .map((group) => {
            const isExpanded = expandedGroups.has(group.id);
            const hasActiveItem = group.items.some(
              (item) => location.pathname === item.href,
            );

            return (
              <Stack key={group.id} gap={4}>
                <Group
                  justify="space-between"
                  wrap="nowrap"
                  px={8}
                  style={{
                    cursor: "pointer",
                    borderRadius: 8,
                    minHeight: 30,
                    padding: "3px 8px",
                    transition: "background 0.15s ease, border-color 0.15s ease",
                    border: hasActiveItem
                      ? "1px solid rgba(34, 211, 238, 0.14)"
                      : "1px solid transparent",
                    background: hasActiveItem
                      ? "rgba(15, 23, 42, 0.55)"
                      : "transparent",
                  }}
                  onClick={() => toggleGroup(group.id)}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background =
                      hasActiveItem
                        ? "rgba(15, 23, 42, 0.75)"
                        : "rgba(255, 255, 255, 0.05)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = hasActiveItem
                      ? "rgba(15, 23, 42, 0.55)"
                      : "transparent";
                  }}
                >
                  <Group gap={7} wrap="nowrap">
                    <group.icon
                      size={11}
                      color="var(--mantine-color-white)"
                    />
                    <Text
                      size="10px"
                      tt="uppercase"
                      fw={700}
                      c="white"
                      style={{ letterSpacing: "0.14em", lineHeight: 1.1 }}
                    >
                      {group.label}
                    </Text>
                  </Group>
                  <ActionIcon size={24} variant="transparent" color="white">
                    {isExpanded ? (
                      <ChevronDown size={13} />
                    ) : (
                      <ChevronRight size={13} />
                    )}
                  </ActionIcon>
                </Group>

                {/* Submenu with Tailwind CSS animation */}
                <div
                  className={`overflow-hidden transition-all duration-300 ease-in-out ${
                    isExpanded ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
                  }`}
                >
                  <Stack gap={4} pt={4}>
                    {group.items.map((item) => (
                      <NavLink
                        key={item.id}
                        component={RouterNavLink}
                        to={item.href}
                        onClick={onMobileClose}
                        active={location.pathname === item.href}
                        variant="light"
                        color="cyan"
                        leftSection={<item.icon size={15} strokeWidth={1.8} />}
                        label={item.label}
                        radius="md"
                        styles={{
                          root: {
                            minHeight: 34,
                            paddingInline: 10,
                            borderRadius: 10,
                            color: "var(--mantine-color-white)",
                            background:
                              location.pathname === item.href
                                ? "linear-gradient(90deg, rgba(23,185,236,0.35) 0%, rgba(10,139,191,0.25) 100%)"
                                : "transparent",
                            border:
                              location.pathname === item.href
                                ? "1px solid rgba(30, 192, 243, 0.4)"
                                : "1px solid transparent",
                            transform: location.pathname === item.href ? "translateX(4px)" : "none",
                            transition: "all 0.2s ease",
                            "&:hover": {
                              background: location.pathname === item.href 
                                ? "linear-gradient(90deg, rgba(23,185,236,0.45) 0%, rgba(10,139,191,0.35) 100%)"
                                : "rgba(255, 255, 255, 0.05)",
                              color: "var(--mantine-color-white)"
                            }
                          },
                          label: {
                            fontWeight: location.pathname === item.href ? 700 : 600,
                            fontSize: "13px",
                            lineHeight: 1.2,
                          },
                          description: {
                            color: "var(--mantine-color-gray-5)",
                          },
                          section: {
                            marginInlineEnd: 8,
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
