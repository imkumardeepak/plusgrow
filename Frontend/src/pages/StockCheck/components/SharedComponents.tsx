import React from "react";
import {
  AlertTriangle,
  ExternalLink,
} from "lucide-react";
import {
  Group,
  Text,
} from "@mantine/core";

/* ─── Info ─── */

export function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <Text size="9px" fw={800} c="dimmed">{label.toUpperCase()}</Text>
      <Text size="12px" fw={700} mt={2} truncate>{value}</Text>
    </div>
  );
}

/* ─── MetricLabel ─── */

export function MetricLabel({
  icon: Icon,
  label,
}: {
  icon: React.ComponentType<{ size?: number; color?: string }>;
  label: string;
}) {
  return (
    <Group gap={6} wrap="nowrap">
      <Icon size={13} color="var(--mantine-color-cyan-4)" />
      <Text size="10px" fw={800} c="dimmed">{label.toUpperCase()}</Text>
    </Group>
  );
}

/* ─── MasterLink ─── */

export function MasterLink({
  children,
  href,
  onClick,
  mono = false,
  size = "12px",
  weight = 800,
  className,
}: {
  children: React.ReactNode;
  href?: string;
  onClick?: () => void;
  mono?: boolean;
  size?: string;
  weight?: number;
  className?: string;
}) {
  return (
    <Text
      component={onClick ? "button" : "a"}
      onClick={onClick}
      href={href}
      target={href ? "_blank" : undefined}
      rel={href ? "noreferrer" : undefined}
      size={size}
      fw={weight}
      ff={mono ? "monospace" : undefined}
      className={className}
      style={{
        color: "var(--mantine-color-cyan-3)",
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        maxWidth: "100%",
        textDecoration: "none",
        cursor: "pointer",
        background: "none",
        border: "none",
        padding: 0,
        textAlign: "left",
      }}
    >
      <span className="truncate">{children}</span>
      <ExternalLink size={12} />
    </Text>
  );
}

/* ─── ReferenceLink ─── */

export function ReferenceLink({
  icon: Icon,
  label,
  value,
  href,
  onClick,
  isButton,
}: {
  icon: React.ComponentType<{ size?: number; color?: string }>;
  label: string;
  value: string;
  href?: string;
  onClick?: () => void;
  isButton?: boolean;
}) {
  const inner = (
    <>
      <Group gap={7} wrap="nowrap" className="min-w-0">
        <Icon size={14} color="var(--mantine-color-cyan-4)" />
        <div className="min-w-0">
          <Text size="9px" fw={800} c="dimmed">{label.toUpperCase()}</Text>
          <Text size="11px" fw={800} c="cyan.3" truncate>{value}</Text>
        </div>
      </Group>
      <ExternalLink size={13} color="var(--mantine-color-cyan-4)" />
    </>
  );

  if (isButton || onClick) {
    return (
      <button
        onClick={onClick}
        type="button"
        className="flex items-center justify-between gap-2 rounded-md border border-cyan-400/10 bg-slate-950/30 px-2 py-2 no-underline transition hover:border-cyan-300/30 hover:bg-cyan-400/10 w-full text-left cursor-pointer"
      >
        {inner}
      </button>
    );
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="flex items-center justify-between gap-2 rounded-md border border-cyan-400/10 bg-slate-950/30 px-2 py-2 no-underline transition hover:border-cyan-300/30 hover:bg-cyan-400/10"
    >
      {inner}
    </a>
  );
}

/* ─── EmptyInline ─── */

export function EmptyInline({ message }: { message: string }) {
  return (
    <Group gap="sm" mt="xs" wrap="nowrap" className="rounded-md border border-slate-700/60 px-2 py-2">
      <AlertTriangle size={15} color="var(--mantine-color-yellow-4)" />
      <Text size="xs" c="dimmed">{message}</Text>
    </Group>
  );
}
