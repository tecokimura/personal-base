import { Injectable, NotFoundException } from '@nestjs/common';
import { OrgChartRepository, OrgRow, LeaderRow, EmploymentRow } from './org-chart.repository';
import { ScopeResolverService, OrgAccess } from '../authorization/scope-resolver.service';
import { AuthContext } from '../authorization/authorization.service';

// ── ViewModels ──────────────────────────────────────────────

export interface LeaderCard {
  employeeId: number;
  displayName: string;
  leaderType: number; // 1=部門長, 2=副部門長
}

export interface EmployeeCard {
  employeeId: number;
  employeeNumber: string | null;
  displayName: string;
  photoStorageKey: string | null;
  assignmentLabel: '主所属' | '兼務';
  /** null until PositionMaster table is implemented */
  positionName: string | null;
  supervisorDisplayName: string | null;
  /** Populated only for concurrent (兼務) members */
  primaryOrganizationName: string | null;
}

export interface OrgChartNode {
  organizationId: number;
  organizationName: string;
  organizationCode: string | null;
  parentOrganizationId: number | null;
  childrenCount: number;
  memberCount: number;
  primaryLeader: LeaderCard | null;
  children: OrgChartNode[];
}

export interface OrgChartDetail {
  organizationId: number;
  organizationName: string;
  organizationCode: string | null;
  parentOrganizationId: number | null;
  leaders: LeaderCard[];
  primaryMembers: EmployeeCard[];
  concurrentMembers: EmployeeCard[];
  directChildren: { organizationId: number; organizationName: string }[];
}

export interface OrgChartMembers {
  primaryMembers: EmployeeCard[];
  concurrentMembers: EmployeeCard[];
}

@Injectable()
export class OrgChartService {
  constructor(
    private readonly repo: OrgChartRepository,
    private readonly scopeResolver: ScopeResolverService,
  ) {}

  async getTree(ctx: AuthContext): Promise<OrgChartNode[]> {
    const [orgs, leaders, memberCounts, access] = await Promise.all([
      this.repo.findActiveOrganizations(ctx.tenantId),
      this.repo.findActiveLeaders(ctx.tenantId),
      this.repo.countActiveEmploymentsByOrg(ctx.tenantId),
      this.scopeResolver.resolveOrgAccess(ctx),
    ]);

    // EMPLOYEE sees the full org chart; TENANT_ALL also sees everything.
    // Only ORG_TREE scope (MANAGER/ORG_ADMIN) gets filtered.
    const visibleOrgs =
      access.kind === 'ORG_TREE'
        ? orgs.filter((o) => access.orgIds.has(o.id))
        : orgs;

    const leadersByOrg = this.groupBy(leaders, (l) => l.organizationId);

    return this.buildTree(visibleOrgs, leadersByOrg, memberCounts);
  }

  async getOrganizationDetail(organizationId: number, ctx: AuthContext): Promise<OrgChartDetail> {
    const [orgs, access] = await Promise.all([
      this.repo.findActiveOrganizations(ctx.tenantId),
      this.scopeResolver.resolveOrgAccess(ctx),
    ]);
    const org = orgs.find((o) => o.id === organizationId);
    if (!org) throw new NotFoundException(`Organization ${organizationId} not found`);

    // Scope check: ORG_TREE roles can only access orgs within their tree
    if (!this.scopeResolver.canAccessOrg(access, organizationId)) {
      throw new NotFoundException(`Organization ${organizationId} not found`);
    }

    const [leaders, employments] = await Promise.all([
      this.repo.findActiveLeadersByOrg(organizationId, ctx.tenantId),
      this.repo.findActiveEmploymentsByOrg(organizationId, ctx.tenantId),
    ]);

    const directChildren = orgs
      .filter((o) => o.parentOrganizationId === organizationId)
      .map((o) => ({ organizationId: o.id, organizationName: o.organizationName }));

    const { primaryMembers, concurrentMembers } = await this.buildMemberCards(
      employments,
      ctx.tenantId,
      access,
    );

    return {
      organizationId: org.id,
      organizationName: org.organizationName,
      organizationCode: org.organizationCode,
      parentOrganizationId: org.parentOrganizationId,
      leaders: leaders.map(this.toLeaderCard),
      primaryMembers,
      concurrentMembers,
      directChildren,
    };
  }

