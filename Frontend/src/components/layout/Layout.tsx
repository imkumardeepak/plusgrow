import React, { useMemo, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  AppShell,
  Burger,
  ScrollArea,
  Group,
  Text,
  ActionIcon,
  Menu,
  Avatar,
  Indicator,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { useWms } from "../../context/WmsContext";
import { useAuth } from "../../context/AuthContext";
import {
  LayoutDashboard,
  ArrowDownToLine,
  ArrowUpFromLine,
  Building,
  Factory,
  RefreshCw,
  Box,
  Truck,
  ClipboardCheck,
  Move,
  Bell,
  Search,
  ChevronLeft,
  ChevronRight,
  Layers,
  Map,
  MapPin,
  Package,
  ScanLine,
  User,
  LogOut,
  Settings,
  HelpCircle,
  Warehouse,
} from "lucide-react";
import { cn } from "../../lib/utils";
import { Button } from "../ui/button";

interface NavItem {
  to: string;
  icon: React.ElementType;
  label: string;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    label: "Overview",
    items: [{ to: "/", icon: LayoutDashboard, label: "Dashboard" }],
  },
  {
    label: "Master Data",
    items: [
      { to: "/importers", icon: Building, label: "Importers" },
      { to: "/manufacturers", icon: Factory, label: "Manufacturers" },
      { to: "/commodities", icon: Layers, label: "Commodities" },
      { to: "/bins", icon: Box, label: "Bin Master" },
      { to: "/locations", icon: MapPin, label: "Location Master" },
      { to: "/mpd", icon: Package, label: "Products" },
    ],
  },
  {
    label: "Inward Operations",
    items: [
      { to: "/inward", icon: ArrowDownToLine, label: "Purchase Invoices" },
      { to: "/putaway", icon: Warehouse, label: "Put Away" },
    ],
  },
  {
    label: "Outward Operations",
    items: [
      { to: "/outward", icon: ArrowUpFromLine, label: "Sales Orders" },
      { to: "/picking", icon: ScanLine, label: "Picking" },
      { to: "/packing", icon: Package, label: "Packing" },
      { to: "/dispatch", icon: Truck, label: "Dispatch" },
    ],
  },
  {
    label: "Inventory",
    items: [
      { to: "/stock-check", icon: ClipboardCheck, label: "Stock Check" },
      { to: "/stock-movement", icon: Move, label: "Stock Movement" },
      { to: "/warehouse-map", icon: Map, label: "Warehouse Map" },
    ],
  },
  {
    label: "Account",
    items: [{ to: "/profile", icon: User, label: "My Profile" }],
  },
];

const SidebarItem = ({
  to,
  icon: Icon,
  label,
  collapsed,
}: {
  to: string;
  icon: React.ElementType;
  label: string;
  collapsed?: boolean;
}) => (
  <NavLink
    to={to}
    className={({ isActive }) =>
      cn(
        "flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-xl transition-colors duration-200 group mb-1 cursor-pointer",
        isActive
          ? "bg-gradient-to-r from-brand-400 to-brand-600 text-slate-950 shadow-brand border border-transparent"
          : "text-sidebar-text hover:bg-white/8 hover:text-sidebar-text-hover border border-transparent",
      )
    }
  >
    {({ isActive }) => (
      <>
        <Icon
          className={cn(
            "w-4 h-4 transition-colors duration-200 shrink-0",
            isActive
              ? "text-slate-950"
              : "group-hover:text-brand-300 text-neutral-500",
          )}
        />
        {!collapsed && (
          <span
            className={cn(
              "truncate",
              isActive ? "font-bold text-slate-950" : "font-medium",
            )}
          >
            {label}
          </span>
        )}
      </>
    )}
  </NavLink>
);

