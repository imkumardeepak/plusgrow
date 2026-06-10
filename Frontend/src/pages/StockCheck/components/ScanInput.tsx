import React, { useEffect, useRef } from "react";
import { Box, Text, TextInput } from "@mantine/core";

export function ScanInput({
  label,
  placeholder,
  value,
  onChange,
  onScan,
  icon,
  disabled,
  autoFocus,
  id,
  isMobile,
  inputRef,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (val: string) => void;
  onScan: (val: string) => void;
  icon: React.ReactNode;
  disabled?: boolean;
  autoFocus?: boolean;
  id?: string;
  isMobile: boolean;
  inputRef?: React.RefObject<HTMLInputElement | null>;
}) {
  const internalRef = useRef<HTMLInputElement>(null);
  const ref = inputRef ?? internalRef;

  useEffect(() => {
    if (autoFocus) {
      setTimeout(() => ref.current?.focus(), 50);
    }
  }, [autoFocus, ref]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && value.trim()) {
      e.preventDefault();
      onScan(value.trim());
    }
  };

  return (
    <Box>
      <Text size="10px" fw={800} c="dimmed" mb={4}>
        {label.toUpperCase()}
      </Text>
      <TextInput
        ref={ref}
        id={id}
        size={isMobile ? "md" : "sm"}
        radius="md"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.currentTarget.value)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        leftSection={icon}
        clearable
        styles={{
          input: {
            textTransform: "uppercase",
            fontFamily: "var(--font-mono)",
            fontWeight: 700,
            fontSize: isMobile ? "16px" : "13px",
          },
        }}
      />
    </Box>
  );
}
