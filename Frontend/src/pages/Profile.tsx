import React, { memo, useMemo, useState } from "react";
import { format } from "date-fns";
import {
  Badge,
  Group,
  Paper,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
} from "@mantine/core";
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  Lock,
  Mail,
  Phone,
  Shield,
  User,
} from "lucide-react";

import { Button } from "../components/atoms/Button";
import {
  OperationsPage,
  OperationsPanel,
} from "../components/organisms/Operations/OperationsShell";
import { useAuth } from "../context/AuthContext";

export const Profile = memo(function Profile() {
  const { user, changePassword } = useAuth();
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const initials = useMemo(() => {
    if (!user?.fullName) return "US";
    return user.fullName
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }, [user?.fullName]);

  const handlePasswordChange = async (event: React.FormEvent) => {
    event.preventDefault();
    setMessage(null);

    if (!passwordData.currentPassword) {
      setMessage({ type: "error", text: "Current password is required" });
      return;
    }

    if (!passwordData.newPassword) {
      setMessage({ type: "error", text: "New password is required" });
      return;
    }

    if (passwordData.newPassword.length < 6) {
      setMessage({
        type: "error",
        text: "New password must be at least 6 characters",
      });
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setMessage({ type: "error", text: "Passwords do not match" });
      return;
    }

    setIsLoading(true);
    const result = await changePassword({
      currentPassword: passwordData.currentPassword,
      newPassword: passwordData.newPassword,
    });

    if (result.success) {
      setMessage({ type: "success", text: "Password changed successfully" });
      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      setShowPasswordForm(false);
    } else {
      setMessage({
        type: "error",
        text: result.message || "Failed to change password",
      });
    }

    setIsLoading(false);
  };

  if (!user) {
    return (
      <OperationsPage
        title="My Profile"
        description="Account details and password settings."
        icon={User}
        hideHeader
      >
        <Paper radius="lg" p="xl" withBorder bg="transparent">
          <Text size="sm" c="dimmed">
            Loading profile...
          </Text>
        </Paper>
      </OperationsPage>
    );
  }

  return (
    <OperationsPage
      title="My Profile"
      description="Review account details and update password from one compact workspace."
      icon={User}
      hideHeader
      metrics={[
        { label: "Role", value: user.roleName || "User", tone: "brand" },
        {
          label: "Status",
          value: user.isActive ? "Active" : "Inactive",
          tone: user.isActive ? "success" : "default",
        },
        {
          label: "Last Login",
          value: user.lastLoginAt
            ? format(new Date(user.lastLoginAt), "dd MMM yyyy")
            : "No data",
          tone: "default",
        },
      ]}
    >
      <Stack gap="xs">
        <SimpleGrid cols={{ base: 1, xl: 4 }} spacing="xs">
          <OperationsPanel
            title="Profile Summary"
            icon={User}
            description="Identity and status."
            className="xl:col-span-1"
          >
            <Paper
              radius="md"
              p="sm"
              withBorder
              bg="linear-gradient(135deg, rgba(14, 165, 233, 0.12), rgba(15, 23, 42, 0.72))"
              style={{ borderColor: "rgba(34, 211, 238, 0.16)" }}
            >
              <Group gap="sm" wrap="nowrap" align="center">
                <div className="w-12 h-12 rounded-full bg-cyan-500/15 border border-cyan-400/20 flex items-center justify-center text-white text-sm font-black shrink-0">
                  {initials}
                </div>
                <div className="min-w-0">
                  <Text size="sm" fw={900} c="white" lineClamp={1}>
                    {user.fullName}
                  </Text>
                  <Text size="xs" ff="monospace" c="cyan.3">
                    @{user.username}
                  </Text>
                  <Badge
                    mt={6}
                    size="xs"
                    radius="md"
                    variant="light"
                    color="cyan"
                  >
                    {user.roleName || "User"}
                  </Badge>
                </div>
              </Group>
            </Paper>

            <Stack gap={6} mt="xs">
              <ProfileLine
                icon={Mail}
                label="Email"
                value={user.email || "No email set"}
              />
              <ProfileLine
                icon={Phone}
                label="Phone"
                value={user.phone || "No phone set"}
              />
              <ProfileLine
                icon={Calendar}
                label="Joined"
                value={format(new Date(user.createdAt), "dd MMM yyyy")}
              />
              <ProfileLine
                icon={Shield}
                label="Last Login"
                value={
                  user.lastLoginAt
                    ? format(new Date(user.lastLoginAt), "dd MMM yyyy HH:mm")
                    : "No login recorded"
                }
              />
            </Stack>
          </OperationsPanel>

          <OperationsPanel
            title="Account Details"
            icon={Shield}
            description="Authenticated account fields."
            className="xl:col-span-3"
          >
            <SimpleGrid cols={{ base: 1, md: 2, xl: 4 }} spacing="xs">
              <InfoCard label="User ID" value={String(user.id)} mono />
              <InfoCard label="Username" value={`@${user.username}`} mono />
              <InfoCard label="Full Name" value={user.fullName} />
              <InfoCard label="Role" value={user.roleName || "User"} />
              <InfoCard label="Email" value={user.email || "Not set"} />
              <InfoCard label="Phone" value={user.phone || "Not set"} />
              <InfoCard
                label="Created"
                value={format(new Date(user.createdAt), "dd MMM yyyy HH:mm")}
              />
              <InfoCard
                label="Status"
                value={user.isActive ? "Active" : "Inactive"}
              />
            </SimpleGrid>
          </OperationsPanel>
        </SimpleGrid>

        <OperationsPanel
          title="Password Security"
          icon={Lock}
          description="Change your password without leaving the page."
          action={
            !showPasswordForm ? (
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setShowPasswordForm(true);
                  setMessage(null);
                }}
              >
                Change Password
              </Button>
            ) : undefined
          }
        >
          {message ? (
            <Paper
              radius="md"
              p="xs"
              withBorder
              mb="xs"
              bg="transparent"
              style={{
                borderColor:
                  message.type === "success"
                    ? "rgba(34, 197, 94, 0.25)"
                    : "rgba(239, 68, 68, 0.25)",
              }}
            >
              <Group gap="xs" wrap="nowrap">
                {message.type === "success" ? (
                  <CheckCircle2 size={16} color="var(--mantine-color-green-4)" />
                ) : (
                  <AlertCircle size={16} color="var(--mantine-color-red-4)" />
                )}
                <Text
                  size="sm"
                  c={message.type === "success" ? "green.3" : "red.3"}
                >
                  {message.text}
                </Text>
              </Group>
            </Paper>
          ) : null}

          {showPasswordForm ? (
            <form onSubmit={handlePasswordChange}>
              <Stack gap="sm">
                <SimpleGrid cols={{ base: 1, md: 3 }} spacing="sm">
                  <TextInput
                    label="Current Password"
                    size="xs"
                    type="password"
                    value={passwordData.currentPassword}
                    onChange={(event) => {
                      const currentPassword = event.currentTarget.value;
                      setPasswordData((current) => ({
                        ...current,
                        currentPassword,
                      }));
                    }}
                    placeholder="Enter current password"
                  />
                  <TextInput
                    label="New Password"
                    size="xs"
                    type="password"
                    value={passwordData.newPassword}
                    onChange={(event) => {
                      const newPassword = event.currentTarget.value;
                      setPasswordData((current) => ({
                        ...current,
                        newPassword,
                      }));
                    }}
                    placeholder="Enter new password"
                    description="Minimum 6 characters"
                  />
                  <TextInput
                    label="Confirm Password"
                    size="xs"
                    type="password"
                    value={passwordData.confirmPassword}
                    onChange={(event) => {
                      const confirmPassword = event.currentTarget.value;
                      setPasswordData((current) => ({
                        ...current,
                        confirmPassword,
                      }));
                    }}
                    placeholder="Confirm new password"
                  />
                </SimpleGrid>
                <Group gap="xs" justify="flex-end">
                  <Button
                    type="button"
                    size="sm"
                    variant="subtle"
                    onClick={() => {
                      setShowPasswordForm(false);
                      setPasswordData({
                        currentPassword: "",
                        newPassword: "",
                        confirmPassword: "",
                      });
                      setMessage(null);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" size="sm" loading={isLoading}>
                    Save Password
                  </Button>
                </Group>
              </Stack>
            </form>
          ) : (
            <Text size="sm" c="dimmed">
              Keep your account secure with a strong password unique to this system.
            </Text>
          )}
        </OperationsPanel>
      </Stack>
    </OperationsPage>
  );
});

function ProfileLine({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ size?: number; color?: string }>;
  label: string;
  value: string;
}) {
  return (
    <Group
      gap="xs"
      wrap="nowrap"
      className="rounded-md border border-slate-700/60 px-2.5 py-2"
    >
      <Icon size={14} color="var(--mantine-color-cyan-4)" />
      <div className="min-w-0">
        <Text size="9px" fw={800} c="dimmed" tt="uppercase">
          {label}
        </Text>
        <Text size="12px" fw={700} c="white" lineClamp={1}>
          {value}
        </Text>
      </div>
    </Group>
  );
}

function InfoCard({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <Paper radius="md" p="xs" withBorder bg="transparent">
      <Text size="10px" fw={800} c="dimmed">
        {label.toUpperCase()}
      </Text>
      <Text mt={4} size="xs" fw={800} ff={mono ? "monospace" : undefined}>
        {value}
      </Text>
    </Paper>
  );
}

export default Profile;
