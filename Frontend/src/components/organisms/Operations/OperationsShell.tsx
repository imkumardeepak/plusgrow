import React from 'react';
import { LucideIcon } from 'lucide-react';
import {
  Card,
  Text,
  Group,
  Stack,
  Title,
  Box,
  SimpleGrid,
  Paper,
  ThemeIcon,
  Divider,
  Center,
} from '@mantine/core';

type Tone = 'default' | 'brand' | 'warning' | 'success';

const toneColors: Record<Tone, string> = {
  default: 'gray',
  brand: 'blue',
  warning: 'orange',
  success: 'green',
};

export interface OperationsMetric {
  label: string;
  value: React.ReactNode;
  tone?: Tone;
}

interface OperationsPageProps {
  title: string;
  description: string;
  icon: LucideIcon;
  actions?: React.ReactNode;
  metrics?: OperationsMetric[];
  children: React.ReactNode;
}

export function OperationsPage({
  title,
  description,
  icon: Icon,
  actions,
  metrics = [],
  children,
}: OperationsPageProps) {
  return (
    <Stack gap="md" style={{ minHeight: 0 }}>
      <Paper
        p="lg"
        radius="lg"
        withBorder
        style={{
          background: 'rgba(10, 18, 32, 0.4)',
          backdropFilter: 'blur(10px)',
          borderColor: 'rgba(255, 255, 255, 0.05)',
        }}
      >
        <Stack gap="md">
          <Group justify="space-between" align="flex-start">
            <Group gap="md" align="center">
              <ThemeIcon size={48} radius="md" variant="gradient" gradient={{ from: 'blue', to: 'cyan' }}>
                <Icon size={24} />
              </ThemeIcon>
              <Box>
                <Title order={2} size="h3" fw={800} style={{ letterSpacing: '-0.5px' }}>{title}</Title>
                <Text size="sm" c="dimmed">{description}</Text>
              </Box>
            </Group>
            {actions && <Group gap="xs">{actions}</Group>}
          </Group>

          {metrics.length > 0 && (
            <SimpleGrid cols={{ base: 1, sm: 2, md: Math.min(metrics.length, 4) }} gap="sm" mt="xs">
              {metrics.map((metric) => (
                <Paper
                  key={metric.label}
                  p="sm"
                  radius="md"
                  withBorder
                  style={{
                    background: 'rgba(255, 255, 255, 0.02)',
                    borderColor: 'rgba(255, 255, 255, 0.05)',
                  }}
                >
                  <Text size="xs" fw={800} c="dimmed" style={{ letterSpacing: '1px', textTransform: 'uppercase' }}>
                    {metric.label}
                  </Text>
                  <Text size="xl" fw={900} color={toneColors[metric.tone ?? 'default']}>
                    {metric.value}
                  </Text>
                </Paper>
              ))}
            </SimpleGrid>
          )}
        </Stack>
      </Paper>

      {children}
    </Stack>
  );
}

interface OperationsPanelProps {
  title: string;
  icon: LucideIcon;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
}

export function OperationsPanel({
  title,
  icon: Icon,
  description,
  action,
  children,
  className,
  contentClassName,
}: OperationsPanelProps) {
  return (
    <Card
      radius="lg"
      withBorder
      padding={0}
      className={className}
      style={{
        background: 'rgba(10, 18, 32, 0.3)',
        backdropFilter: 'blur(10px)',
        borderColor: 'rgba(255, 255, 255, 0.05)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Box p="md" style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
        <Group justify="space-between" align="center">
          <Group gap="xs">
            <ThemeIcon color="blue" variant="light" size="md">
              <Icon size={18} />
            </ThemeIcon>
            <Box>
              <Text fw={700} size="sm">{title}</Text>
              {description && <Text size="xs" c="dimmed">{description}</Text>}
            </Box>
          </Group>
          {action && <Box>{action}</Box>}
        </Group>
      </Box>
      <Box p="md" flex={1} className={contentClassName} style={{ minHeight: 0 }}>
        {children}
      </Box>
    </Card>
  );
}

interface OperationsEmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
}

export function OperationsEmptyState({
  icon: Icon,
  title,
  description,
  action,
}: OperationsEmptyStateProps) {
  return (
    <Center style={{ height: '100%', minHeight: 240 }} p="xl">
      <Stack align="center" gap="md" ta="center">
        <ThemeIcon size={60} radius="xl" variant="light" color="gray">
          <Icon size={32} />
        </ThemeIcon>
        <Box>
          <Text fw={700} size="sm">{title}</Text>
          <Text size="xs" c="dimmed" mt={4} maw={300}>{description}</Text>
        </Box>
        {action && <Box>{action}</Box>}
      </Stack>
    </Center>
  );
}
