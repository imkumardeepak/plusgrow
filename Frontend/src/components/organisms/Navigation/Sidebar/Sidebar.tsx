import React, { useMemo, useState } from "react";
import { NavLink as RouterNavLink, useLocation } from "react-router-dom";
import {
  ActionIcon,
  AppShell,
  Box,
  Collapse,
  Divider,
  Group,
  NavLink,
  ScrollArea,
  Stack,
  Text,
  Tooltip,
} from "@mantine/core";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Box as BoxIcon,
  Building,
  ChevronDown,
  ClipboardCheck,
  Factory,
  LayoutDashboard,
  Layers,
  LucideIcon,
  Map,
  MapPin,
  Move,
  Package,
  Tags,
  Truck,
  User,
  Warehouse,
  X,
} from "lucide-react";
import { Logo } from "../../../atoms/Logo";

export interface NavItem {
  id: string;
  label: string;
  icon: LucideIcon;
  href: string;
  badge?: number | string;
}

export interface NavGroup {
  id: string;
  label: string;
  items: NavItem[];
}

export const navigationGroups: NavGroup[] = [
  {
    id: "overview",
    label: "Overview",
    items: [{ id: "dashboard", label: "Dashboard", icon: LayoutDashboard, href: "/" }],
  },
  {
    id: "master",
    label: "Master Data",
    items: [
      { id: "importers", label: "Importers", icon: Building, href: "/importers" },
      { id: "manufacturers", label: "Manufacturers", icon: Factory, href: "/manufacturers" },
      { id: "commodities", label: "Commodities", icon: Layers, href: "/commodities" },
      { id: "bins", label: "Bin Master", icon: BoxIcon, href: "/bins" },
      { id: "locations", label: "Location Master", icon: MapPin, href: "/locations" },
      { id: "mpd", label: "Products", icon: BoxIcon, href: "/mpd" },
    ],
  },
  {
    id: "inward",
    label: "Inward Operations",
    items: [
      { id: "inward", label: "Purchase Invoices", icon: ArrowDownToLine, href: "/inward" },
      { id: "sticker", label: "Sticker Generation", icon: Tags, href: "/sticker" },
      { id: "putaway", label: "Put Away", icon: Warehouse, href: "/putaway" },
    ],
  },
  {
    id: "outward",
    label: "Outward Operations",
    items: [
      { id: "outward", label: "Sales Orders", icon: ArrowUpFromLine, href: "/outward" },
      { id: "packing", label: "Picking & Packing", icon: Package, href: "/packing" },
      { id: "dispatch", label: "Dispatch", icon: Truck, href: "/dispatch" },
    ],
  },
  {
    id: "inventory",
    label: "Inventory",
    items: [
      { id: "stock-check", label: "Stock Check", icon: ClipboardCheck, href: "/stock-check" },
      { id: "stock-movement", label: "Stock Movement", icon: Move, href: "/stock-movement" },
      { id: "warehouse-map", label: "Warehouse Map", icon: Map, href: "/warehouse-map" },
    ],
  },
  {
    id: "account",
    label: "Account",
    items: [{ id: "profile", label: "My Profile", icon: User, href: "/profile" }],
  },
];

export interface SidebarProps {
  collapsed?: boolean;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
  onCollapseChange?: (collapsed: boolean) => void;
}

