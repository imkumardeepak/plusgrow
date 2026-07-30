import React, { memo, useEffect, useMemo, useState } from "react";
import {
  ActionIcon,
  Badge,
  Box,
  Group,
  Modal,
  Paper,
  Select,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  PasswordInput,
  Tooltip,
} from "@mantine/core";
import { Edit2, Plus, RefreshCw, Search, Trash2, UserCog } from "lucide-react";

import { Button } from "../components/atoms/Button";
import {
  DataTableColumn,
  MantineDataTable,
} from "../components/molecules/MantineDataTable";
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

type UserStatusFilter = "all" | "active" | "inactive";

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
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<UserStatusFilter>("all");
  const [roleFilter, setRoleFilter] = useState<string | null>(null);
  const [userModalOpen, setUserModalOpen] = useState(false);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [userData, roleData] = await Promise.all([
        usersApi.getAll(),
        rolesApi.getAll(),
      ]);
      setUsers(userData);
      setRoles(roleData.filter((role) => role.isActive));
    } catch {
      toast.error("Failed to load users");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const roleOptions = useMemo(
    () => roles.map((role) => ({ value: String(role.id), label: role.name })),
    [roles],
  );

  const filteredUsers = useMemo(() => {
    const normalized = search.trim().toLowerCase();
    return users.filter((user) => {
      const matchesSearch =
        !normalized ||
        (user.username || "").toLowerCase().includes(normalized) ||
        (user.fullName || "").toLowerCase().includes(normalized) ||
        (user.email || "").toLowerCase().includes(normalized) ||
        (user.roleName || "").toLowerCase().includes(normalized);
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && user.isActive) ||
        (statusFilter === "inactive" && !user.isActive);
      const matchesRole = !roleFilter || String(user.roleId) === roleFilter;

      return matchesSearch && matchesStatus && matchesRole;
    });
  }, [roleFilter, search, statusFilter, users]);

  const stats = useMemo(
    () => ({
      active: users.filter((user) => user.isActive).length,
      inactive: users.filter((user) => !user.isActive).length,
      admins: users.filter((user) =>
        ["Superadmin", "Admin"].includes(user.roleName || ""),
      ).length,
    }),
    [users],
  );

  const resetUserModal = () => {
    setEditingUser(null);
    setFormData(emptyUser);
    setUserModalOpen(false);
  };

  const openCreateUser = () => {
    setEditingUser(null);
    setFormData(emptyUser);
    setUserModalOpen(true);
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
      password: "",
    });
    setUserModalOpen(true);
  };

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
          password: formData.password || undefined,
        });
        toast.success("User updated");
      } else {
        await usersApi.create(formData);
        toast.success("User created");
      }

      resetUserModal();
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

  const columns: DataTableColumn<UserRecord>[] = [
    {
      key: "username",
      header: "Username",
      sortable: true,
      sortAccessor: (row) => row.username,
      render: (row) => (
        <Text size="11px" ff="monospace" fw={800} c="cyan.2">
          {row.username}
        </Text>
      ),
      width: 150,
    },
    {
      key: "name",
      header: "Name",
      sortable: true,
      sortAccessor: (row) => row.fullName,
      render: (row) => (
        <div className="min-w-0">
          <Text size="xs" fw={800} lineClamp={1}>
            {row.fullName}
          </Text>
          <Text size="10px" c="dimmed" lineClamp={1}>
            {row.email || row.phone || "No contact saved"}
          </Text>
        </div>
      ),
      width: 240,
    },
    {
      key: "password",
      header: "Password",
      sortable: false,
      render: (row) => (
        <Text size="11px" ff="monospace" fw={600}>
          {row.password || "********"}
        </Text>
      ),
      width: 120,
    },
    {
      key: "role",
      header: "Role",
      sortable: true,
      sortAccessor: (row) => row.roleName || "",
      render: (row) => (
        <Badge size="sm" radius="md" variant="light" color="cyan">
          {row.roleName || "No Role"}
        </Badge>
      ),
      width: 160,
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
      width: 110,
    },
    {
      key: "actions",
      header: "Action",
      align: "right",
      render: (row) => (
        <Group gap="xs" justify="flex-end" wrap="nowrap">
          <Tooltip label="Edit user">
            <ActionIcon
              size="sm"
              radius="md"
              variant="light"
              color="blue"
              onClick={() => startEdit(row)}
              aria-label="Edit user"
            >
              <Edit2 size={14} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label="Delete user">
            <ActionIcon
              size="sm"
              radius="md"
              variant="light"
              color="red"
              onClick={() => setDeleteTarget(row)}
              aria-label="Delete user"
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
      title="User Master"
      description="Create and manage user accounts. Registration is restricted to Superadmin and Admin users."
      icon={UserCog}
      hideHeader
    >
      <Stack gap="sm">
        <OperationsPanel
          title="Filters"
          icon={UserCog}
          description="User search, role filter, and account status view."
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
                  setStatusFilter((value || "all") as UserStatusFilter)
                }
                data={[
                  { value: "all", label: "All" },
                  { value: "active", label: "Active" },
                  { value: "inactive", label: "Inactive" },
                ]}
              />
            </Box>
            <Select
              size="xs"
              radius="md"
              label="Role"
              clearable
              data={roleOptions}
              value={roleFilter}
              onChange={setRoleFilter}
              placeholder="All roles"
            />
            <TextInput
              size="xs"
              radius="md"
              label="Search"
              value={search}
              onChange={(event) => setSearch(event.currentTarget.value)}
              placeholder="Username, name, email..."
              leftSection={<Search size={14} />}
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
                    setRoleFilter(null);
                    setSearch("");
                  }}
                >
                  Clear
                </Button>
                <Button
                  size="xs"
                  variant="subtle"
                  onClick={() => void loadData()}
                >
                  Reload
                </Button>
              </Group>
            </Box>
          </SimpleGrid>
        </OperationsPanel>

        <OperationsPanel
          title="User Ledger"
          icon={UserCog}
          description="Compact account list for user creation, role assignment, and account status control."
          action={
            <Group gap="xs" wrap="nowrap">
              <Badge size="sm" radius="md" variant="light" color="gray">
                {filteredUsers.length} Rows
              </Badge>
              <Badge size="sm" radius="md" variant="light" color="green">
                {stats.active} Active
              </Badge>
              <Badge size="sm" radius="md" variant="light" color="red">
                {stats.inactive} Inactive
              </Badge>
              <Badge size="sm" radius="md" variant="light" color="cyan">
                {stats.admins} Admin
              </Badge>
              <ActionIcon
                size="sm"
                radius="md"
                variant="light"
                color="gray"
                onClick={() => void loadData()}
                loading={isLoading}
                aria-label="Refresh users"
              >
                <RefreshCw size={14} />
              </ActionIcon>
              <Button
                size="sm"
                onClick={openCreateUser}
                leftIcon={<Plus className="h-3.5 w-3.5" />}
              >
                New User
              </Button>
            </Group>
          }
          contentClassName="p-0"
        >
          <MantineDataTable
            data={filteredUsers}
            columns={columns}
            rowKey={(row) => row.id}
            isLoading={isLoading}
            pageSize={25}
            emptyIcon={UserCog}
            emptyTitle="No users"
            emptyDescription="No users match current search or filter."
            itemLabel="users"
            resetPageKey={`${search}-${statusFilter}-${roleFilter}`}
            minWidth={820}
          />
        </OperationsPanel>
      </Stack>

      <Modal
        opened={userModalOpen}
        onClose={resetUserModal}
        title={editingUser ? "Edit User" : "New User"}
        size="xl"
        centered
      >
        <form onSubmit={saveUser}>
          <Stack gap="md">
            <Paper radius="lg" p="md" withBorder bg="transparent">
              <Stack gap="md">
                <Text size="11px" fw={800} c="dimmed" tt="uppercase">
                  Account Details
                </Text>
                <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
                  <TextInput
                    label="Username"
                    disabled={Boolean(editingUser)}
                    value={formData.username}
                    onChange={(event) => {
                      const username = event.currentTarget.value;
                      setFormData((current) => ({ ...current, username }));
                    }}
                  />
                  <TextInput
                    label={editingUser ? "New Password" : "Password"}
                    description={editingUser ? "Leave blank to keep existing password" : ""}
                    value={formData.password || ""}
                    onChange={(event) => {
                      const password = event.currentTarget.value;
                      setFormData((current) => ({ ...current, password }));
                    }}
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
                  <TextInput
                    label="Full Name"
                    value={formData.fullName}
                    onChange={(event) => {
                      const fullName = event.currentTarget.value;
                      setFormData((current) => ({ ...current, fullName }));
                    }}
                  />
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
                  <TextInput
                    label="Email"
                    value={formData.email || ""}
                    onChange={(event) => {
                      const email = event.currentTarget.value;
                      setFormData((current) => ({ ...current, email }));
                    }}
                  />
                  <TextInput
                    label="Phone"
                    value={formData.phone || ""}
                    onChange={(event) => {
                      const phone = event.currentTarget.value;
                      setFormData((current) => ({ ...current, phone }));
                    }}
                  />
                </SimpleGrid>
              </Stack>
            </Paper>
            <Group justify="flex-end" gap="xs">
              <Button type="button" size="sm" variant="subtle" onClick={resetUserModal}>
                Cancel
              </Button>
              <Button type="submit" size="sm" loading={isSaving}>
                {editingUser ? "Update User" : "Create User"}
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>

      <Modal
        opened={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="Delete user"
        centered
      >
        <Text size="sm">Delete {deleteTarget?.username}? This cannot be undone.</Text>
        <Group justify="flex-end" mt="md">
          <Button size="sm" variant="subtle" onClick={() => setDeleteTarget(null)}>
            Cancel
          </Button>
          <Button size="sm" variant="destructive" onClick={deleteUser}>
            Delete
          </Button>
        </Group>
      </Modal>
    </OperationsPage>
  );
});

export default UserMaster;
