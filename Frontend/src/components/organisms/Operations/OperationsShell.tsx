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
  Center,
} from '@mantine/core';

type Tone = 'default' | 'brand' | 'warning' | 'success';

const toneStyles: Record<Tone, { color: string; glow: string }> = {
  default: { color: 'var(--color-neutral-50)', glow: 'rgba(148, 163, 184, 0.18)' },
  brand: { color: 'var(--color-brand-200)', glow: 'rgba(30, 192, 243, 0.22)' },
  warning: { color: '#fde68a', glow: 'rgba(245, 158, 11, 0.2)' },
  success: { color: '#86efac', glow: 'rgba(16, 185, 129, 0.2)' },
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
    <Stack gap="sm" style={{ minHeight: 0 }}>
      <Paper
        p="md"
        radius="xl"
        withBorder
        style={{
          position: 'relative',
          overflow: 'hidden',
          background: 'var(--surface-glass)',
          backdropFilter: 'blur(18px)',
          borderColor: 'var(--border-subtle)',
          boxShadow: 'var(--shadow-card)',
        }}
      >
        <Box
          aria-hidden
          style={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            background:
              'linear-gradient(135deg, rgba(67, 212, 255, 0.1) 0%, transparent 24%, transparent 100%)',
          }}
        />

        <Stack gap="sm" style={{ position: 'relative' }}>
          <Group justify="space-between" align="flex-start" gap="md">
            <Group gap="sm" align="center" wrap="nowrap">
              <ThemeIcon
                size={42}
                radius="lg"
                variant="gradient"
                gradient={{ from: 'cyan.4', to: 'blue.7', deg: 145 }}
                style={{ boxShadow: 'var(--shadow-brand)' }}
              >
                <Icon size={20} />
              </ThemeIcon>
              <Box>
                <Title order={2} size="h3" fw={800} style={{ letterSpacing: '-0.04em', lineHeight: 1.1 }}>
                  {title}
                </Title>
                <Text size="xs" c="dimmed" mt={4} style={{ lineHeight: 1.45, maxWidth: 720 }}>
                  {description}
                </Text>
              </Box>
            </Group>
            {actions && <Group gap="xs">{actions}</Group>}
          </Group>

          {metrics.length > 0 && (
            <SimpleGrid cols={{ base: 1, sm: 2, md: Math.min(metrics.length, 4) }} gap="xs">
              {metrics.map((metric) => {
                const tone = toneStyles[metric.tone ?? 'default'];

                return (
                  <Paper
                    key={metric.label}
                    p="sm"
                    radius="lg"
                    withBorder
                    style={{
                      background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.045) 0%, rgba(255, 255, 255, 0.02) 100%)',
                      borderColor: 'rgba(255, 255, 255, 0.08)',
                      boxShadow: `inset 0 1px 0 rgba(255,255,255,0.05), 0 10px 24px ${tone.glow}`,
                    }}
                  >
                    <Text
                      size="10px"
                      fw={800}
                      c="dimmed"
                      style={{ letterSpacing: '0.14em', textTransform: 'uppercase', lineHeight: 1.2 }}
                    >
                      {metric.label}
                    </Text>
                    <Text
                      mt={6}
                      fw={900}
                      style={{ color: tone.color, fontSize: '1.15rem', lineHeight: 1.15, letterSpacing: '-0.03em' }}
                    >
                      {metric.value}
                    </Text>
                  </Paper>
                );
              })}
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
      radius="xl"
      withBorder
      padding={0}
      className={className}
      style={{
        position: 'relative',
        overflow: 'hidden',
        background: 'var(--surface-elevated)',
        backdropFilter: 'blur(16px)',
        borderColor: 'var(--border-subtle)',
        boxShadow: 'var(--shadow-card)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Box
        p="sm"
        style={{
          borderBottom: '1px solid rgba(255, 255, 255, 0.07)',
          background: 'linear-gradient(180deg, rgba(255,255,255,0.035) 0%, rgba(255,255,255,0.01) 100%)',
        }}
      >
        <Group justify="space-between" align="center" gap="sm">
          <Group gap="xs" wrap="nowrap">
            <ThemeIcon
              color="cyan"
              variant="light"
              radius="md"
              size="md"
              style={{
                background: 'rgba(30, 192, 243, 0.12)',
                color: 'var(--color-brand-200)',
                border: '1px solid rgba(30, 192, 243, 0.18)',
              }}
            >
              <Icon size={16} />
            </ThemeIcon>
            <Box>
              <Text fw={700} size="sm" style={{ lineHeight: 1.2 }}>
                {title}
              </Text>
              {description && (
                <Text size="11px" c="dimmed" mt={2} style={{ lineHeight: 1.35 }}>
                  {description}
                </Text>
              )}
            </Box>
          </Group>
          {action && <Box>{action}</Box>}
        </Group>
      </Box>
      <Box p="sm" flex={1} className={contentClassName} style={{ minHeight: 0 }}>
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
    <Center style={{ height: '100%', minHeight: 220 }} p="lg">
      <Stack align="center" gap="sm" ta="center">
        <ThemeIcon
          size={52}
          radius="xl"
          variant="light"
          color="gray"
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            color: 'var(--color-brand-200)',
          }}
        >
          <Icon size={26} />
        </ThemeIcon>
        <Box>
          <Text fw={700} size="sm">
            {title}
          </Text>
          <Text size="xs" c="dimmed" mt={4} maw={320} style={{ lineHeight: 1.45 }}>
            {description}
          </Text>
        </Box>
        {action && <Box>{action}</Box>}
      </Stack>
    </Center>
  );
}