const Logo = ({ collapsed }: { collapsed?: boolean }) => (
  <div className="flex items-center gap-3 w-full justify-center">
    <svg
      viewBox="0 0 66 68"
      className="w-7 h-7 shrink-0"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M33 0 L43 12 H23 Z" fill="#1ec0f3" />
      <rect x="28" y="16" width="10" height="10" fill="#11a7df" />
      <rect x="28" y="30" width="10" height="10" fill="#0a8bbf" />
      <rect x="28" y="44" width="10" height="10" fill="#0a6994" />
      <rect x="28" y="58" width="10" height="10" fill="#0c4e70" />
      <rect x="0" y="30" width="10" height="10" fill="#0c4e70" />
      <rect x="14" y="30" width="10" height="10" fill="#0a6994" />
      <rect x="42" y="30" width="10" height="10" fill="#0a6994" />
      <rect x="56" y="30" width="10" height="10" fill="#0c4e70" />
    </svg>
    {!collapsed && (
      <div className="flex flex-col">
        <div className="flex items-baseline leading-none">
          <span className="text-xl font-heading font-bold tracking-wide text-white">
            PLUS
          </span>
          <span className="text-xl font-light tracking-wide text-brand-300">
            GROW
          </span>
        </div>
        <span className="text-[0.45rem] font-medium tracking-[0.14em] text-neutral-500 mt-0.5">
          WE ADD VALUE TO YOUR GROWTH
        </span>
      </div>
    )}
  </div>
);

