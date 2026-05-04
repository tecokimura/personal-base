// Relative paths — Next.js rewrites proxy /api/* → backend

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json', ...init?.headers },
    ...init,
  });

  if (!res.ok) {
    let message = res.statusText;
    try {
      const body = (await res.json()) as { message?: string };
      if (body.message) message = Array.isArray(body.message) ? body.message.join(', ') : body.message;
    } catch {
      // ignore parse error
    }
    throw new ApiError(res.status, message);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

// ── Types ────────────────────────────────────────────────────

export interface MeResponse {
  id: number;
  tenantId: number;
  employeeId: number;
  status: number;
  lastLoggedInAt: string | null;
}

export interface OrganizationView {
  id: number;
  tenantId: number;
  organizationName: string;
  organizationCode: string | null;
  parentOrganizationId: number | null;
  displayOrder: number;
  isActive: boolean;
  createdAt: string;
}

export interface OrgChartNode {
  organizationId: number;
  organizationName: string;
  organizationCode: string | null;
  parentOrganizationId: number | null;
  childrenCount: number;
  memberCount: number;
  primaryLeader: { employeeId: number; displayName: string; leaderType: number } | null;
  children: OrgChartNode[];
}

export interface EmployeeListItem {
  id: number;
  tenantId: number;
  fullName: string;
  displayName: string | null;
  email: string | null;
  employeeNumber?: string | null;
  birthDate?: string | null;
  photoStorageKey: string | null;
  profileFreeText: string | null;
}

export interface EmploymentView {
  id: number;
  organizationId: number;
  positionName: string | null;
  isPrimaryAssignment: boolean;
  startDate: string;
  endDate: string | null;
  status: number;
  employmentType?: number;
}

export interface EmployeeDetail extends EmployeeListItem {
  primaryEmployment: EmploymentView | null;
  employments: EmploymentView[];
}

export interface WorkHistory {
  id: number;
  tenantId: number;
  employeeId: number;
  yearMonthFrom: string;
  yearMonthTo: string | null;
  isCurrent: boolean;
  workSummary: string;
  toolsUsed: string | null;
  roleName: string | null;
  teamSize: number | null;
  projectCode: string | null;
  updatedBy: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface WorkHistoryInput {
  yearMonthFrom: string;
  yearMonthTo?: string;
  isCurrent?: boolean;
  workSummary: string;
  toolsUsed?: string;
  roleName?: string;
  teamSize?: number;
  projectCode?: string;
}

// ── API ──────────────────────────────────────────────────────

export const api = {
  auth: {
    login: (body: { tenantId: number; loginIdentifier: string; password: string }) =>
      apiFetch<MeResponse>('/auth/login', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    me: () => apiFetch<MeResponse>('/auth/me'),
    logout: () => apiFetch<{ message: string }>('/auth/logout', { method: 'POST' }),
  },

  organizations: {
    list: () => apiFetch<OrganizationView[]>('/organizations'),
  },

  orgChart: {
    tree: () => apiFetch<OrgChartNode[]>('/org-chart/tree'),
  },

  employees: {
    list: () => apiFetch<EmployeeListItem[]>('/employees'),
    get: (id: number) => apiFetch<EmployeeDetail>(`/employees/${id}`),
  },

  workHistories: {
    list: (employeeId: number) =>
      apiFetch<WorkHistory[]>(`/employees/${employeeId}/work-histories`),
    create: (employeeId: number, body: WorkHistoryInput) =>
      apiFetch<WorkHistory>(`/employees/${employeeId}/work-histories`, {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    update: (id: number, body: Partial<WorkHistoryInput>) =>
      apiFetch<WorkHistory>(`/work-histories/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      }),
    remove: (id: number) =>
      apiFetch<void>(`/work-histories/${id}`, { method: 'DELETE' }),
  },
};
