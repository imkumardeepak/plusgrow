import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Alert,
  Anchor,
  Button,
  Group,
  PasswordInput,
  Stack,
  Text,
  TextInput,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { notifications } from "@mantine/notifications";
import {
  IconAlertCircle,
  IconArrowRight,
  IconBuildingWarehouse,
  IconDeviceDesktopAnalytics,
  IconLock,
  IconShieldCheck,
  IconUser,
} from "@tabler/icons-react";
import { useAuth } from "../context/AuthContext";
import { AuthShell } from "../components/organisms/Auth/AuthShell";



export function Login() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const { login } = useAuth();
  const navigate = useNavigate();

  const form = useForm({
    initialValues: {
      username: "",
      password: "",
    },
    validate: {
      username: (value) =>
        value.trim().length > 0 ? null : "Username is required",
      password: (value) =>
        value.length > 0 ? null : "Password is required",
    },
  });

  const handleLogin = async (values: typeof form.values) => {
    setError("");
    setIsLoading(true);

    const result = await login({
      username: values.username.trim(),
      password: values.password,
    });

    if (result.success) {
      notifications.show({
        title: "Authentication successful",
        message: "Welcome to PlusGrow WMS command center",
        color: "blue",
        icon: <IconShieldCheck size={18} />,
      });
      navigate("/");
    } else {
      setError(result.message || "Invalid credentials");
    }

    setIsLoading(false);
  };



  return (
    <AuthShell
      badge="Secure Access"
      title="Sign in to warehouse control"
      description="Use operator credentials to access receiving, put-away, dispatch, and inventory workflows."
      eyebrow="Enterprise SaaS"
      heroTitle="Fast operator access for daily warehouse execution"
      heroDescription="Built for logistics teams who need stable access, clear workflows, and one command surface across master data and operations."
      heroIcon={IconBuildingWarehouse}
      stats={[
        { label: "Modules", value: "12+" },
        { label: "Live Flow", value: "24/7" },
        { label: "Audit Ready", value: "100%" },
      ]}
      features={[
        {
          icon: IconShieldCheck,
          title: "Secure Auth",
          description: "Controlled operator entry with session validation and role context.",
        },
        {
          icon: IconDeviceDesktopAnalytics,
          title: "Single Workspace",
          description: "One surface for master data, inventory, inward, and outward flows.",
        },
        {
          icon: IconBuildingWarehouse,
          title: "Ops Focused",
          description: "Designed for fast warehouse execution, not generic admin screens.",
        },
      ]}
      footer={
        <Group justify="space-between" wrap="wrap">
          <Text size="sm" c="dimmed">
            New operator?{" "}
            <Anchor component={Link} to="/register" fw={700}>
              Request credentials
            </Anchor>
          </Text>
          <Text size="xs" c="dimmed">
            PlusGrow WMS • 2026
          </Text>
        </Group>
      }
    >
      <form onSubmit={form.onSubmit(handleLogin)}>
        <Stack gap={{ base: "xs", sm: "md" }}>
          {error ? (
            <Alert
              icon={<IconAlertCircle size={16} />}
              color="red"
              variant="light"
              radius="lg"
            >
              {error}
            </Alert>
          ) : null}

          <TextInput
            label="Username"
            placeholder="operator_id"
            leftSection={<IconUser size={18} stroke={1.5} />}
            size={{ base: "md", sm: "lg" }}
            radius="lg"
            styles={{
              input: {
                minHeight: 44,
                backgroundColor: "rgba(255,255,255,0.03)",
                borderColor: "rgba(255,255,255,0.1)",
              },
              label: { marginBottom: 4, fontWeight: 600 },
            }}
            {...form.getInputProps("username")}
          />

          <PasswordInput
            label="Password"
            placeholder="••••••••"
            leftSection={<IconLock size={18} stroke={1.5} />}
            size={{ base: "md", sm: "lg" }}
            radius="lg"
            styles={{
              input: {
                minHeight: 44,
                backgroundColor: "rgba(255,255,255,0.03)",
                borderColor: "rgba(255,255,255,0.1)",
              },
              label: { marginBottom: 4, fontWeight: 600 },
            }}
            {...form.getInputProps("password")}
          />

          <Button
            type="submit"
            size="md"
            radius="xl"
            fullWidth
            loading={isLoading}
            variant="gradient"
            gradient={{ from: "#11a7df", to: "#00d4ff", deg: 45 }}
            rightSection={<IconArrowRight size={18} />}
            styles={{
              root: {
                minHeight: 44,
                boxShadow: "0 8px 20px rgba(17, 167, 223, 0.3)",
              },
            }}
          >
            Sign In
          </Button>
        </Stack>
      </form>


    </AuthShell>
  );
}

export default Login;
