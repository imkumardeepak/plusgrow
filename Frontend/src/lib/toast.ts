import React from "react";
import { notifications } from "@mantine/notifications";

interface ToastOptions {
  description?: string;
  duration?: number;
  icon?: React.ReactNode;
}

interface ToastPromiseMessages<T> {
  loading: string;
  success: string | ((value: T) => string);
  error: string | ((error: unknown) => string);
}

const DEFAULT_TOAST_DURATION = 1000;

function showToast(
  color: "green" | "red" | "blue" | "yellow",
  message: string,
  options?: ToastOptions
) {
  notifications.show({
    color,
    icon: options?.icon,
    autoClose: options?.duration ?? DEFAULT_TOAST_DURATION,
    title: options?.description ? message : undefined,
    message: options?.description ?? message,
  });
}

export const toast = {
  success(message: string, options?: ToastOptions) {
    showToast("green", message, options);
  },
  error(message: string, options?: ToastOptions) {
    showToast("red", message, options);
  },
  info(message: string, options?: ToastOptions) {
    showToast("blue", message, options);
  },
  warning(message: string, options?: ToastOptions) {
    showToast("yellow", message, options);
  },
  async promise<T>(promise: Promise<T>, messages: ToastPromiseMessages<T>) {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2)}`;

    notifications.show({
      id,
      loading: true,
      autoClose: false,
      color: "blue",
      message: messages.loading,
    });

    try {
      const result = await promise;
      notifications.update({
        id,
        loading: false,
        autoClose: DEFAULT_TOAST_DURATION,
        color: "green",
        message: typeof messages.success === "function" ? messages.success(result) : messages.success,
      });
      return result;
    } catch (error) {
      notifications.update({
        id,
        loading: false,
        autoClose: DEFAULT_TOAST_DURATION,
        color: "red",
        message: typeof messages.error === "function" ? messages.error(error) : messages.error,
      });
      throw error;
    }
  },
};
