import api from "./authApi";

export interface AuditLogRecord {
  id: number;
  userId: number | null;
  username: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  oldValues: string | null;
  newValues: string | null;
  details: string | null;
  timestamp: string;
}

export interface AuditLogQueryDto {
  page?: number;
  pageSize?: number;
  actionType?: string;
  entityType?: string;
  username?: string;
  startDate?: string;
  endDate?: string;
}

export interface AuditLogResponse {
  data: AuditLogRecord[];
  page: number;
  pageSize: number;
  total: number;
}

export const auditLogApi = {
  getLogs: async (query: AuditLogQueryDto): Promise<AuditLogResponse> => {
    const params = new URLSearchParams();
    if (query.page) params.append("page", query.page.toString());
    if (query.pageSize) params.append("pageSize", query.pageSize.toString());
    if (query.actionType) params.append("actionType", query.actionType);
    if (query.entityType) params.append("entityType", query.entityType);
    if (query.username) params.append("username", query.username);
    if (query.startDate) params.append("startDate", query.startDate);
    if (query.endDate) params.append("endDate", query.endDate);

    const response = await api.get<AuditLogResponse>(`/AuditLogs?${params.toString()}`);
    return response.data;
  },
};
