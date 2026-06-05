import React from "react";
import { ArrowLeft } from "lucide-react";
import { ActionIcon, Group, Text } from "@mantine/core";

export function ModeHeader({
  title,
  icon: Icon,
  onBack,
  isMobile,
  actions,
}: {
  title: string;
  icon: React.ComponentType<{ size?: number }>;
  onBack: () => void;
  isMobile: boolean;
  actions?: React.ReactNode;
}) {
  return (
    <Group justify="space-between" mb={isMobile ? "xs" : "sm"}>
      <Group gap="xs" wrap="nowrap">
        <ActionIcon
          variant="subtle"
          size={isMobile ? "md" : "lg"}
          radius="xl"
          onClick={onBack}
          style={{ color: "var(--mantine-color-cyan-3)" }}
        >
          <ArrowLeft size={18} />
        </ActionIcon>
        <Icon size={isMobile ? 18 : 20} />
        <Text fw={800} size={isMobile ? "sm" : "md"} c="white">
          {title}
        </Text>
      </Group>
      {actions && <Group gap="xs">{actions}</Group>}
    </Group>
  );
}
