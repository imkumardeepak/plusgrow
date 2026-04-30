import React, {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  HubConnectionBuilder,
  HubConnectionState,
  LogLevel,
} from "@microsoft/signalr";

import { toast } from "../lib/toast";
import { useAuth } from "./AuthContext";

export interface RealtimeNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  severity: "success" | "error" | "warning" | "info" | string;
  createdAt: string;
  data: Record<string, unknown>;
  read: boolean;
}

type IncomingRealtimeNotification = Omit<RealtimeNotification, "id" | "read">;

interface NotificationContextType {
  notifications: RealtimeNotification[];
  unreadCount: number;
  connectionStatus: "connected" | "connecting" | "disconnected" | "error";
  markAllRead: () => void;
  clearNotifications: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(
  undefined,
);

const apiBaseUrl = import.meta.env.VITE_API_URL || "http://localhost:5179/api";
const hubUrl = apiBaseUrl.replace(/\/api\/?$/, "") + "/hubs/notifications";

function showRealtimeToast(notification: IncomingRealtimeNotification) {
  const title = notification.title || "Notification";
  const description = notification.message || "New activity received.";

  if (notification.severity === "success") {
    toast.success(title, { description });
    return;
  }

  if (notification.severity === "warning") {
    toast.warning(title, { description });
    return;
  }

  if (notification.severity === "error") {
    toast.error(title, { description });
    return;
  }

  toast.info(title, { description });
}

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const { isAuthenticated } = useAuth();
  const [notifications, setNotifications] = useState<RealtimeNotification[]>(
    [],
  );
  const [connectionStatus, setConnectionStatus] =
    useState<NotificationContextType["connectionStatus"]>("disconnected");

  useEffect(() => {
    if (!isAuthenticated) {
      setNotifications([]);
      setConnectionStatus("disconnected");
      return;
    }

    setConnectionStatus("connecting");
    const token = localStorage.getItem("auth_token");
    if (!token) {
      setConnectionStatus("error");
      return;
    }

    const connection = new HubConnectionBuilder()
      .withUrl(hubUrl, {
        accessTokenFactory: () => localStorage.getItem("auth_token") ?? "",
      })
      .withAutomaticReconnect()
      .configureLogging(LogLevel.Warning)
      .build();

    connection.onreconnecting(() => {
      setConnectionStatus("connecting");
    });

    connection.onreconnected(() => {
      setConnectionStatus("connected");
    });

    connection.onclose(() => {
      setConnectionStatus("disconnected");
    });

    connection.on(
      "ReceiveNotification",
      (notification: IncomingRealtimeNotification & Record<string, unknown>) => {
        const title =
          notification.title ?? (notification.Title as string | undefined);
        const message =
          notification.message ?? (notification.Message as string | undefined);
        const severity =
          notification.severity ?? (notification.Severity as string | undefined);
        const createdAt =
          notification.createdAt ??
          (notification.CreatedAt as string | undefined);
        const data =
          notification.data ??
          (notification.Data as Record<string, unknown> | undefined);

        const receivedNotification: RealtimeNotification = {
          id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
          type:
            notification.type ?? (notification.Type as string | undefined) ?? "",
          title: title || "Notification",
          message: message || "New activity received.",
          severity: severity || "info",
          createdAt: createdAt || new Date().toISOString(),
          data: data ?? {},
          read: false,
        };

        setNotifications((current) => [
          receivedNotification,
          ...current.slice(0, 19),
        ]);
        showRealtimeToast(receivedNotification);
      },
    );

    connection
      .start()
      .then(() => {
        setConnectionStatus("connected");
      })
      .catch((error) => {
        setConnectionStatus("error");
        toast.error("Live notifications not connected", {
          description:
            error instanceof Error ? error.message : "SignalR connection failed.",
        });
      console.warn("Realtime notification connection failed", error);
      });

    return () => {
      connection.off("ReceiveNotification");
      if (connection.state !== HubConnectionState.Disconnected) {
        void connection.stop();
      }
    };
  }, [isAuthenticated]);

  const markAllRead = useCallback(() => {
    setNotifications((current) =>
      current.map((notification) => ({ ...notification, read: true })),
    );
  }, []);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  const value = useMemo(
    () => ({
      notifications,
      unreadCount: notifications.filter((notification) => !notification.read)
        .length,
      connectionStatus,
      markAllRead,
      clearNotifications,
    }),
    [clearNotifications, connectionStatus, markAllRead, notifications],
  );

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error("useNotifications must be used within NotificationProvider");
  }
  return context;
};
