import React from "react";
import {
  Badge,
  Box,
  Container,
  Divider,
  Group,
  Paper,
  SimpleGrid,
  Stack,
  Text,
  ThemeIcon,
  Title,
} from "@mantine/core";
import { LucideIcon } from "lucide-react";
import { Logo } from "../../atoms/Logo";

interface AuthStat {
  label: string;
  value: string;
}

interface AuthFeature {
  icon: LucideIcon;
  title: string;
  description: string;
}

interface AuthShellProps {
  badge: string;
  title: string;
  description: string;
  eyebrow: string;
  heroTitle: string;
  heroDescription: string;
  heroIcon: LucideIcon;
  stats: AuthStat[];
  features: AuthFeature[];
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export function AuthShell({
  badge,
  title,
  description,
  eyebrow,
  heroTitle,
  heroDescription,
  heroIcon: HeroIcon,
  stats,
  features,
  children,
  footer,
}: AuthShellProps) {
  return (
    <Box
      style={{
        minHeight: "100dvh",
        background:
          "radial-gradient(circle at top left, rgba(23,185,236,0.18), transparent 24%), radial-gradient(circle at bottom right, rgba(59,130,246,0.12), transparent 28%), linear-gradient(180deg, #08111d 0%, #0b1320 48%, #060c16 100%)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <Box
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(135deg, rgba(255,255,255,0.02) 0%, transparent 35%, transparent 100%)",
        }}
      />

      <Container size={1360} px={{ base: "md", md: "xl" }} py={{ base: "md", md: "xl" }}>
        <SimpleGrid cols={{ base: 1, lg: 2 }} spacing={{ base: "lg", md: "xl" }}>
          <Paper
            radius="xl"
            p={{ base: "lg", md: "xl" }}
            withBorder
            style={{
              background:
                "linear-gradient(180deg, rgba(12,21,35,0.82) 0%, rgba(8,15,26,0.9) 100%)",
              borderColor: "rgba(148,163,184,0.12)",
              backdropFilter: "blur(18px)",
              minHeight: "calc(100dvh - 48px)",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
            }}
          >
            <Stack gap="xl">
              <Group justify="space-between" align="flex-start">
                <Logo width={190} height={54} className="w-[190px] h-auto" />
                <Badge variant="light" color="cyan" radius="xl">
                  {badge}
                </Badge>
              </Group>

              <Stack gap="md" maw={560}>
                <Group gap="sm" wrap="nowrap">
                  <ThemeIcon
                    size={56}
                    radius="xl"
                    variant="gradient"
                    gradient={{ from: "cyan.4", to: "blue.7", deg: 145 }}
                    style={{ boxShadow: "var(--shadow-brand)" }}
                  >
                    <HeroIcon size={26} />
                  </ThemeIcon>
                  <Stack gap={2}>
                    <Text
                      size="xs"
                      fw={800}
                      c="cyan.3"
                      style={{ letterSpacing: "0.16em", textTransform: "uppercase" }}
                    >
                      {eyebrow}
                    </Text>
                    <Title order={1} c="white" fw={850} style={{ lineHeight: 1.05, letterSpacing: "-0.04em" }}>
                      {heroTitle}
                    </Title>
                  </Stack>
                </Group>

                <Text size="sm" c="dimmed" maw={560} style={{ lineHeight: 1.7 }}>
                  {heroDescription}
                </Text>
              </Stack>

              <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="sm">
                {stats.map((stat) => (
                  <Paper
                    key={stat.label}
                    p="md"
                    radius="xl"
                    withBorder
                    style={{
                      background: "rgba(255,255,255,0.035)",
                      borderColor: "rgba(255,255,255,0.08)",
                    }}
                  >
                    <Text
                      size="10px"
                      fw={800}
                      c="dimmed"
                      style={{ letterSpacing: "0.14em", textTransform: "uppercase" }}
                    >
                      {stat.label}
                    </Text>
                    <Text mt={8} size="xl" fw={900} c="cyan.2">
                      {stat.value}
                    </Text>
                  </Paper>
                ))}
              </SimpleGrid>
            </Stack>

            <Stack gap="sm">
              <Divider color="rgba(255,255,255,0.08)" />
              <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="sm">
                {features.map((feature) => (
                  <Paper
                    key={feature.title}
                    p="md"
                    radius="xl"
                    withBorder
                    style={{
                      background: "rgba(255,255,255,0.02)",
                      borderColor: "rgba(255,255,255,0.08)",
                    }}
                  >
                    <Stack gap="xs">
                      <ThemeIcon size={38} radius="lg" variant="light" color="cyan">
                        <feature.icon size={18} />
                      </ThemeIcon>
                      <Text fw={700} size="sm" c="white">
                        {feature.title}
                      </Text>
                      <Text size="11px" c="dimmed" style={{ lineHeight: 1.55 }}>
                        {feature.description}
                      </Text>
                    </Stack>
                  </Paper>
                ))}
              </SimpleGrid>
            </Stack>
          </Paper>

          <Paper
            radius="xl"
            p={{ base: "lg", md: "xl" }}
            withBorder
            style={{
              background:
                "linear-gradient(180deg, rgba(12,21,35,0.92) 0%, rgba(8,15,26,0.97) 100%)",
              borderColor: "rgba(148,163,184,0.12)",
              backdropFilter: "blur(18px)",
              minHeight: "calc(100dvh - 48px)",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
            }}
          >
            <Stack gap="lg" maw={520} mx="auto" w="100%">
              <Stack gap={6}>
                <Badge variant="light" color="gray" radius="xl" w="fit-content">
                  {badge}
                </Badge>
                <Title order={2} c="white" fw={850} style={{ letterSpacing: "-0.04em" }}>
                  {title}
                </Title>
                <Text size="sm" c="dimmed" style={{ lineHeight: 1.65 }}>
                  {description}
                </Text>
              </Stack>

              {children}

              {footer ? (
                <>
                  <Divider color="rgba(255,255,255,0.08)" />
                  <Box>{footer}</Box>
                </>
              ) : null}
            </Stack>
          </Paper>
        </SimpleGrid>
      </Container>
    </Box>
  );
}

export default AuthShell;