export function Sidebar({
  collapsed = false,
  mobileOpen = false,
  onMobileClose,
  onCollapseChange,
}: SidebarProps) {
  const location = useLocation();

  const initialExpanded = useMemo(() => {
    const state: Record<string, boolean> = {};

    navigationGroups.forEach((group) => {
      state[group.id] = group.items.some((item) => item.href === location.pathname);
    });

    return state;
  }, [location.pathname]);

  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(initialExpanded);

  const toggleGroup = (groupId: string) => {
    setExpandedGroups((current) => ({
      ...current,
      [groupId]: !current[groupId],
    }));
  };

  const renderLink = (item: NavItem) => {
    const icon = <item.icon size={18} />;
    const isActive = location.pathname === item.href;

    if (collapsed) {
      return (
        <Tooltip key={item.id} label={item.label} position="right" withArrow>
          <NavLink
            component={RouterNavLink}
            to={item.href}
            onClick={onMobileClose}
            active={isActive}
            variant="filled"
            color="cyan"
            leftSection={icon}
            label=""
            px="sm"
            py="sm"
            styles={{
              root: {
                borderRadius: "18px",
                justifyContent: "center",
              },
              section: {
                marginInlineEnd: 0,
              },
            }}
          />
        </Tooltip>
      );
    }

    return (
      <NavLink
        key={item.id}
        component={RouterNavLink}
        to={item.href}
        onClick={onMobileClose}
        active={isActive}
        variant="filled"
        color="cyan"
        leftSection={icon}
        label={item.label}
        description={item.badge ? String(item.badge) : undefined}
        radius="xl"
        styles={{
          root: {
            borderRadius: "18px",
            background: isActive ? "linear-gradient(90deg, #17b9ec 0%, #0a8bbf 100%)" : undefined,
          },
          label: {
            fontWeight: 600,
          },
        }}
      />
    );
  };

  return (
    <AppShell.Navbar
      p="sm"
      withBorder={false}
      style={{
        background: "linear-gradient(180deg, rgba(17,27,45,0.98) 0%, rgba(9,17,31,0.98) 100%)",
      }}
    >
      <AppShell.Section>
        <Group justify={collapsed ? "center" : "space-between"} wrap="nowrap" px="xs" py="sm">
          <Box>
            <Logo width={collapsed ? 40 : 156} height={48} className={collapsed ? "w-10" : "w-36"} />
          </Box>
          {!collapsed ? (
            <ActionIcon hiddenFrom="md" variant="subtle" color="gray" onClick={onMobileClose} aria-label="Close menu">
              <X size={18} />
            </ActionIcon>
          ) : null}
        </Group>
      </AppShell.Section>

      <Divider my="sm" color="rgba(255,255,255,0.08)" />

      <AppShell.Section grow component={ScrollArea}>
        <Stack gap="md" px={collapsed ? 0 : "xs"}>
          {navigationGroups.map((group) => {
            const isGroupActive = group.items.some((item) => item.href === location.pathname);
            const isExpanded = expandedGroups[group.id] ?? isGroupActive;

            return (
              <Box key={group.id}>
                {!collapsed ? (
                  <Group justify="space-between" px="xs" mb={6}>
                    <Text size="xs" tt="uppercase" fw={700} c="dimmed" style={{ letterSpacing: "0.18em" }}>
                      {group.label}
                    </Text>
                    {group.items.length > 1 ? (
                      <ActionIcon
                        variant="subtle"
                        color="gray"
                        size="sm"
                        onClick={() => toggleGroup(group.id)}
                        aria-label={`Toggle ${group.label}`}
                      >
                        <ChevronDown size={15} style={{ transform: isExpanded ? "rotate(180deg)" : undefined }} />
                      </ActionIcon>
                    ) : null}
                  </Group>
                ) : null}

                {collapsed ? (
                  <Stack gap="xs">{group.items.map(renderLink)}</Stack>
                ) : group.items.length === 1 ? (
                  <Stack gap="xs">{group.items.map(renderLink)}</Stack>
                ) : (
                  <Collapse in={isExpanded}>
                    <Stack gap="xs">{group.items.map(renderLink)}</Stack>
                  </Collapse>
                )}
              </Box>
            );
          })}
        </Stack>
      </AppShell.Section>

      <Divider my="sm" color="rgba(255,255,255,0.08)" />

      <AppShell.Section>
        <Group justify="center">
          <ActionIcon
            variant="light"
            color="cyan"
            radius="xl"
            size="lg"
            onClick={() => onCollapseChange?.(!collapsed)}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <ChevronDown size={18} style={{ transform: collapsed ? "rotate(-90deg)" : "rotate(90deg)" }} />
          </ActionIcon>
        </Group>
      </AppShell.Section>
    </AppShell.Navbar>
  );
}

Sidebar.displayName = "Sidebar";
