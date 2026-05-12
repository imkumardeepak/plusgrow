import React, { memo, useEffect, useMemo, useState } from "react";
import {
  ActionIcon,
  Badge,
  Group,
  Modal,
  Paper,
  Select,
  SimpleGrid,
  Stack,
  Table,
  Text,
  TextInput,
  Tooltip,
} from "@mantine/core";
import { Edit2, Trash2, UserCog } from "lucide-react";

import { Button } from "../components/atoms/Button";
import {
  OperationsPage,
  OperationsPanel,
} from "../components/organisms/Operations/OperationsShell";
import { toast } from "../lib/toast";
import {
  CreateUserDto,
  RoleRecord,
  UserRecord,
  rolesApi,
  usersApi,
} from "../services/masterApi";

const emptyUser: CreateUserDto = {
  username: "",
  password: "",
  fullName: "",
  email: "",
  phone: "",
  roleId: null,
  isActive: true,
};

export const UserMaster = memo(function UserMaster() {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [roles, setRoles] = useState<RoleRecord[]>([]);
  const [formData, setFormData] = useState<CreateUserDto>(emptyUser);
  const [editingUser, setEditingUser] = useState<UserRecord | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<UserRecord | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const loadData = async () => {
    const [userData, roleData] = await Promise.all([
      usersApi.getAll(),
      rolesApi.getAll(),
    ]);
    setUsers(userData);
    setRoles(roleData.filter((role) => role.isActive));
  };

  useEffect(() => {
    void loadData().catch(() => toast.error("Failed to load users"));
  }, []);

  const roleOptions = useMemo(
    () => roles.map((role) => ({ value: String(role.id), label: role.name })),
    [roles],
  );

  const saveUser = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!formData.username.trim() && !editingUser) {
      toast.error("Username is required");
      return;
    }

    if (!editingUser && !formData.password?.trim()) {
      toast.error("Password is required");
      return;
    }

    if (!formData.fullName.trim()) {
      toast.error("Full name is required");
      return;
    }

    try {
      setIsSaving(true);
      if (editingUser) {
        await usersApi.update(editingUser.id, {
          ...formData,
          username: editingUser.username,
          password: undefined,
        });
        toast.success("User updated");
      } else {
        await usersApi.create(formData);
        toast.success("User created");
      }

      setEditingUser(null);
      setFormData(emptyUser);
      await loadData();
    } catch (error: any) {
      toast.error(error.message || "Failed to save user");
    } finally {
      setIsSaving(false);
    }
  };

  const deleteUser = async () => {
    if (!deleteTarget) return;

    try {
      await usersApi.delete(deleteTarget.id);
      toast.success("User deleted");
      setDeleteTarget(null);
      await loadData();
    } catch (error: any) {
      toast.error(error.message || "Failed to delete user");
    }
  };

  const startEdit = (user: UserRecord) => {
    setEditingUser(user);
    setFormData({
      username: user.username,
      fullName: user.fullName,
      email: user.email || "",
      phone: user.phone || "",
      roleId: user.roleId || null,
      isActive: user.isActive,
    });
  };

  return (
    <OperationsPage
      title="User Master"
      description="Create and manage user accounts. Registration is restricted to Superadmin and Admin users."
      icon={UserCog}
      hideHeader
      metrics={[
        { label: "Users", value: users.length, tone: "brand" },
        { label: "Active Roles", value: roles.length, tone: "success" },
        { label: "Mode", value: editingUser ? "Edit" : "Create", tone: "default" },
      ]}
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
        <OperationsPanel title="User Account" icon={UserCog} className="lg:col-span-4">
          <form onSubmit={saveUser} className="space-y-3">
            <TextInput
              label="Username"
              disabled={Boolean(editingUser)}
              value={formData.username}
              onChange={(event) =>
                setFormData((current) => ({
                  ...current,
                  username: event.currentTarget.value,
                }))
              }
            />
            {!editingUser ? (
              <TextInput
                label="Password"
                type="password"
                value={formData.password || ""}
                onChange={(event) =>
                  setFormData((current) => ({
                    ...current,
                    password: event.currentTarget.value,
                  }))
                }
              />
            ) : null}
            <TextInput
              label="Full Name"
              value={formData.fullName}
              onChange={(event) =>
                setFormData((current) => ({
                  ...current,
                  fullName: event.currentTarget.value,
                }))
              }
            />
            <SimpleGrid cols={2}>
              <TextInput
                label="Email"
                value={formData.email || ""}
                onChange={(event) =>
                  setFormData((current) => ({
                    ...current,
                    email: event.currentTarget.value,
                  }))
                }
              />
              <TextInput
                label="Phone"
                value={formData.phone || ""}
                onChange={(event) =>
                  setFormData((current) => ({
                    ...current,
                    phone: event.currentTarget.value,
                  }))
                }
              />
            </SimpleGrid>
            <Select
              label="Role"
              data={roleOptions}
              value={formData.roleId ? String(formData.roleId) : null}
              onChange={(value) =>
                setFormData((current) => ({
                  ...current,
                  roleId: value ? Number(value) : null,
                }))
              }
              placeholder="Select role"
            />
            {editingUser ? (
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
            <Group gap="xs">
              <Button type="submit" size="sm" loading={isSaving}>
                {editingUser ? "Update User" : "Create User"}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="subtle"
                onClick={() => {
                  setEditingUser(null);
                  setFormData(emptyUser);
                }}
              >
                Clear
              </Button>
            </Group>
          </form>
        </OperationsPanel>

        <OperationsPanel title="Users" icon={UserCog} className="lg:col-span-8">
          <Table striped highlightOnHover withTableBorder withColumnBorders miw={760}>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Username</Table.Th>
                <Table.Th>Name</Table.Th>
                <Table.Th>Role</Table.Th>
                <Table.Th>Status</Table.Th>
                <Table.Th>Action</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {users.map((user) => (
                <Table.Tr key={user.id}>
                  <Table.Td>
                    <Text ff="monospace" size="sm" fw={700}>{user.username}</Text>
                  </Table.Td>
                  <Table.Td>{user.fullName}</Table.Td>
                  <Table.Td>{user.roleName || "-"}</Table.Td>
                  <Table.Td>
                    <Badge color={user.isActive ? "green" : "red"} variant="light">
                      {user.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    <Group gap={4} wrap="nowrap">
                      <Tooltip label="Edit user">
                        <ActionIcon variant="light" color="blue" onClick={() => startEdit(user)}>
                          <Edit2 size={14} />
                        </ActionIcon>
                      </Tooltip>
                      <Tooltip label="Delete user">
                        <ActionIcon variant="light" color="red" onClick={() => setDeleteTarget(user)}>
                          <Trash2 size={14} />
                        </ActionIcon>
                      </Tooltip>
                    </Group>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
          {users.length === 0 ? (
            <Paper p="md" mt="sm" radius="md" withBorder bg="transparent">
              <Text size="sm" c="dimmed">No users found.</Text>
            </Paper>
          ) : null}
        </OperationsPanel>
      </div>

      <Modal
        opened={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="Delete user"
        centered
      >
        <Text size="sm">Delete {deleteTarget?.username}? This cannot be undone.</Text>
        <Group justify="flex-end" mt="md">
          <Button size="sm" variant="subtle" onClick={() => setDeleteTarget(null)}>Cancel</Button>
          <Button size="sm" variant="destructive" onClick={deleteUser}>Delete</Button>
        </Group>
      </Modal>
    </OperationsPage>
  );
});

export default UserMaster;
