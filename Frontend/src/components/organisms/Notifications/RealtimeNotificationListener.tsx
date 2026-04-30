import { useEffect } from "react";
import {
  HubConnectionBuilder,
  HubConnectionState,
  LogLevel,
} from "@microsoft/signalr";

import { toast } from "@/lib/toast";

interface RealtimeNotification {
  type: string;
  title: string;
  message: string;
  severity: "success" | "error" | "warning" | "info" | string;
  createdAt: string;
  data: Record<string, unknown>;
}

const apiBaseUrl = import.meta.env.VITE_API_URL || "http://localhost:5179/api";
const hubUrl = apiBaseUrl.replace(/\/api\/?$/, "") + "/hubs/notifications";

export function RealtimeNotificationListener() {
  useEffect(() => {
    const token = localStorage.getItem("auth_token");
    if (!token) {
      return;
    }

    const connection = new HubConnectionBuilder()
      .withUrl(hubUrl, {
        accessTokenFactory: () => localStorage.getItem("auth_token") ?? "",
      })
      .withAutomaticReconnect()
      .configureLogging(LogLevel.Warning)
      .build();

    connection.on("ReceiveNotification", (notification: RealtimeNotification) => {
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
    });

    connection.start().catch((error) => {
      console.warn("Realtime notification connection failed", error);
    });

    return () => {
      connection.off("ReceiveNotification");
      if (connection.state !== HubConnectionState.Disconnected) {
        void connection.stop();
      }
    };
  }, []);

  return null;
}
