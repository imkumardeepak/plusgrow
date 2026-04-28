import React, { memo, useMemo } from "react";
import { useWms } from "../context/WmsContext";
import {
  Grid,
  Card,
  Text,
  Group,
  Stack,
  Title,
  Badge,
  Skeleton,
  SimpleGrid,
  Paper,
  Box,
  ScrollArea,
  ActionIcon,
  Progress,
  ThemeIcon,
  Center,
} from "@mantine/core";
import {
  IconPackage,
  IconArrowDownLeft,
  IconArrowUpRight,
  IconBox,
  IconClock,
  IconActivity,
  IconArrowRight,
  IconTrendingUp,
  IconChartBar,
} from "@tabler/icons-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";

export const Dashboard = memo(function Dashboard() {
  const {
    products,
    purchaseInvoices,
    salesInvoices,
    stock,
    activities,
    isLoading,
  } = useWms();

  const stats = useMemo(() => {
    const totalInwards = purchaseInvoices.reduce(
      (acc, curr) => acc + curr.quantity,
      0,
    );
    const totalOutwards = salesInvoices.reduce(
      (acc, curr) => acc + curr.quantity,
      0,
    );
    const totalStock = stock.reduce((acc, curr) => acc + curr.quantity, 0);
    const pendingPutAway = purchaseInvoices.filter(
      (pi) => pi.status === "Open",
    ).length;
    const pendingDispatch = salesInvoices.filter(
      (si) => si.status === "Open",
    ).length;

    return {
      totalInwards,
      totalOutwards,
      totalStock,
      totalSKUs: products.length,
      pendingPutAway,
      pendingDispatch,
    };
  }, [purchaseInvoices, salesInvoices, stock, products.length]);

  const chartData = useMemo(
    () => [
      {
        name: "Receiving",
        quantity: stats.totalInwards,
        color: "var(--mantine-color-blue-6)",
      },
      {
        name: "Dispatch",
        quantity: stats.totalOutwards,
        color: "var(--mantine-color-teal-6)",
      },
      {
        name: "Inventory",
        quantity: stats.totalStock,
        color: "var(--mantine-color-cyan-6)",
      },
    ],
    [stats],
  );

  const recentActivities = useMemo(() => activities.slice(0, 8), [activities]);

  const totalTasks = stats.pendingPutAway + stats.pendingDispatch;
  const completedTasks =
    purchaseInvoices.length -
    stats.pendingPutAway +
    (salesInvoices.length - stats.pendingDispatch);
  const totalPotentialTasks = purchaseInvoices.length + salesInvoices.length;
  const overallProgress =
    totalPotentialTasks > 0
      ? Math.round((completedTasks / totalPotentialTasks) * 100)
      : 100;

  if (isLoading) {
    return (
      <Stack gap="md">
        <Skeleton height={60} radius="md" />
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} gap="md">
          <Skeleton height={120} radius="md" />
          <Skeleton height={120} radius="md" />
          <Skeleton height={120} radius="md" />
          <Skeleton height={120} radius="md" />
        </SimpleGrid>
        <Grid gutter="md">
          <Grid.Col span={{ base: 12, lg: 8 }}>
            <Skeleton height={400} radius="md" />
          </Grid.Col>
          <Grid.Col span={{ base: 12, lg: 4 }}>
            <Skeleton height={400} radius="md" />
          </Grid.Col>
        </Grid>
      </Stack>
    );
  }

  const statCards = [
    {
      title: "Total Inbound Units",
      value: stats.totalInwards.toLocaleString(),
      hint: "Receiving volume",
      icon: IconArrowDownLeft,
      color: "blue",
      badge: "+12%",
    },
    {
      title: "Total Outbound Units",
      value: stats.totalOutwards.toLocaleString(),
      hint: "Dispatch volume",
      icon: IconArrowUpRight,
      color: "teal",
      badge: "+8%",
    },
    {
      title: "Registered SKUs",
      value: stats.totalSKUs.toLocaleString(),
      hint: "Product catalog",
      icon: IconPackage,
      color: "cyan",
      badge: "Live",
    },
    {
      title: "Current Stock",
      value: stats.totalStock.toLocaleString(),
      hint: "Warehouse inventory",
      icon: IconBox,
      color: "indigo",
      badge: `${totalTasks} open`,
    },
  ];

  return (
    <Stack gap="md">
      {/* Header Status Bar */}
      <Paper
        p="md"
        withBorder
        style={{
          background: "rgba(10, 18, 32, 0.4)",
          backdropFilter: "blur(10px)",
          borderColor: "rgba(255, 255, 255, 0.05)",
        }}
      >
        <Group justify="space-between">
          <Group gap="md">
            <ThemeIcon
              size={44}
              radius="md"
              variant="gradient"
              gradient={{ from: "blue", to: "cyan" }}
            >
              <IconActivity size={24} />
            </ThemeIcon>
            <Box>
              <Text fw={700} size="sm">
                System Operational
              </Text>
              <Text size="xs" c="dimmed">
                Live snapshot of warehouse logistics and task flow telemetry.
              </Text>
            </Box>
          </Group>
          <Group gap="xs">
            <Badge variant="dot" color="blue" size="lg">
              Optimal
            </Badge>
            <Badge variant="outline" color="gray" size="lg">
              Pending: {totalTasks}
            </Badge>
            <Box style={{ width: 100 }}>
              <Text size="xs" fw={700} ta="right" mb={4}>
                {overallProgress}%
              </Text>
              <Progress
                value={overallProgress}
                size="xs"
                color="blue"
                striped
                animate
              />
            </Box>
          </Group>
        </Group>
      </Paper>

      {/* Primary Stats Grid */}
      <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} gap="md">
        {statCards.map((stat) => (
          <Card
            key={stat.title}
            p="md"
            withBorder
            style={{
              background: "rgba(255, 255, 255, 0.02)",
              overflow: "hidden",
              position: "relative",
            }}
          >
            <Box
              style={{
                position: "absolute",
                top: -10,
                right: -10,
                opacity: 0.05,
              }}
            >
              <stat.icon size={100} />
            </Box>
            <Group justify="space-between" mb="xs">
              <ThemeIcon
                color={stat.color}
                variant="light"
                size="lg"
                radius="md"
              >
                <stat.icon size={20} />
              </ThemeIcon>
              <Badge variant="light" color={stat.color}>
                {stat.badge}
              </Badge>
            </Group>
            <Text
              size="xs"
              fw={800}
              c="dimmed"
              style={{ letterSpacing: "1px", textTransform: "uppercase" }}
            >
              {stat.title}
            </Text>
            <Group align="flex-end" gap="xs" mt={5}>
              <Text size="xl" fw={900}>
                {stat.value}
              </Text>
              <Text size="xs" c="dimmed" pb={4}>
                {stat.hint}
              </Text>
            </Group>
          </Card>
        ))}
      </SimpleGrid>

      {/* Task and Analytics Row */}
      <Grid gutter="md">
        <Grid.Col span={{ base: 12, lg: 8 }}>
          <Stack gap="md">
            <Grid gutter="md">
              <Grid.Col span={{ base: 12, sm: 6 }}>
                <Link to="/putaway" className="no-underline">
                  <Card
                    withBorder
                    p="md"
                    style={{
                      cursor: "pointer",
                      background: "rgba(255, 255, 255, 0.01)",
                    }}
                  >
                    <Group justify="space-between">
                      <Group gap="md">
                        <ThemeIcon
                          color="orange"
                          variant="light"
                          size={48}
                          radius="lg"
                        >
                          <IconClock size={28} />
                        </ThemeIcon>
                        <Box>
                          <Text
                            size="xs"
                            fw={800}
                            c="dimmed"
                            style={{ letterSpacing: "1px" }}
                          >
                            PENDING PUT-AWAY
                          </Text>
                          <Text size="xl" fw={900}>
                            {stats.pendingPutAway}
                          </Text>
                        </Box>
                      </Group>
                      <ActionIcon variant="light" color="orange" radius="xl">
                        <IconArrowRight size={18} />
                      </ActionIcon>
                    </Group>
                  </Card>
                </Link>
              </Grid.Col>
              <Grid.Col span={{ base: 12, sm: 6 }}>
                <Link to="/dispatch" className="no-underline">
                  <Card
                    withBorder
                    p="md"
                    style={{
                      cursor: "pointer",
                      background: "rgba(255, 255, 255, 0.01)",
                    }}
                  >
                    <Group justify="space-between">
                      <Group gap="md">
                        <ThemeIcon
                          color="blue"
                          variant="light"
                          size={48}
                          radius="lg"
                        >
                          <IconPackage size={28} />
                        </ThemeIcon>
                        <Box>
                          <Text
                            size="xs"
                            fw={800}
                            c="dimmed"
                            style={{ letterSpacing: "1px" }}
                          >
                            PENDING DISPATCH
                          </Text>
                          <Text size="xl" fw={900}>
                            {stats.pendingDispatch}
                          </Text>
                        </Box>
                      </Group>
                      <ActionIcon variant="light" color="blue" radius="xl">
                        <IconArrowRight size={18} />
                      </ActionIcon>
                    </Group>
                  </Card>
                </Link>
              </Grid.Col>
            </Grid>

            {/* Chart Area */}
            <Card
              withBorder
              p="md"
              style={{ background: "rgba(255, 255, 255, 0.01)" }}
            >
              <Group justify="space-between" mb="xl">
                <Group gap="xs">
                  <IconChartBar size={20} color="var(--mantine-color-blue-4)" />
                  <Text fw={700}>Volume Analytics</Text>
                </Group>
                <Badge variant="outline">30 Days</Badge>
              </Group>
              <Box style={{ height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={chartData}
                    margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="rgba(255,255,255,0.05)"
                    />
                    <XAxis
                      dataKey="name"
                      axisLine={false}
                      tickLine={false}
                      tick={{
                        fill: "var(--mantine-color-dark-2)",
                        fontSize: 11,
                      }}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{
                        fill: "var(--mantine-color-dark-2)",
                        fontSize: 11,
                      }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "rgba(20, 28, 45, 0.95)",
                        border: "1px solid rgba(255,255,255,0.1)",
                        borderRadius: "8px",
                        backdropFilter: "blur(8px)",
                      }}
                      cursor={{ fill: "rgba(255,255,255,0.03)" }}
                    />
                    <Bar dataKey="quantity" radius={[4, 4, 0, 0]} barSize={40}>
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </Box>
            </Card>
          </Stack>
        </Grid.Col>

        {/* Live Stream */}
        <Grid.Col span={{ base: 12, lg: 4 }}>
          <Card
            withBorder
            p={0}
            style={{
              height: "100%",
              display: "flex",
              flexDirection: "column",
              background: "rgba(255, 255, 255, 0.01)",
            }}
          >
            <Paper
              p="md"
              style={{
                background: "transparent",
                borderBottom: "1px solid rgba(255,255,255,0.05)",
              }}
            >
              <Group justify="space-between">
                <Group gap="xs">
                  <IconActivity size={18} color="var(--mantine-color-blue-4)" />
                  <Text fw={700}>Live Event Stream</Text>
                </Group>
                <Box
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    backgroundColor: "var(--mantine-color-green-6)",
                    boxShadow: "0 0 10px var(--mantine-color-green-6)",
                  }}
                />
              </Group>
            </Paper>
            <ScrollArea flex={1} p="md">
              <Stack gap="xs">
                {recentActivities.map((activity, idx) => (
                  <Paper
                    key={activity.id}
                    p="xs"
                    withBorder
                    style={{
                      background: "rgba(255, 255, 255, 0.02)",
                      borderColor: "rgba(255, 255, 255, 0.05)",
                    }}
                  >
                    <Group gap="sm" wrap="nowrap">
                      <ThemeIcon
                        size="md"
                        radius="md"
                        variant="light"
                        color={
                          activity.type === "Inward"
                            ? "blue"
                            : activity.type === "Outward"
                              ? "green"
                              : "gray"
                        }
                      >
                        {activity.type === "Inward" ? (
                          <IconArrowDownLeft size={16} />
                        ) : (
                          <IconBox size={16} />
                        )}
                      </ThemeIcon>
                      <Box flex={1}>
                        <Group justify="space-between" mb={2}>
                          <Badge
                            size="xs"
                            variant="outline"
                            color={activity.type === "Inward" ? "blue" : "gray"}
                          >
                            {activity.type}
                          </Badge>
                          <Text size="10px" c="dimmed" fontFamily="monospace">
                            {new Date(activity.date).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </Text>
                        </Group>
                        <Text size="sm" fw={600} lineClamp={1}>
                          {activity.description}
                        </Text>
                      </Box>
                    </Group>
                  </Paper>
                ))}
                {recentActivities.length === 0 && (
                  <Center py={50}>
                    <Stack align="center" gap="xs">
                      <IconActivity
                        size={32}
                        color="var(--mantine-color-dark-4)"
                      />
                      <Text size="xs" c="dimmed">
                        No recent activity detected.
                      </Text>
                    </Stack>
                  </Center>
                )}
              </Stack>
            </ScrollArea>
          </Card>
        </Grid.Col>
      </Grid>
    </Stack>
  );
});

export default Dashboard;