export const Layout = () => {
  const { refreshData, isLoading } = useWms();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpened, { toggle: toggleMobile, close: closeMobile }] =
    useDisclosure(false);
  const [desktopOpened, { toggle: toggleDesktop }] = useDisclosure(true);
  const [searchQuery, setSearchQuery] = useState("");

  const sidebarCollapsed = !desktopOpened;
  const authUser = user as {
    fullName?: string;
    full_name?: string;
    roleName?: string;
    role?: { name?: string | null } | null;
  } | null;

  const resolvedUserName = authUser?.fullName ?? authUser?.full_name ?? "User";
  const resolvedUserRole = authUser?.roleName ?? authUser?.role?.name ?? "User";
  const userInitials = useMemo(
    () =>
      resolvedUserName
        .split(" ")
        .map((part) => part[0])
        .join("")
        .toUpperCase()
        .slice(0, 2),
    [resolvedUserName],
  );
  const activeSection = useMemo(() => {
    const activeGroup = navGroups.find((group) =>
      group.items.some((item) => item.to === location.pathname),
    );

    return activeGroup?.label ?? "Operations";
  }, [location.pathname]);

  const handleNavigate = (to: string) => {
    navigate(to);
    closeMobile();
  };

  const handleLogout = () => {
    logout();
    closeMobile();
  };

  return (
    <AppShell
      padding={{ base: "xs", md: "sm" }}
      header={{ height: { base: 60, md: 64 } }}
      navbar={{
        width: { base: "100%", md: sidebarCollapsed ? 80 : 280 },
        breakpoint: "md",
        collapsed: { mobile: !mobileOpened, desktop: false },
      }}
      withBorder={false}
      transitionDuration={200}
      transitionTimingFunction="ease"
      style={{
        background:
          "linear-gradient(180deg, #0b1322 0%, #09111f 50%, #060d19 100%)",
      }}
    >
      <AppShell.Header
        withBorder={false}
        bg="transparent"
        style={{
          background: "rgba(11,19,34,0.88)",
          backdropFilter: "blur(20px)",
          borderBottom: "1px solid rgba(255,255,255,0.07)",
        }}
      >
        <div className="h-full px-4 md:px-5 flex items-center justify-between gap-3">
          <Group gap="sm" wrap="nowrap" flex={1}>
            <Burger
              opened={mobileOpened}
              onClick={toggleMobile}
              hiddenFrom="md"
              size="sm"
              color="white"
              aria-label="Toggle sidebar"
            />
            <ActionIcon
              visibleFrom="md"
              variant="subtle"
              color="gray"
              radius="xl"
              onClick={toggleDesktop}
              aria-label={
                sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"
              }
            >
              {sidebarCollapsed ? (
                <ChevronRight size={16} className="text-neutral-400" />
              ) : (
                <ChevronLeft size={16} className="text-neutral-400" />
              )}
            </ActionIcon>

            <div className="hidden lg:flex flex-col pr-2">
              <span className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-brand-300">
                {activeSection}
              </span>
              <span className="text-sm font-medium text-white">
                Warehouse operations workspace
              </span>
            </div>

            <div
              className="flex items-center rounded-full px-3 py-1.5 w-full max-w-xs md:max-w-sm lg:max-w-md transition-colors transition-shadow duration-200 focus-within:ring-1 focus-within:ring-brand-400/40"
              style={{
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.09)",
              }}
            >
              <Search className="w-3.5 h-3.5 text-neutral-500 mr-2 shrink-0" />
              <input
                type="text"
                placeholder="Search inventory, SKU, order…"
                className="bg-transparent border-none outline-none w-full text-xs placeholder:text-neutral-500 font-medium text-white"
                aria-label="Search inventory"
                name="search"
                autoComplete="off"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
              />
            </div>
          </Group>

          <Group gap="xs" wrap="nowrap">
            <Button
              variant="outline"
              size="sm"
              onClick={refreshData}
              disabled={isLoading}
              className="gap-1.5 rounded-full h-8 text-xs px-3 font-medium hidden sm:inline-flex"
              style={{
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.09)",
                color: "rgba(202,216,229,0.9)",
              }}
            >
              <RefreshCw
                className={cn(
                  "w-3.5 h-3.5",
                  isLoading
                    ? "animate-spin text-brand-300"
                    : "text-neutral-500",
                )}
              />
              <span>Sync</span>
            </Button>

            <Group
              gap="xs"
              wrap="nowrap"
              className="pl-2 sm:pl-4"
              style={{ borderLeft: "1px solid rgba(255,255,255,0.08)" }}
            >
              <Indicator inline disabled color="red" size={8} offset={6}>
                <ActionIcon
                  variant="subtle"
                  radius="xl"
                  color="gray"
                  aria-label="Notifications"
                >
                  <Bell className="w-4 h-4" />
                </ActionIcon>
              </Indicator>

              <Menu shadow="lg" width={240} radius="xl" position="bottom-end">
                <Menu.Target>
                  <button
                    className="flex items-center gap-2 cursor-pointer group bg-transparent border-0 p-0"
                    aria-label={`User profile: ${resolvedUserName}`}
                    type="button"
                  >
                    <Avatar
                      radius="xl"
                      color="cyan"
                      className="transition-transform duration-200 group-hover:scale-105"
                    >
                      {userInitials}
                    </Avatar>
                    <div className="hidden md:block text-left">
                      <p className="text-xs font-bold text-white leading-none">
                        {resolvedUserName}
                      </p>
                      <p className="text-[0.65rem] text-neutral-500 mt-0.5 font-medium">
                        {resolvedUserRole}
                      </p>
                    </div>
                  </button>
                </Menu.Target>

                <Menu.Dropdown>
                  <Menu.Label>{resolvedUserName}</Menu.Label>
                  <Menu.Item
                    leftSection={<User size={15} />}
                    onClick={() => handleNavigate("/profile")}
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
                    onClick={handleLogout}
                  >
                    Sign out
                  </Menu.Item>
                </Menu.Dropdown>
              </Menu>
            </Group>
          </Group>
        </div>
      </AppShell.Header>

      <AppShell.Navbar
        withBorder={false}
        p="sm"
        style={{
          background: "linear-gradient(180deg, #111b2d 0%, #0b1322 100%)",
          borderRight: "1px solid rgba(255,255,255,0.07)",
        }}
      >
        <AppShell.Section>
          <div
            className="py-4 flex flex-col items-center justify-center shrink-0"
            style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
          >
            <Logo collapsed={sidebarCollapsed} />
          </div>
        </AppShell.Section>

        <AppShell.Section
          grow
          component={ScrollArea}
          mt="sm"
          px={sidebarCollapsed ? 0 : "xs"}
        >
          <div className="space-y-3">
            {navGroups.map((group) => (
              <div key={group.label}>
                {!sidebarCollapsed && (
                  <Text
                    size="xs"
                    tt="uppercase"
                    fw={700}
                    c="dimmed"
                    px="xs"
                    mb={6}
                    style={{ letterSpacing: "0.18em" }}
                  >
                    {group.label}
                  </Text>
                )}
                {group.items.map((item) => (
                  <div key={item.to} onClick={closeMobile}>
                    <SidebarItem
                      to={item.to}
                      icon={item.icon}
                      label={item.label}
                      collapsed={sidebarCollapsed}
                    />
                  </div>
                ))}
              </div>
            ))}
          </div>
        </AppShell.Section>

        <AppShell.Section>
          <div
            className="pointer-events-none absolute bottom-0 left-0 right-0 h-20"
            style={{
              background:
                "linear-gradient(to top, rgba(17,167,223,0.06), transparent)",
            }}
          />
        </AppShell.Section>
      </AppShell.Navbar>

      <AppShell.Main
        style={{
          background: "transparent",
        }}
      >
        <div className="w-full h-full flex flex-col min-h-0">
          <Outlet />
        </div>
      </AppShell.Main>
    </AppShell>
  );
};

export default Layout;
