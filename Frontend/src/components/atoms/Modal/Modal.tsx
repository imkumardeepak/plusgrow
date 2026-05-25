import React from "react";
import { AlertCircle, AlertTriangle, CheckCircle, Info } from "lucide-react";
import {
  Box,
  Group,
  Modal as MantineModal,
  Stack,
  Text,
  ThemeIcon,
} from "@mantine/core";
import { Button } from "../Button";

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl" | "xxl" | "full" | (string & {}) | number;
  showCloseButton?: boolean;
  className?: string;
  footer?: React.ReactNode;
  variant?: "default" | "danger" | "success" | "warning";
}

export interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "danger" | "warning" | "default";
  isLoading?: boolean;
  icon?: React.ReactNode;
}

const modalSizeMap: Record<string, string | number> = {
  sm: "sm",
  md: "md",
  lg: "lg",
  xl: "xl",
  xxl: "1200px",
  full: "100%",
};

function getThemeIcon(
  variant: NonNullable<ModalProps["variant"] | ConfirmDialogProps["variant"]>,
) {
  switch (variant) {
    case "danger":
      return {
        color: "red" as const,
        icon: <AlertTriangle size={18} />,
      };
    case "success":
      return {
        color: "green" as const,
        icon: <CheckCircle size={18} />,
      };
    case "warning":
      return {
        color: "yellow" as const,
        icon: <AlertCircle size={18} />,
      };
    default:
      return {
        color: "cyan" as const,
        icon: <Info size={18} />,
      };
  }
}

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  size = "md",
  showCloseButton = true,
  className,
  footer,
  variant = "default",
}: ModalProps) {
  const badge = getThemeIcon(variant);

  return (
    <MantineModal
      opened={isOpen}
      onClose={onClose}
      centered
      fullScreen={size === "full"}
      size={typeof size === "string" ? modalSizeMap[size] || size : size}
      withCloseButton={showCloseButton}
      title={
        <Group gap="sm">
          {variant !== "default" ? (
            <ThemeIcon
              variant="light"
              color={badge.color}
              radius="xl"
              size={36}
            >
              {badge.icon}
            </ThemeIcon>
          ) : null}
          <Stack gap={2}>
            <Text fw={700}>{title}</Text>
            <Text size="xs" c="dimmed">
              Fill in details below
            </Text>
          </Stack>
        </Group>
      }
      overlayProps={{
        backgroundOpacity: 0.72,
        blur: 6,
      }}
      className={className}
      styles={{
        content: {
          background:
            "linear-gradient(180deg, rgba(19,27,45,0.96) 0%, rgba(10,18,32,0.98) 100%)",
          border: "1px solid rgba(255,255,255,0.1)",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          maxHeight: "80vh",
        },
        header: {
          position: "sticky",
          top: 0,
          zIndex: 20,
          background:
            "linear-gradient(180deg, rgba(16,24,40,0.99) 0%, rgba(12,20,35,0.98) 100%)",
          borderBottom: "1px solid rgba(148,163,184,0.18)",
          boxShadow: "0 10px 26px rgba(0,0,0,0.28)",
        },
        body: {
          paddingTop: 16,
          overflowY: "auto",
          flex: 1,
        },
      }}
    >
      <Stack gap="lg">
        <Box>{children}</Box>
        {footer ? <Box>{footer}</Box> : null}
      </Stack>
    </MantineModal>
  );
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "danger",
  isLoading = false,
  icon,
}: ConfirmDialogProps) {
  const badge = getThemeIcon(variant);

  return (
    <MantineModal
      opened={isOpen}
      onClose={onClose}
      centered
      size="sm"
      withCloseButton={false}
      overlayProps={{
        backgroundOpacity: 0.72,
        blur: 6,
      }}
      styles={{
        content: {
          background:
            "linear-gradient(180deg, rgba(19,27,45,0.96) 0%, rgba(10,18,32,0.98) 100%)",
          border: "1px solid rgba(255,255,255,0.1)",
        },
        header: {
          display: "none",
        },
      }}
    >
      <Stack gap="lg">
        <Group align="flex-start" wrap="nowrap">
          <ThemeIcon variant="light" color={badge.color} radius="xl" size={46}>
            {icon || badge.icon}
          </ThemeIcon>
          <Stack gap={4}>
            <Text fw={700}>{title}</Text>
            <Text size="sm" c="dimmed">
              {message}
            </Text>
          </Stack>
        </Group>

        <Group grow>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            {cancelText}
          </Button>
          <Button
            variant={
              variant === "warning"
                ? "warning"
                : variant === "default"
                  ? "primary"
                  : "destructive"
            }
            onClick={onConfirm}
            loading={isLoading}
          >
            {confirmText}
          </Button>
        </Group>
      </Stack>
    </MantineModal>
  );
}

Modal.displayName = "Modal";
ConfirmDialog.displayName = "ConfirmDialog";

export default Modal;