  async getMembers(organizationId: number, ctx: AuthContext): Promise<OrgChartMembers> {
    const [orgs, access] = await Promise.all([
      this.repo.findActiveOrganizations(ctx.tenantId),
      this.scopeResolver.resolveOrgAccess(ctx),
    ]);
    const orgExists = orgs.some((o) => o.id === organizationId);
    if (!orgExists) throw new NotFoundException(`Organization ${organizationId} not found`);

    if (!this.scopeResolver.canAccessOrg(access, organizationId)) {
      throw new NotFoundException(`Organization ${organizationId} not found`);
    }

    const employments = await this.repo.findActiveEmploymentsByOrg(organizationId, ctx.tenantId);
    return this.buildMemberCards(employments, ctx.tenantId, access);
  }

  // ── Private helpers ──────────────────────────────────────

  private buildTree(
    orgs: OrgRow[],
    leadersByOrg: Map<number, LeaderRow[]>,
    memberCounts: Map<number, number>,
  ): OrgChartNode[] {
    const nodeMap = new Map<number, OrgChartNode>();

    for (const org of orgs) {
      const orgLeaders = leadersByOrg.get(org.id) ?? [];
      const primaryLeaderRow = orgLeaders.find((l) => l.leaderType === 1) ?? null;

      nodeMap.set(org.id, {
        organizationId: org.id,
        organizationName: org.organizationName,
        organizationCode: org.organizationCode,
        parentOrganizationId: org.parentOrganizationId,
        childrenCount: 0,
        memberCount: memberCounts.get(org.id) ?? 0,
        primaryLeader: primaryLeaderRow ? this.toLeaderCard(primaryLeaderRow) : null,
        children: [],
      });
    }

    const roots: OrgChartNode[] = [];
    for (const node of nodeMap.values()) {
      if (node.parentOrganizationId === null) {
        roots.push(node);
      } else {
        const parent = nodeMap.get(node.parentOrganizationId);
        if (parent) {
          parent.children.push(node);
          parent.childrenCount++;
        } else {
          roots.push(node);
        }
      }
    }

    return roots;
  }

  private async buildMemberCards(
    employments: EmploymentRow[],
    tenantId: number,
    access: OrgAccess,
  ): Promise<OrgChartMembers> {
    const supervisorIds = [
      ...new Set(employments.map((e) => e.supervisorEmployeeId).filter((id): id is number => id !== null)),
    ];

    const supervisorNames = new Map<number, string | null>();
    await Promise.all(
      supervisorIds.map(async (id) => {
        const name = await this.repo.findEmployeeDisplayNameById(id, tenantId);
        supervisorNames.set(id, name);
      }),
    );

    // For concurrent members, we need to find their primary org name
    const concurrentEmployeeIds = employments
      .filter((e) => !e.isPrimaryAssignment)
      .map((e) => e.employeeId);

    const primaryOrgNames = new Map<number, string | null>();
    await Promise.all(
      concurrentEmployeeIds.map(async (id) => {
        if (!primaryOrgNames.has(id)) {
          const name = await this.repo.findPrimaryOrgNameForEmployee(id, tenantId);
          primaryOrgNames.set(id, name);
        }
      }),
    );

    const positionNames = await this.repo.findPositionMastersByTenant(tenantId);

    const toCard = (e: EmploymentRow): EmployeeCard => ({
      employeeId: e.employeeId,
      employeeNumber: access.kind === 'PRIMARY_ORG' ? null : e.employeeNumber,
      displayName: e.displayName ?? e.fullName,
      photoStorageKey: e.photoStorageKey,
      assignmentLabel: e.isPrimaryAssignment ? '主所属' : '兼務',
      positionName: e.positionMasterId ? (positionNames.get(e.positionMasterId) ?? null) : null,
      supervisorDisplayName: e.supervisorEmployeeId ? (supervisorNames.get(e.supervisorEmployeeId) ?? null) : null,
      primaryOrganizationName: e.isPrimaryAssignment ? null : (primaryOrgNames.get(e.employeeId) ?? null),
    });

    const primaryMembers = employments
      .filter((e) => e.isPrimaryAssignment)
      .map(toCard)
      .sort((a, b) => a.displayName.localeCompare(b.displayName, 'ja'));

    const concurrentMembers = employments
      .filter((e) => !e.isPrimaryAssignment)
      .map(toCard)
      .sort((a, b) => a.displayName.localeCompare(b.displayName, 'ja'));

    return { primaryMembers, concurrentMembers };
  }

  private toLeaderCard(leader: LeaderRow): LeaderCard {
    return {
      employeeId: leader.employeeId,
      displayName: leader.displayName ?? leader.fullName,
      leaderType: leader.leaderType,
    };
  }

  private groupBy<T>(items: T[], key: (item: T) => number): Map<number, T[]> {
    const map = new Map<number, T[]>();
    for (const item of items) {
      const k = key(item);
      const arr = map.get(k) ?? [];
      arr.push(item);
      map.set(k, arr);
    }
    return map;
  }
}
