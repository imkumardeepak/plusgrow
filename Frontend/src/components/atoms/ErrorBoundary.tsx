import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertCircle } from "lucide-react";
import { Paper, Text, Group } from "@mantine/core";

interface Props {
  children?: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  declare props: Readonly<Props>;

  constructor(props: Props) {
    super(props);
  }

  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <Paper
          p="md"
          radius="md"
          withBorder
          style={{
            borderColor: "rgba(239, 68, 68, 0.2)",
            background: "rgba(239, 68, 68, 0.05)",
          }}
        >
          <Group gap="xs">
            <AlertCircle size={16} color="#ef4444" />
            <Text size="xs" fw={700} c="red.4">
              Failed to render this section
            </Text>
          </Group>
          <Text size="11px" c="dimmed" mt={4} style={{ fontFamily: "monospace" }}>
            {this.state.error?.message || "Unknown error"}
          </Text>
        </Paper>
      );
    }

    return this.props.children;
  }
}
