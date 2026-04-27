import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  TextInput,
  PasswordInput,
  Button,
  Paper,
  Title,
  Text,
  Container,
  Stack,
  Alert,
  Box,
  Badge,
  Center,
  Anchor,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import {
  IconLock,
  IconUser,
  IconMail,
  IconPhone,
  IconAlertCircle,
  IconShieldCheck,
  IconCheck,
} from '@tabler/icons-react';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { Logo } from '../components/atoms/Logo';

export function Register() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const form = useForm({
    initialValues: {
      username: '',
      fullName: '',
      email: '',
      phone: '',
      password: '',
      confirmPassword: '',
    },
    validate: {
      username: (value) => (value.trim().length >= 3 ? null : 'Username must be at least 3 characters'),
      fullName: (value) => (value.trim().length > 0 ? null : 'Full name is required'),
      email: (value) => (value.length === 0 || /^\S+@\S+$/.test(value) ? null : 'Invalid email'),
      password: (value) => (value.length >= 6 ? null : 'Password must be at least 6 characters'),
      confirmPassword: (value, values) => (value === values.password ? null : 'Passwords do not match'),
    },
  });

  const handleSubmit = async (values: typeof form.values) => {
    setError('');
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
        title: 'Account Created',
        message: 'Your operator account has been registered successfully.',
        color: 'green',
        icon: <IconCheck size={18} />,
      });
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } else {
      setError(result.message || 'Registration failed');
    }

    setIsLoading(false);
  };

  if (success) {
    return (
      <Box style={{ minHeight: '100vh', backgroundColor: '#050a14', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Stack align="center" gap="md">
          <Center style={{ width: 80, height: 80, borderRadius: '50%', border: '2px solid var(--mantine-color-green-6)' }}>
            <IconCheck size={40} color="var(--mantine-color-green-6)" />
          </Center>
          <Title order={2} c="white">Registration Successful!</Title>
          <Text c="dimmed">Redirecting to login portal...</Text>
        </Stack>
      </Box>
    );
  }

  return (
    <Box
      style={{
        minHeight: '100vh',
        backgroundColor: '#050a14',
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
    >
      <Box
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 0,
          background: 'radial-gradient(circle at 80% 20%, rgba(17, 167, 223, 0.05) 0%, transparent 50%), radial-gradient(circle at 20% 80%, rgba(0, 212, 255, 0.05) 0%, transparent 50%)',
        }}
      />

      <Container size="xs" style={{ position: 'relative', zIndex: 1, width: '100%' }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <Stack gap="xl" align="center" mb={30}>
            <Logo width={180} height={50} />
            <Badge variant="outline" color="blue" size="lg">New Operator Registration</Badge>
          </Stack>

          <Paper
            radius="24px"
            p={40}
            withBorder
            style={{
              backgroundColor: 'rgba(10, 18, 32, 0.7)',
              backdropFilter: 'blur(20px)',
              borderColor: 'rgba(255, 255, 255, 0.08)',
              boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5)',
            }}
          >
            <form onSubmit={form.onSubmit(handleSubmit)}>
              <Stack gap="md">
                {error && (
                  <Alert icon={<IconAlertCircle size={16} />} color="red" variant="light" radius="md">
                    {error}
                  </Alert>
                )}

                <TextInput
                  label="Username"
                  placeholder="Choose an ID"
                  leftSection={<IconUser size={18} />}
                  required
                  {...form.getInputProps('username')}
                />

                <TextInput
                  label="Full Name"
                  placeholder="Enter your name"
                  leftSection={<IconUser size={18} />}
                  required
                  {...form.getInputProps('fullName')}
                />

                <TextInput
                  label="Email"
                  placeholder="operator@plusgrow.com"
                  leftSection={<IconMail size={18} />}
                  {...form.getInputProps('email')}
                />

                <TextInput
                  label="Phone"
                  placeholder="+91 XXXXXXXXXX"
                  leftSection={<IconPhone size={18} />}
                  {...form.getInputProps('phone')}
                />

                <PasswordInput
                  label="Password"
                  placeholder="••••••••"
                  leftSection={<IconLock size={18} />}
                  required
                  {...form.getInputProps('password')}
                />

                <PasswordInput
                  label="Confirm Password"
                  placeholder="••••••••"
                  leftSection={<IconLock size={18} />}
                  required
                  {...form.getInputProps('confirmPassword')}
                />

                <Button
                  type="submit"
                  size="lg"
                  radius="md"
                  fullWidth
                  loading={isLoading}
                  variant="gradient"
                  gradient={{ from: '#11a7df', to: '#00d4ff', deg: 45 }}
                  mt="xl"
                >
                  Register Account
                </Button>

                <Center mt="md">
                  <Text size="sm" c="dimmed">
                    Already registered?{' '}
                    <Anchor component={Link} to="/login" fw={700}>
                      Sign In
                    </Anchor>
                  </Text>
                </Center>
              </Stack>
            </form>
          </Paper>
        </motion.div>
      </Container>
    </Box>
  );
}

export default Register;
