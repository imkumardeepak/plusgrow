import React, { memo, useEffect, useMemo, useState } from "react";
import {
  ActionIcon,
  Badge,
  Box,
  Checkbox,
  Group,
  Modal,
  Paper,
  ScrollArea,
  Select,
  SimpleGrid,
  Stack,
  Table,
  Text,
  TextInput,
  Tooltip,
} from "@mantine/core";
import { Edit2, KeyRound, Plus, RefreshCw, Save, Search, ShieldCheck, Trash2 } from "lucide-react";

import { Button } from "../components/atoms/Button";
import {
  DataTableColumn,
  MantineDataTable,
} from "../components/molecules/MantineDataTable";
import {
  OperationsPage,
  OperationsPanel,
} from "../components/organisms/Operations/OperationsShell";
import { SYSTEM_PAGES, emptyPagePermission } from "../config/rbac";
import { toast } from "../lib/toast";
import {
  CreateRoleDto,
  RolePageAccessRecord,
  RoleRecord,
  rolesApi,
} from "../services/masterApi";

type RoleStatusFilter = "all" | "active" | "inactive";

const emptyRole: CreateRoleDto = {
  name: "",
  description: "",
  isActive: true,
};

export const RoleMaster = memo(function RoleMaster() {
  const [roles, setRoles] = useState<RoleRecord[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null);
  const [permissions, setPermissions] = useState<RolePageAccessRecord[]>([]);
  const [formData, setFormData] = useState<CreateRoleDto>(emptyRole);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [editingRole, setEditingRole] = useState<RoleRecord | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<RoleRecord | null>(null);
  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [permissionModalOpen, setPermissionModalOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<RoleStatusFilter>("all");

  const loadRoles = async () => {
    try {
      setIsLoading(true);
      const data = await rolesApi.getAll();
      setRoles(data);
      if (!selectedRoleId && data.length > 0) {
        setSelectedRoleId(data[0].id);
      }
    } catch {
      toast.error("Failed to load roles");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadRoles();
  }, []);

  useEffect(() => {
    const loadPermissions = async () => {
      if (!selectedRoleId) {
        setPermissions([]);
        return;
      }

      const data = await rolesApi.getPageAccess(selectedRoleId);
      setPermissions(data);
    };

    void loadPermissions().catch(() => toast.error("Failed to load role permissions"));
  }, [selectedRoleId]);

  const selectedRole = useMemo(
    () => roles.find((role) => role.id === selectedRoleId) ?? null,
    [roles, selectedRoleId],
  );

  const roleOptions = useMemo(
    () => roles.map((role) => ({ value: String(role.id), label: role.name })),
    [roles],
  );

  const filteredRoles = useMemo(() => {
    const normalized = search.trim().toLowerCase();
    return roles.filter((role) => {
      const matchesSearch =
        !normalized ||
        role.name.toLowerCase().includes(normalized) ||
        (role.description || "").toLowerCase().includes(normalized);
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && role.isActive) ||
        (statusFilter === "inactive" && !role.isActive);

      return matchesSearch && matchesStatus;
    });
  }, [roles, search, statusFilter]);

  const stats = useMemo(
    () => ({
      active: roles.filter((role) => role.isActive).length,
      inactive: roles.filter((role) => !role.isActive).length,
      assignedUsers: roles.reduce((sum, role) => sum + role.userCount, 0),
    }),
    [roles],
  );

  const mergedPermissions = useMemo(
    () =>
      SYSTEM_PAGES.map((page) => {
        const existing = permissions.find((item) => item.pageKey === page.key);
        return existing || {
          id: 0,
          roleId: selectedRoleId || 0,
          ...emptyPagePermission(page.key),
        };
      }),
    [permissions, selectedRoleId],
  );

  const setPermission = (
    pageKey: string,
    field: "canView" | "canCreate" | "canEdit" | "canDelete",
    value: boolean,
  ) => {
    setPermissions((current) => {
      const existing = current.find((item) => item.pageKey === pageKey);
      const next = existing
        ? { ...existing, [field]: value }
        : {
            id: 0,
            roleId: selectedRoleId || 0,
            ...emptyPagePermission(pageKey),
            [field]: value,
          };

      if (field !== "canView" && value) {
        next.canView = true;
      }

      if (field === "canView" && !value) {
        next.canCreate = false;
        next.canEdit = false;
        next.canDelete = false;
      }

      return existing
        ? current.map((item) => (item.pageKey === pageKey ? next : item))
        : [...current, next];
    });
  };

  const setAllPermissions = (value: boolean) => {
    setPermissions(
      SYSTEM_PAGES.map((page) => ({
        id: 0,
        roleId: selectedRoleId || 0,
        pageKey: page.key,
        canView: value,
        canCreate: value,
        canEdit: value,
        canDelete: value,
      })),
    );
  };

  const setPermissionColumn = (
    field: "canView" | "canCreate" | "canEdit" | "canDelete",
    value: boolean,
  ) => {
    setPermissions(
      SYSTEM_PAGES.map((page) => {
        const current =
          permissions.find((item) => item.pageKey === page.key) || {
            id: 0,
            roleId: selectedRoleId || 0,
            ...emptyPagePermission(page.key),
          };
        const next = { ...current, [field]: value };

        if (field !== "canView" && value) {
          next.canView = true;
        }

        if (field === "canView" && !value) {
          next.canCreate = false;
          next.canEdit = false;
          next.canDelete = false;
        }

        return next;
      }),
    );
  };

  const resetRoleModal = () => {
    setEditingRole(null);
    setFormData(emptyRole);
    setRoleModalOpen(false);
  };

  const openCreateRole = () => {
    setEditingRole(null);
    setFormData(emptyRole);
    setRoleModalOpen(true);
  };

  const startEdit = (role: RoleRecord) => {
    setEditingRole(role);
    setFormData({
      name: role.name,
      description: role.description || "",
      isActive: role.isActive,
    });
    setRoleModalOpen(true);
  };

  const openPermissions = (role: RoleRecord) => {
    setSelectedRoleId(role.id);
    setPermissionModalOpen(true);
  };

  const saveRole = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!formData.name.trim()) {
      toast.error("Role name is required");
      return;
    }

    try {
      setIsSaving(true);
      if (editingRole) {
        await rolesApi.update(editingRole.id, formData);
        toast.success("Role updated");
      } else {
        await rolesApi.create(formData);
        toast.success("Role created");
      }

      resetRoleModal();
      await loadRoles();
    } catch (error: any) {
      toast.error(error.message || "Failed to save role");
    } finally {
      setIsSaving(false);
    }
  };

  const savePermissions = async () => {
    if (!selectedRoleId) return;

    try {
      setIsSaving(true);
      const payload = mergedPermissions.map((item) => ({
        pageKey: item.pageKey,
        canView: item.canView,
        canCreate: item.canCreate,
        canEdit: item.canEdit,
        canDelete: item.canDelete,
      }));

      const saved = await rolesApi.updatePageAccess(selectedRoleId, payload);
      setPermissions(saved);
      toast.success("Permissions updated");
    } catch (error: any) {
      toast.error(error.message || "Failed to update permissions");
    } finally {
      setIsSaving(false);
    }
  };

  const deleteRole = async () => {
    if (!deleteTarget) return;

    try {
      await rolesApi.delete(deleteTarget.id);
      toast.success("Role deleted");
      setDeleteTarget(null);
      setSelectedRoleId(null);
      await loadRoles();
    } catch (error: any) {
      toast.error(error.message || "Failed to delete role");
    }
  };

  const columns: DataTableColumn<RoleRecord>[] = [
    {
      key: "name",
      header: "Role",
      sortable: true,
      sortAccessor: (row) => row.name,
      render: (row) => (
        <div className="min-w-0">
          <Text size="xs" fw={900} c="cyan.2" lineClamp={1}>
            {row.name}
          </Text>
          <Text size="10px" c="dimmed" lineClamp={1}>
            {row.description || "No description"}
          </Text>
        </div>
      ),
      width: 260,
    },
    {
      key: "users",
      header: "Users",
      align: "right",
      sortable: true,
      sortAccessor: (row) => row.userCount,
      render: (row) => (
        <Text size="xs" fw={800} ff="monospace">
          {row.userCount}
        </Text>
      ),
      width: 90,
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      sortAccessor: (row) => (row.isActive ? "active" : "inactive"),
      render: (row) => (
        <Badge
          size="sm"
          radius="md"
          color={row.isActive ? "green" : "red"}
          variant="light"
        >
          {row.isActive ? "Active" : "Inactive"}
        </Badge>
      ),
      width: 120,
    },
    {
      key: "actions",
      header: "Action",
      align: "right",
      render: (row) => (
        <Group gap="xs" justify="flex-end" wrap="nowrap">
          <Tooltip label="Edit role">
            <ActionIcon
              size="sm"
              radius="md"
              variant="light"
              color="blue"
              onClick={() => startEdit(row)}
              aria-label="Edit role"
            >
              <Edit2 size={14} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label="Page permissions">
            <ActionIcon
              size="sm"
              radius="md"
              variant="light"
              color="cyan"
              onClick={() => openPermissions(row)}
              aria-label="Page permissions"
            >
              <KeyRound size={14} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label={row.userCount > 0 ? "Role has assigned users" : "Delete role"}>
            <ActionIcon
              size="sm"
              radius="md"
              variant="light"
              color="red"
              disabled={row.userCount > 0}
              onClick={() => setDeleteTarget(row)}
              aria-label="Delete role"
            >
              <Trash2 size={14} />
            </ActionIcon>
          </Tooltip>
        </Group>
      ),
      width: 110,
    },
  ];

  return (
    <OperationsPage
      title="Role Master"
      description="Create roles and assign page, create, edit, and delete permissions."
      icon={ShieldCheck}
      hideHeader
    >
      <Stack gap="sm">
        <OperationsPanel
          title="Filters"
          icon={ShieldCheck}
          description="Role search and status filters for permission setup."
        >
          <SimpleGrid cols={{ base: 1, lg: 4 }} spacing="sm">
            <Box>
              <Text size="10px" fw={800} c="dimmed" mb={5}>
                STATUS
              </Text>
              <Select
                size="xs"
                radius="md"
                value={statusFilter}
                onChange={(value) =>
                  setStatusFilter((value || "all") as RoleStatusFilter)
                }
                data={[
                  { value: "all", label: "All" },
                  { value: "active", label: "Active" },
                  { value: "inactive", label: "Inactive" },
                ]}
              />
            </Box>
            <TextInput
              size="xs"
              radius="md"
              label="Search"
              value={search}
              onChange={(event) => setSearch(event.currentTarget.value)}
              placeholder="Role or description..."
              leftSection={<Search size={14} />}
            />
            <Select
              size="xs"
              radius="md"
              label="Permission Role"
              data={roleOptions}
              value={selectedRoleId ? String(selectedRoleId) : null}
              onChange={(value) => setSelectedRoleId(value ? Number(value) : null)}
              placeholder="Select role"
            />
            <Box>
              <Text size="10px" fw={800} c="dimmed" mb={5}>
                QUICK ACTION
              </Text>
              <Group gap="xs" wrap="nowrap">
                <Button
                  size="xs"
                  variant="light"
                  onClick={() => {
                    setStatusFilter("all");
                    setSearch("");
                  }}
                >
                  Clear
                </Button>
                <Button
                  size="xs"
                  variant="subtle"
                  onClick={() => void loadRoles()}
                >
                  Reload
                </Button>
              </Group>
            </Box>
          </SimpleGrid>
        </OperationsPanel>

        <OperationsPanel
          title="Role Ledger"
          icon={ShieldCheck}
          description="Compact role list for setup, assignment status, and permission actions."
          action={
            <Group gap="xs" wrap="nowrap">
              <Badge size="sm" radius="md" variant="light" color="gray">
                {filteredRoles.length} Rows
              </Badge>
              <Badge size="sm" radius="md" variant="light" color="green">
                {stats.active} Active
              </Badge>
              <Badge size="sm" radius="md" variant="light" color="red">
                {stats.inactive} Inactive
              </Badge>
              <Badge size="sm" radius="md" variant="light" color="cyan">
                {stats.assignedUsers} Users
              </Badge>
              <ActionIcon
                size="sm"
                radius="md"
                variant="light"
                color="gray"
                onClick={() => void loadRoles()}
                loading={isLoading}
                aria-label="Refresh roles"
              >
                <RefreshCw size={14} />
              </ActionIcon>
              <Button
                size="sm"
                onClick={openCreateRole}
                leftIcon={<Plus className="h-3.5 w-3.5" />}
              >
                New Role
              </Button>
            </Group>
          }
          contentClassName="p-0"
        >
          <MantineDataTable
            data={filteredRoles}
            columns={columns}
            rowKey={(row) => row.id}
            isLoading={isLoading}
            pageSize={25}
            emptyIcon={ShieldCheck}
            emptyTitle="No roles"
            emptyDescription="No roles match current search or filter."
            itemLabel="roles"
            resetPageKey={`${search}-${statusFilter}`}
            minWidth={720}
          />
        </OperationsPanel>
      </Stack>

      <Modal
        opened={roleModalOpen}
        onClose={resetRoleModal}
        title={editingRole ? "Edit Role" : "New Role"}
        size="lg"
        centered
      >
        <form onSubmit={saveRole}>
          <Stack gap="md">
            <Paper radius="lg" p="md" withBorder bg="transparent">
              <Stack gap="md">
                <Text size="11px" fw={800} c="dimmed" tt="uppercase">
                  Role Details
                </Text>
                <TextInput
                  label="Role Name"
                  value={formData.name}
                  onChange={(event) => {
                    const name = event.currentTarget.value;
                    setFormData((current) => ({ ...current, name }));
                  }}
                />
                <TextInput
                  label="Description"
                  value={formData.description || ""}
                  onChange={(event) => {
                    const description = event.currentTarget.value;
                    setFormData((current) => ({ ...current, description }));
                  }}
                />
                {editingRole ? (
                  <Select
                    label="Status"
                    data={[
                      { value: "true", label: "Active" },
                      { value: "false", label: "Inactive" },
                    ]}
                    value={String(formData.isActive ?? true)}
                    onChange={(value) =>
                      setFormData((current) => ({
                        ...current,
                        isActive: value !== "false",
                      }))
                    }
                  />
                ) : null}
              </Stack>
            </Paper>
            <Group justify="flex-end" gap="xs">
              <Button type="button" size="sm" variant="subtle" onClick={resetRoleModal}>
                Cancel
              </Button>
              <Button type="submit" size="sm" loading={isSaving}>
                {editingRole ? "Update Role" : "Create Role"}
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>

      <Modal
        opened={permissionModalOpen}
        onClose={() => setPermissionModalOpen(false)}
        title={`Page Permissions${selectedRole ? ` - ${selectedRole.name}` : ""}`}
        size="xl"
        centered
      >
        <Stack gap="md">
          <Paper radius="lg" p="sm" withBorder bg="transparent">
            <Group justify="space-between" align="flex-start" wrap="nowrap">
              <div>
                <Text size="11px" fw={800} c="dimmed" tt="uppercase">
                  Permission Matrix
                </Text>
                <Text size="xs" c="dimmed">
                  Grant page and operation-level access for the selected role.
                </Text>
              </div>
              <Badge size="sm" radius="md" variant="light" color="cyan">
                {SYSTEM_PAGES.length} Pages
              </Badge>
            </Group>
            <Group gap="xs" mt="sm" wrap="wrap">
              <Button size="xs" variant="light" onClick={() => setAllPermissions(true)}>
                Select All
              </Button>
              <Button size="xs" variant="subtle" onClick={() => setAllPermissions(false)}>
                Clear All
              </Button>
              <Button size="xs" variant="outline" onClick={() => setPermissionColumn("canView", true)}>
                All View
              </Button>
              <Button size="xs" variant="outline" onClick={() => setPermissionColumn("canCreate", true)}>
                All Create
              </Button>
              <Button size="xs" variant="outline" onClick={() => setPermissionColumn("canEdit", true)}>
                All Edit
              </Button>
              <Button size="xs" variant="outline" onClick={() => setPermissionColumn("canDelete", true)}>
                All Delete
              </Button>
            </Group>
          </Paper>
          <ScrollArea type="auto">
            <Table striped highlightOnHover withTableBorder withColumnBorders miw={760}>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Page</Table.Th>
                  <Table.Th>Group</Table.Th>
                  <Table.Th>View</Table.Th>
                  <Table.Th>Create</Table.Th>
                  <Table.Th>Edit</Table.Th>
                  <Table.Th>Delete</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {mergedPermissions.map((permission) => {
                  const page = SYSTEM_PAGES.find((item) => item.key === permission.pageKey);
                  return (
                    <Table.Tr key={permission.pageKey}>
                      <Table.Td>
                        <Text size="xs" fw={800}>
                          {page?.label || permission.pageKey}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        <Text size="xs" c="dimmed">
                          {page?.group || "-"}
                        </Text>
                      </Table.Td>
                      {(["canView", "canCreate", "canEdit", "canDelete"] as const).map((field) => (
                        <Table.Td key={field}>
                          <Checkbox
                            checked={permission[field]}
                            disabled={!selectedRoleId}
                            onChange={(event) =>
                              setPermission(permission.pageKey, field, event.currentTarget.checked)
                            }
                          />
                        </Table.Td>
                      ))}
                    </Table.Tr>
                  );
                })}
              </Table.Tbody>
            </Table>
          </ScrollArea>
          <Group justify="flex-end" gap="xs">
            <Button
              type="button"
              size="sm"
              variant="subtle"
              onClick={() => setPermissionModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              leftIcon={<Save size={14} />}
              onClick={savePermissions}
              loading={isSaving}
              disabled={!selectedRoleId}
            >
              Save Permissions
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Modal
        opened={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="Delete role"
        centered
      >
        <Text size="sm">Delete {deleteTarget?.name}? This cannot be undone.</Text>
        <Group justify="flex-end" mt="md">
          <Button size="sm" variant="subtle" onClick={() => setDeleteTarget(null)}>
            Cancel
          </Button>
          <Button size="sm" variant="destructive" onClick={deleteRole}>
            Delete
          </Button>
        </Group>
      </Modal>
    </OperationsPage>
  );
});

export default RoleMaster;
