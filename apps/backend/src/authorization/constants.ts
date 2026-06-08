// roleType: 1=HR_ADMIN, 2=MANAGER, 3=ORG_ADMIN, 4=EXECUTIVE_VIEWER, 5=EMPLOYEE
export const RoleType = {
  HR_ADMIN: 1,
  MANAGER: 2,
  ORG_ADMIN: 3,
  EXECUTIVE_VIEWER: 4,
  EMPLOYEE: 5,
} as const;
export type RoleType = (typeof RoleType)[keyof typeof RoleType];

// scopeType: 1=SELF, 2=ORGANIZATION, 3=ORGANIZATION_TREE, 4=TENANT_ALL
export const ScopeType = {
  SELF: 1,
  ORGANIZATION: 2,
  ORGANIZATION_TREE: 3,
  TENANT_ALL: 4,
} as const;
export type ScopeType = (typeof ScopeType)[keyof typeof ScopeType];

export const Permission = {
  MANAGE_EMPLOYEE: 'MANAGE_EMPLOYEE',
  VIEW_ALL_EMPLOYEES: 'VIEW_ALL_EMPLOYEES',
  VIEW_ORG_TREE: 'VIEW_ORG_TREE',
  MANAGE_SOFT_DELETED: 'MANAGE_SOFT_DELETED',
  MANAGE_ROLE_ASSIGNMENTS: 'MANAGE_ROLE_ASSIGNMENTS',
  MANAGE_ORGANIZATION: 'MANAGE_ORGANIZATION',
  // Limited auxiliary update: profile_free_text, photo, supervisorEmployeeId for ORG_TREE subordinates
  ASSIST_UPDATE_PROFILE: 'ASSIST_UPDATE_PROFILE',
  VIEW_AUDIT_LOGS: 'VIEW_AUDIT_LOGS',
  MANAGE_TENANT_SETTINGS: 'MANAGE_TENANT_SETTINGS',
} as const;
export type Permission = (typeof Permission)[keyof typeof Permission];
