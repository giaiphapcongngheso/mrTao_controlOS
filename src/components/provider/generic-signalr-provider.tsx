// src/components/GenericSignalRProvider.tsx

import { getConfig } from '@/lib/config';
import { useAuthStore } from '@/stores/auth-store';
import * as signalR from '@microsoft/signalr';
import { useEffect, useState } from 'react';

// Định nghĩa props cho provider chung
interface GenericSignalRProviderProps {
  children: React.ReactNode;
  hubName: string; // Tên hub (ví dụ: "redisTtlHub", "chatHub")
  Context: React.Context<signalR.HubConnection | null>; // Context để cung cấp connection
}

/**
 * Lấy danh sách groupIds từ auth store (employeeId + organizationId)
 * để join vào SignalR groups sau khi connect/reconnect
 */
const getGroupIdsFromStore = (): string[] => {
  const state = useAuthStore.getState();
  const groups: string[] = [];

  // Employee group
  const employeeId = state.employeeInfo?.id || state.user?.employeeId;
  if (employeeId) groups.push(employeeId);

  // Organization group
  const orgId = state.employeeInfo?.organization?.id || state.organization?.id;
  if (orgId) groups.push(orgId);

  return groups;
};

/**
 * Gọi JoinGroups trên Hub để client join vào các group tương ứng
 */
const joinHubGroups = async (conn: signalR.HubConnection, hubName: string) => {
  const groupIds = getGroupIdsFromStore();
  if (groupIds.length > 0) {
    try {
      await conn.invoke('JoinGroups', groupIds);
      console.log(`[SignalR:${hubName}] 📡 Joined groups:`, groupIds);
    } catch (err) {
      console.error(`[SignalR:${hubName}] ❌ Failed to join groups:`, err);
    }
  } else {
    console.warn(
      `[SignalR:${hubName}] ⚠️ No groups to join (no employeeId/organizationId in store)`,
    );
  }
};

// File này chỉ export duy nhất component
export const GenericSignalRProvider = ({
  children,
  hubName,
  Context,
}: GenericSignalRProviderProps) => {
  const cfg = getConfig();
  const SIGNALR_URL = cfg.VITE_API_URL || 'http://localhost:5000';
  const [connection, setConnection] = useState<signalR.HubConnection | null>(null);
  const accessToken = useAuthStore((state) => state.accessToken);

  useEffect(() => {
    if (accessToken) {
      // Sử dụng `hubName` từ props
      const hubUrl = `${SIGNALR_URL}/${hubName}`;

      // Track reconnect "cycles" (disconnect -> reconnect sequence).
      // SignalR resets previousRetryCount after a successful reconnect, so we need our own counter
      // to avoid infinite connect -> server closes -> reconnect loops.
      let reconnectCycleCount = 0;

      const newConnection = new signalR.HubConnectionBuilder()
        .withUrl(hubUrl, {
          accessTokenFactory: () => useAuthStore.getState().accessToken || '',
        })
        .withAutomaticReconnect({
          nextRetryDelayInMilliseconds: (retryContext) => {
            // Exponential backoff: 0s, 2s, 10s, 30s, then 30s
            // previousRetryCount === 0 means a new reconnect cycle is starting.
            if (retryContext.previousRetryCount === 0) {
              reconnectCycleCount += 1;

              // Stop auto reconnect after a few cycles to prevent infinite loops
              // when server accepts WS then closes immediately with error.
              if (reconnectCycleCount > 3) {
                console.error(
                  `[SignalR:${hubName}] ❌ Too many reconnect cycles. Stopping automatic reconnect.`,
                );
                return null;
              }

              return 0;
            }
            if (retryContext.previousRetryCount === 1) return 2000;
            if (retryContext.previousRetryCount === 2) return 10000;

            return 30000;
          },
        })
        .configureLogging(signalR.LogLevel.Information)
        .build();

      // Configure server timeout to match backend settings
      // Backend: KeepAliveInterval = 2 minutes, ClientTimeoutInterval = 8 minutes
      // Set server timeout to 10 minutes (600000ms) to be safe
      newConnection.serverTimeoutInMilliseconds = 600000; // 10 minutes

      setConnection(newConnection);

      // Add connection state handlers
      newConnection.onclose((error) => {
        console.error(`[SignalR:${hubName}] Connection closed:`, error);
      });

      newConnection.onreconnecting((error) => {
        console.warn(`[SignalR:${hubName}] Reconnecting:`, error);
      });

      newConnection.onreconnected(async (connectionId) => {
        console.log(`[SignalR:${hubName}] Reconnected. ConnectionId:`, connectionId);
        await joinHubGroups(newConnection, hubName);
      });

      newConnection
        .start()
        .then(async () => {
          console.log(`[SignalR:${hubName}] ✅ Connected successfully`);
          console.log(`[SignalR:${hubName}] ConnectionId:`, newConnection.connectionId);
          console.log(`[SignalR:${hubName}] Hub URL:`, hubUrl);

          // Join groups sau khi connect thành công
          await joinHubGroups(newConnection, hubName);
        })
        .catch((err) => {
          console.error(`[SignalR:${hubName}] ❌ Connection error:`, err);
          console.error(`[SignalR:${hubName}] Error details:`, {
            message: err.message,
            stack: err.stack,
            hubUrl,
          });
        });

      return () => {
        newConnection.stop().then(() => {
          console.log(`SignalR disconnected from: ${hubName}`);
          setConnection(null);
        });
      };
    }
    // Dependency vẫn là accessToken,
    // hubName và Context không nên thay đổi trong runtime
  }, [accessToken, hubName, Context, SIGNALR_URL]);

  // Cung cấp connection cho Context tương ứng
  return <Context.Provider value={connection}>{children}</Context.Provider>;
};
