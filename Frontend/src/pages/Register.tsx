import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Alert,
  Anchor,
  Box,
  Button,
  Group,
  PasswordInput,
  Progress,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  ThemeIcon,
  Title,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { notifications } from "@mantine/notifications";
import {
  IconAlertCircle,
  IconCheck,
  IconIdBadge2,
  IconLock,
  IconMail,
  IconPhone,
  IconShieldCheck,
  IconUser,
  IconUserPlus,
} from "@tabler/icons-react";
import { useAuth } from "../context/AuthContext";
import { AuthShell } from "../components/organisms/Auth/AuthShell";

export function Register() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const form = useForm({
    initialValues: {
      username: "",
      fullName: "",
      email: "",
      phone: "",
      password: "",
      confirmPassword: "",
    },
    validate: {
      username: (value) =>
        value.trim().length >= 3
          ? null
          : "Username must be at least 3 characters",
      fullName: (value) =>
        value.trim().length > 0 ? null : "Full name is required",
      email: (value) =>
        value.length === 0 || /^\S+@\S+$/.test(value)
          ? null
          : "Invalid email",
      password: (value) =>
        value.length >= 6
          ? null
          : "Password must be at least 6 characters",
      confirmPassword: (value, values) =>
        value === values.password ? null : "Passwords do not match",
    },
  });

  const passwordStrength = Math.min(
    100,
    (form.values.password.length >= 6 ? 35 : 0) +
      (/[A-Z]/.test(form.values.password) ? 25 : 0) +
      (/[0-9]/.test(form.values.password) ? 20 : 0) +
      (/[^A-Za-z0-9]/.test(form.values.password) ? 20 : 0),
  );

  const handleSubmit = async (values: typeof form.values) => {
    setError("");
    setIsLoading(true);

    const result = await register({
      username: values.username.trim(),
      password: values.password,
      fullName: values.fullName.trim(),
      email: values.email.trim() || undefined,
      phone: values.phone.trim() || undefined,
    });

    if (result.success) {
      setSuccess(true);
      notifications.show({
        title: "Account created",
        message: "Operator account registered successfully.",
        color: "green",
        icon: <IconCheck size={18} />,
      });
      setTimeout(() => {
        navigate("/login");
      }, 1800);
    } else {
      setError(result.message || "Registration failed");
    }

    setIsLoading(false);
  };

  if (success) {
    return (
      <Box
        style={{
          minHeight: "100dvh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background:
            "radial-gradient(circle at top left, rgba(23,185,236,0.18), transparent 24%), linear-gradient(180deg, #08111d 0%, #0b1320 48%, #060c16 100%)",
        }}
      >
        <Stack align="center" gap="md">
          <ThemeIcon size={84} radius="xl" color="green" variant="light">
            <IconCheck size={42} />
          </ThemeIcon>
          <Title order={2} c="white">
            Registration successful
          </Title>
          <Text c="dimmed">Redirecting to login...</Text>
        </Stack>
      </Box>
    );
  }

  return (
    <AuthShell
      badge="Operator Onboarding"
      title="Create operator account"
      description="Register new user in one clean screen. Designed for fast onboarding without multi-page friction."
      eyebrow="Access Provisioning"
      heroTitle="Better onboarding for warehouse teams"
      heroDescription="Single-page registration gives clear form flow, strong field grouping, and immediate readiness for operator access."
      heroIcon={IconUserPlus}
      stats={[
        { label: "Setup Time", value: "< 2 min" },
        { label: "Fields", value: "6" },
        { label: "Role Ready", value: "Instant" },
      ]}
      features={[
        {
          icon: IconShieldCheck,
          title: "Controlled Access",
          description: "Register with validation and consistent field hierarchy.",
        },
        {
          icon: IconIdBadge2,
          title: "Operator Identity",
          description: "Username, full name, contact, and password in one clear flow.",
        },
        {
          icon: IconUserPlus,
          title: "Single Screen",
          description: "No second page, no overflow-heavy layout, no broken mobile form.",
        },
      ]}
      footer={
        <Group justify="space-between" wrap="wrap">
          <Text size="sm" c="dimmed">
            Already registered?{" "}
            <Anchor component={Link} to="/login" fw={700}>
              Sign in
            </Anchor>
          </Text>
          <Text size="xs" c="dimmed">
            PlusGrow WMS • 2026
          </Text>
        </Group>
      }
    >
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack gap="md">
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

          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
            <TextInput
              label="Username"
              placeholder="operator_id"
              leftSection={<IconUser size={18} stroke={1.5} />}
              size="lg"
              radius="lg"
              styles={{
                input: {
                  minHeight: 50,
                  backgroundColor: "rgba(255,255,255,0.03)",
                  borderColor: "rgba(255,255,255,0.1)",
                },
                label: { marginBottom: 8, fontWeight: 600 },
              }}
              {...form.getInputProps("username")}
            />

            <TextInput
              label="Full Name"
              placeholder="Enter full name"
              leftSection={<IconUser size={18} stroke={1.5} />}
              size="lg"
              radius="lg"
              styles={{
                input: {
                  minHeight: 50,
                  backgroundColor: "rgba(255,255,255,0.03)",
                  borderColor: "rgba(255,255,255,0.1)",
                },
                label: { marginBottom: 8, fontWeight: 600 },
              }}
              {...form.getInputProps("fullName")}
            />

            <TextInput
              label="Email"
              placeholder="operator@plusgrow.com"
              leftSection={<IconMail size={18} stroke={1.5} />}
              size="lg"
              radius="lg"
              styles={{
                input: {
                  minHeight: 50,
                  backgroundColor: "rgba(255,255,255,0.03)",
                  borderColor: "rgba(255,255,255,0.1)",
                },
                label: { marginBottom: 8, fontWeight: 600 },
              }}
              {...form.getInputProps("email")}
            />

            <TextInput
              label="Phone"
              placeholder="+91 XXXXXXXXXX"
              leftSection={<IconPhone size={18} stroke={1.5} />}
              size="lg"
              radius="lg"
              styles={{
                input: {
                  minHeight: 50,
                  backgroundColor: "rgba(255,255,255,0.03)",
                  borderColor: "rgba(255,255,255,0.1)",
                },
                label: { marginBottom: 8, fontWeight: 600 },
              }}
              {...form.getInputProps("phone")}
            />
          </SimpleGrid>

          <PasswordInput
            label="Password"
            placeholder="Create password"
            leftSection={<IconLock size={18} stroke={1.5} />}
            size="lg"
            radius="lg"
            styles={{
              input: {
                minHeight: 50,
                backgroundColor: "rgba(255,255,255,0.03)",
                borderColor: "rgba(255,255,255,0.1)",
              },
              label: { marginBottom: 8, fontWeight: 600 },
            }}
            {...form.getInputProps("password")}
          />

          <Stack gap={6}>
            <Group justify="space-between">
              <Text size="xs" c="dimmed">
                Password strength
              </Text>
              <Text size="xs" c="dimmed">
                {passwordStrength}%
              </Text>
            </Group>
            <Progress
              value={passwordStrength}
              radius="xl"
              size="sm"
              color={
                passwordStrength < 40
                  ? "red"
                  : passwordStrength < 75
                    ? "yellow"
                    : "green"
              }
            />
          </Stack>

          <PasswordInput
            label="Confirm Password"
            placeholder="Repeat password"
            leftSection={<IconLock size={18} stroke={1.5} />}
            size="lg"
            radius="lg"
            styles={{
              input: {
                minHeight: 50,
                backgroundColor: "rgba(255,255,255,0.03)",
                borderColor: "rgba(255,255,255,0.1)",
              },
              label: { marginBottom: 8, fontWeight: 600 },
            }}
            {...form.getInputProps("confirmPassword")}
          />

          <Button
            type="submit"
            size="lg"
            radius="xl"
            fullWidth
            loading={isLoading}
            variant="gradient"
            gradient={{ from: "#11a7df", to: "#00d4ff", deg: 45 }}
            styles={{
              root: {
                minHeight: 52,
                boxShadow: "0 8px 20px rgba(17, 167, 223, 0.3)",
              },
            }}
          >
            Create Account
          </Button>
        </Stack>
      </form>
    </AuthShell>
  );
}

export default Register;
