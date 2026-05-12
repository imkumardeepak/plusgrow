import React, { memo, useEffect, useMemo, useState } from "react";
import {
  ActionIcon,
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
import { Edit2, Save, ShieldCheck, Trash2 } from "lucide-react";

import { Button } from "../components/atoms/Button";
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
  const [editingRole, setEditingRole] = useState<RoleRecord | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<RoleRecord | null>(null);

  const loadRoles = async () => {
    const data = await rolesApi.getAll();
    setRoles(data);
    if (!selectedRoleId && data.length > 0) {
      setSelectedRoleId(data[0].id);
    }
  };

  useEffect(() => {
    void loadRoles().catch(() => toast.error("Failed to load roles"));
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

      setFormData(emptyRole);
      setEditingRole(null);
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

  return (
    <OperationsPage
      title="Role Master"
      description="Create roles and assign page, create, edit, and delete permissions."
      icon={ShieldCheck}
      hideHeader
      metrics={[
        { label: "Roles", value: roles.length, tone: "brand" },
        { label: "Selected", value: selectedRole?.name || "-", tone: "default" },
        { label: "Pages", value: SYSTEM_PAGES.length, tone: "success" },
      ]}
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
        <OperationsPanel title="Role Setup" icon={ShieldCheck} className="lg:col-span-4">
          <form onSubmit={saveRole} className="space-y-3">
            <TextInput
              label="Role Name"
              value={formData.name}
              onChange={(event) =>
                setFormData((current) => ({
                  ...current,
                  name: event.currentTarget.value,
                }))
              }
            />
            <TextInput
              label="Description"
              value={formData.description || ""}
              onChange={(event) =>
                setFormData((current) => ({
                  ...current,
                  description: event.currentTarget.value,
                }))
              }
            />
            <Group gap="xs">
              <Button type="submit" size="sm" loading={isSaving}>
                {editingRole ? "Update Role" : "Create Role"}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="subtle"
                onClick={() => {
                  setEditingRole(null);
                  setFormData(emptyRole);
                }}
              >
                Clear
              </Button>
            </Group>
          </form>

          <Stack gap="xs" mt="md">
            {roles.map((role) => (
              <Paper key={role.id} p="sm" radius="md" withBorder bg="transparent">
                <Group justify="space-between" wrap="nowrap">
                  <div className="min-w-0">
                    <Text fw={800} size="sm" truncate>{role.name}</Text>
                    <Text size="xs" c="dimmed" truncate>{role.description || "No description"}</Text>
                  </div>
                  <Group gap={4} wrap="nowrap">
                    <Tooltip label="Edit role">
                      <ActionIcon
                        variant="light"
                        color="blue"
                        onClick={() => {
                          setEditingRole(role);
                          setFormData({
                            name: role.name,
                            description: role.description || "",
                            isActive: role.isActive,
                          });
                        }}
                      >
                        <Edit2 size={14} />
                      </ActionIcon>
                    </Tooltip>
                    <Tooltip label="Delete role">
                      <ActionIcon
                        variant="light"
                        color="red"
                        disabled={role.userCount > 0}
                        onClick={() => setDeleteTarget(role)}
                      >
                        <Trash2 size={14} />
                      </ActionIcon>
                    </Tooltip>
                  </Group>
                </Group>
              </Paper>
            ))}
          </Stack>
        </OperationsPanel>

        <OperationsPanel
          title="Page Permissions"
          icon={ShieldCheck}
          className="lg:col-span-8"
          action={
            <Group gap="xs" wrap="nowrap">
              <Select
                size="xs"
                w={220}
                data={roleOptions}
                value={selectedRoleId ? String(selectedRoleId) : null}
                onChange={(value) => setSelectedRoleId(value ? Number(value) : null)}
                placeholder="Select role"
              />
              <Button size="sm" leftIcon={<Save size={14} />} onClick={savePermissions} loading={isSaving}>
                Save
              </Button>
            </Group>
          }
        >
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
                      <Table.Td>{page?.label || permission.pageKey}</Table.Td>
                      <Table.Td>{page?.group || "-"}</Table.Td>
                      {(["canView", "canCreate", "canEdit", "canDelete"] as const).map((field) => (
                        <Table.Td key={field}>
                          <Checkbox
                            checked={permission[field]}
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
        </OperationsPanel>
      </div>

      <Modal
        opened={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="Delete role"
        centered
      >
        <Text size="sm">Delete {deleteTarget?.name}? This cannot be undone.</Text>
        <Group justify="flex-end" mt="md">
          <Button size="sm" variant="subtle" onClick={() => setDeleteTarget(null)}>Cancel</Button>
          <Button size="sm" variant="destructive" onClick={deleteRole}>Delete</Button>
        </Group>
      </Modal>
    </OperationsPage>
  );
});

export default RoleMaster;
