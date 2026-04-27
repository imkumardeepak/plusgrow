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
  Group,
  Stack,
  Alert,
  Box,
  Badge,
  Divider,
  Center,
  Tooltip,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import {
  IconLock,
  IconUser,
  IconShieldCheck,
  IconArrowRight,
  IconAlertCircle,
  IconCrown,
} from '@tabler/icons-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { Logo } from '../components/atoms/Logo';
import { SUPERADMIN_CONFIG } from '../config/superadmin';

const DEMO_CREDENTIALS = {
  username: 'admin',
  password: 'admin123',
} as const;

export function Login() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const form = useForm({
    initialValues: {
      username: '',
      password: '',
    },
    validate: {
      username: (value) => (value.trim().length > 0 ? null : 'Username is required'),
      password: (value) => (value.length > 0 ? null : 'Password is required'),
    },
  });

  const handleLogin = async (values: typeof form.values) => {
    setError('');
    setIsLoading(true);

    const result = await login({ username: values.username.trim(), password: values.password });

    if (result.success) {
      notifications.show({
        title: 'Authentication Successful',
        message: 'Welcome to PlusGrow WMS Command Center',
        color: 'blue',
        icon: <IconShieldCheck size={18} />,
      });
      navigate('/');
    } else {
      setError(result.message || 'Invalid credentials');
    }

    setIsLoading(false);
  };

  const handleQuickLogin = async (credentials: typeof DEMO_CREDENTIALS) => {
    form.setValues(credentials);
    setError('');
    setIsLoading(true);
    const result = await login(credentials);
    if (result.success) navigate('/');
    else setError(result.message || 'Quick login failed');
    setIsLoading(false);
  };

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
      }}
    >
      {/* Cinematic Background Elements */}
      <Box
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 0,
          background: 'radial-gradient(circle at 20% 30%, rgba(17, 167, 223, 0.1) 0%, transparent 50%), radial-gradient(circle at 80% 70%, rgba(0, 212, 255, 0.05) 0%, transparent 50%)',
        }}
      />

      {/* Animated Blobs */}
      <motion.div
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.1, 0.2, 0.1],
          x: [0, 50, 0],
          y: [0, -30, 0],
        }}
        transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
        style={{
          position: 'absolute',
          top: '10%',
          right: '15%',
          width: '400px',
          height: '400px',
          borderRadius: '50%',
          background: 'var(--mantine-color-blue-9)',
          filter: 'blur(100px)',
          zIndex: 0,
        }}
      />

      <Container size="xs" style={{ position: 'relative', zIndex: 1, width: '100%' }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        >
          <Stack gap="xl" align="center" mb={40}>
            <Logo width={220} height={60} />
            <Badge
              variant="dot"
              color="blue"
              size="lg"
              styles={{ root: { backgroundColor: 'rgba(34, 139, 230, 0.1)', border: '1px solid rgba(34, 139, 230, 0.2)' } }}
            >
              Secure Operator Portal
            </Badge>
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
            <Stack gap="xl">
              <Box>
                <Title order={2} ta="center" fw={800} size="h2" style={{ letterSpacing: '-0.5px' }}>
                  Admin Login
                </Title>
                <Text c="dimmed" size="sm" ta="center" mt={5}>
                  Enter your credentials to access the command center.
                </Text>
              </Box>

              <form onSubmit={form.onSubmit(handleLogin)}>
                <Stack gap="lg">
                  <AnimatePresence mode="wait">
                    {error && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                      >
                        <Alert
                          icon={<IconAlertCircle size={16} />}
                          color="red"
                          variant="light"
                          radius="md"
                        >
                          {error}
                        </Alert>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <TextInput
                    label="Username"
                    placeholder="operator_id"
                    leftSection={<IconUser size={18} stroke={1.5} />}
                    size="lg"
                    radius="md"
                    styles={{
                      input: {
                        backgroundColor: 'rgba(255, 255, 255, 0.03)',
                        borderColor: 'rgba(255, 255, 255, 0.1)',
                        '&:focus': { borderColor: 'var(--mantine-color-blue-6)' }
                      },
                      label: { marginBottom: 8, fontWeight: 600 }
                    }}
                    {...form.getInputProps('username')}
                  />

                  <PasswordInput
                    label="Password"
                    placeholder="••••••••"
                    leftSection={<IconLock size={18} stroke={1.5} />}
                    size="lg"
                    radius="md"
                    styles={{
                      input: {
                        backgroundColor: 'rgba(255, 255, 255, 0.03)',
                        borderColor: 'rgba(255, 255, 255, 0.1)',
                        '&:focus': { borderColor: 'var(--mantine-color-blue-6)' }
                      },
                      label: { marginBottom: 8, fontWeight: 600 }
                    }}
                    {...form.getInputProps('password')}
                  />

                  <Button
                    type="submit"
                    size="lg"
                    radius="md"
                    fullWidth
                    loading={isLoading}
                    variant="gradient"
                    gradient={{ from: '#11a7df', to: '#00d4ff', deg: 45 }}
                    styles={{
                      root: {
                        height: 54,
                        boxShadow: '0 8px 20px rgba(17, 167, 223, 0.3)',
                        '&:hover': { transform: 'translateY(-2px)', transition: 'transform 0.2s' }
                      }
                    }}
                  >
                    Authorize Access
                  </Button>
                </Stack>
              </form>

              <Divider label="Quick Auth" labelPosition="center" styles={{ label: { color: 'var(--mantine-color-dark-3)' } }} />

              <Group grow gap="sm">
                <Tooltip label="Login as Superadmin">
                  <Button
                    variant="outline"
                    color="orange"
                    size="md"
                    radius="md"
                    leftSection={<IconCrown size={18} />}
                    onClick={() => handleQuickLogin({ username: SUPERADMIN_CONFIG.username, password: SUPERADMIN_CONFIG.password })}
                    disabled={isLoading}
                    styles={{ root: { backgroundColor: 'rgba(255, 146, 43, 0.05)', borderColor: 'rgba(255, 146, 43, 0.2)' } }}
                  >
                    Superadmin
                  </Button>
                </Tooltip>

                <Button
                  variant="outline"
                  color="gray"
                  size="md"
                  radius="md"
                  onClick={() => form.setValues(DEMO_CREDENTIALS)}
                  styles={{ root: { backgroundColor: 'rgba(255, 255, 255, 0.03)', borderColor: 'rgba(255, 255, 255, 0.1)' } }}
                >
                  Demo User
                </Button>
              </Group>

              <Center>
                <Text size="sm" c="dimmed">
                  New operator?{' '}
                  <Text component={Link} to="/register" c="blue" fw={700} style={{ textDecoration: 'none' }}>
                    Request Credentials
                  </Text>
                </Text>
              </Center>
            </Stack>
          </Paper>

          <Text ta="center" c="dimmed" size="xs" mt={30} style={{ opacity: 0.5 }}>
            © 2026 PlusGrow WMS • System Version 4.2.0-stable
          </Text>
        </motion.div>
      </Container>
    </Box>
  );
}

export default Login;
