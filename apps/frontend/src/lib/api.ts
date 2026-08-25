// Relative paths — Next.js rewrites proxy /api/* → backend

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

async function handleResponse<T>(res: Response): Promise<T> {
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
  const text = await res.text();
  if (!text) return null as T;
  return JSON.parse(text) as T;
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json', ...init?.headers },
    ...init,
  });
  return handleResponse<T>(res);
}

async function apiFetchUpload<T>(path: string, formData: FormData): Promise<T> {
  const res = await fetch(`/api${path}`, {
    credentials: 'same-origin',
    method: 'POST',
    body: formData,
  });
  return handleResponse<T>(res);
}

// ── Types ────────────────────────────────────────────────────

export interface MeResponse {
  id: number;
  tenantId: number;
  tenantName: string;
  employeeId: number;
  employeeName: string;
  employeeNumber: string | null;
  status: number;
  lastLoggedInAt: string | null;
  roleTypes: number[];
  twoFactorPending: boolean;
  twoFactorSetupRequired: boolean;
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

export interface EmployeeCard {
  employeeId: number;
  employeeNumber: string | null;
  displayName: string;
  photoStorageKey: string | null;
  positionName: string | null;
  supervisorDisplayName: string | null;
}

export interface OrgChartMembers {
  primaryMembers: EmployeeCard[];
  concurrentMembers: EmployeeCard[];
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
  deletedAt?: string | null;
}

export interface DeletedEmployeeItem extends EmployeeListItem {
  employments?: Array<{
    startDate: string;
    endDate: string | null;
    organization: { organizationName: string };
  }>;
}

export interface EmploymentView {
  id: number;
  organizationId: number;
  positionName: string | null;
  supervisorEmployeeId: number | null;
  startDate: string;
  endDate: string | null;
  status: number;
  employmentType?: number;
}

export interface AddEmploymentInput {
  organizationId: number;
  employmentType: number;
  startDate: string;
  endDate?: string;
  positionMasterId?: number;
  supervisorEmployeeId?: number;
}

export interface UpdateEmploymentInput {
  organizationId?: number;
  employmentType?: number;
  positionMasterId?: number | null;
  startDate?: string;
  endDate?: string | null;
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

export interface CreateEmployeeInput {
  fullName: string;
  employeeNumber?: string;
}

export interface UpdateEmployeeBasicInput {
  fullName?: string;
  employeeNumber?: string;
  displayName?: string;
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

export interface PositionMasterView {
  id: number;
  tenantId: number;
  name: string;
  displayOrder: number;
  isActive: boolean;
  createdAt: string;
}

export interface Qualification {
  id: number;
  tenantId: number;
  employeeId: number;
  name: string;
  acquiredDate: string;
  note: string | null;
  updatedBy: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface QualificationInput {
  name: string;
  acquiredDate: string;
  note?: string | null;
}

export interface AdminSection {
  id: number;
  tenantId: number;
  employeeId: number;
  evaluation: string | null;
  grade: string | null;
  joiningReason: string | null;
  employmentCategory: string | null;
  salaryBand: string | null;
  specialNotes: string | null;
  updatedBy: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface AdminSectionInput {
  evaluation?: string | null;
  grade?: string | null;
  joiningReason?: string | null;
  employmentCategory?: string | null;
  salaryBand?: string | null;
  specialNotes?: string | null;
}

export interface ManagerMember {
  id: number;
  fullName: string;
  employeeNumber: string | null;
  organizationName: string;
}

export interface AuditEvent {
  eventType: 'LOGIN' | 'EDIT';
  occurredAt: string;
  actorEmployeeId: number;
  targetEmployeeId: number | null;
  targetType: string | null;
  operationType: string;
}

// ── API ──────────────────────────────────────────────────────

export const api = {
  auth: {
    getTenant: () => apiFetch<{ id: number; name: string; code: string }>('/auth/tenant'),
    login: (body: { loginIdentifier: string; password: string }) =>
      apiFetch<MeResponse>('/auth/login', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    me: () => apiFetch<MeResponse>('/auth/me'),
    logout: () => apiFetch<{ message: string }>('/auth/logout', { method: 'POST' }),
    twoFactor: {
      status: () => apiFetch<{ enabled: boolean; enabledAt: string | null }>('/auth/2fa/status'),
      initSetup: () => apiFetch<{ qrCodeUrl: string; secret: string }>('/auth/2fa/setup/init'),
      confirmSetup: (code: string) =>
        apiFetch<{ backupCodes: string[] }>('/auth/2fa/setup/confirm', {
          method: 'POST',
          body: JSON.stringify({ code }),
        }),
      verify: (code: string) =>
        apiFetch<{ success: boolean }>('/auth/2fa/verify', {
          method: 'POST',
          body: JSON.stringify({ code }),
        }),
      backupVerify: (code: string) =>
        apiFetch<{ success: boolean; remainingCount: number }>('/auth/2fa/backup-verify', {
          method: 'POST',
          body: JSON.stringify({ code }),
        }),
    },
  },

  organizations: {
    list: () => apiFetch<OrganizationView[]>('/organizations'),
  },

  positionMasters: {
    list: () => apiFetch<PositionMasterView[]>('/position-masters'),
  },

  orgChart: {
    tree: () => apiFetch<OrgChartNode[]>('/org-chart/tree'),
    members: (orgId: number) => apiFetch<OrgChartMembers>(`/org-chart/organizations/${orgId}/members`),
    unassigned: () => apiFetch<EmployeeCard[]>('/org-chart/unassigned'),
  },

  employees: {
    list: () => apiFetch<EmployeeListItem[]>('/employees'),
    get: (id: number) => apiFetch<EmployeeDetail>(`/employees/${id}`),
    create: (body: CreateEmployeeInput) =>
      apiFetch<EmployeeDetail>('/employees', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    updateBasicInfo: (id: number, body: UpdateEmployeeBasicInput) =>
      apiFetch<EmployeeDetail>(`/employees/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      }),
    assistUpdateProfile: (id: number, body: { profileFreeText?: string }) =>
      apiFetch<void>(`/employees/${id}/profile`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      }),
    uploadPhoto: (id: number, file: File) => {
      const fd = new FormData();
      fd.append('photo', file);
      return apiFetchUpload<{ photoStorageKey: string }>(`/employees/${id}/photo`, fd);
    },
    softDelete: (id: number) =>
      apiFetch<void>(`/employees/${id}/soft-delete`, { method: 'POST' }),
    listDeleted: () =>
      apiFetch<DeletedEmployeeItem[]>('/employees/deleted'),
    restore: (id: number) =>
      apiFetch<void>(`/employees/${id}/restore`, { method: 'POST' }),
    deletePhoto: (id: number) =>
      apiFetch<void>(`/employees/${id}/photo`, { method: 'DELETE' }),
    setSupervisorEmployee: (id: number, empId: number, supervisorEmployeeId: number | null) =>
      apiFetch<unknown>(`/employees/${id}/employments/${empId}/set-supervisor`, {
        method: 'PATCH',
        body: JSON.stringify({ supervisorEmployeeId }),
      }),
    addEmployment: (id: number, body: AddEmploymentInput) =>
      apiFetch<EmploymentView>(`/employees/${id}/employments`, {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    updateEmployment: (id: number, empId: number, body: UpdateEmploymentInput) =>
      apiFetch<EmploymentView>(`/employees/${id}/employments/${empId}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      }),
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

  qualifications: {
    list: (employeeId: number) =>
      apiFetch<Qualification[]>(`/employees/${employeeId}/qualifications`),
    create: (employeeId: number, body: QualificationInput) =>
      apiFetch<Qualification>(`/employees/${employeeId}/qualifications`, {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    update: (id: number, body: Partial<QualificationInput>) =>
      apiFetch<Qualification>(`/qualifications/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      }),
    remove: (id: number) =>
      apiFetch<void>(`/qualifications/${id}`, { method: 'DELETE' }),
  },

  adminSection: {
    get: (employeeId: number) =>
      apiFetch<AdminSection | null>(`/employees/${employeeId}/admin-section`),
    upsert: (employeeId: number, body: AdminSectionInput) =>
      apiFetch<AdminSection>(`/employees/${employeeId}/admin-section`, {
        method: 'PUT',
        body: JSON.stringify(body),
      }),
  },

  manager: {
    myMembers: () => apiFetch<ManagerMember[]>('/manager/my-members'),
  },

  audit: {
    listEvents: () => apiFetch<AuditEvent[]>('/admin/audit/events'),
  },

  twoFactorAdmin: {
    getPolicy: () => apiFetch<{ twoFactorPolicy: number }>('/admin/tenant/2fa-policy'),
    setPolicy: (twoFactorPolicy: number) =>
      apiFetch<void>('/admin/tenant/2fa-policy', {
        method: 'PATCH',
        body: JSON.stringify({ twoFactorPolicy }),
      }),
    resetUserTwoFactor: (employeeId: number) =>
      apiFetch<void>(`/admin/employees/${employeeId}/2fa`, { method: 'DELETE' }),
  },

  debug: {
    status: () => apiFetch<{ enabled: boolean }>('/debug/status'),
    login: (roleType: number) =>
      apiFetch<MeResponse>(`/debug/login/${roleType}`, { method: 'POST' }),
    seed: () =>
      apiFetch<{ roleUsers: string[]; extraEmployees: string[] }>('/debug/seed', { method: 'POST' }),
  },
};
