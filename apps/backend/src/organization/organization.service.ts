import {
  Injectable,
  NotFoundException,
  ConflictException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Organization, OrganizationLeader } from '@prisma/client';
import { AuthorizationService, AuthContext } from '../authorization/authorization.service';
import { ScopeResolverService } from '../authorization/scope-resolver.service';
import { Permission } from '../authorization/constants';
import { AuditService } from '../audit/audit.service';
import { OrganizationRepository } from './organization.repository';
import { OrganizationLeaderRepository } from './organization-leader.repository';

export interface OrganizationView {
  id: number;
  tenantId: number;
  organizationName: string;
  organizationCode: string | null;
  parentOrganizationId: number | null;
  displayOrder: number;
  isActive: boolean;
  createdAt: Date;
}

export interface OrganizationLeaderView {
  id: number;
  tenantId: number;
  organizationId: number;
  employeeId: number;
  leaderType: number;
  isPrimaryLeader: boolean;
  startDate: Date;
  endDate: Date | null;
  status: number;
  createdAt: Date;
}

export interface CreateOrganizationInput {
  organizationName: string;
  organizationCode?: string;
  parentOrganizationId?: number;
  displayOrder?: number;
}

export interface UpdateOrganizationInput {
  organizationName?: string;
  organizationCode?: string;
  parentOrganizationId?: number;
  displayOrder?: number;
}

export interface AddLeaderInput {
  employeeId: number;
  // leaderType: 1=部門長, 2=副部門長
  leaderType: number;
  isPrimaryLeader?: boolean;
  startDate: Date;
}

export interface OrganizationNode extends OrganizationView {
  children: OrganizationNode[];
}

@Injectable()
export class OrganizationService {
  constructor(
    private readonly orgRepo: OrganizationRepository,
    private readonly leaderRepo: OrganizationLeaderRepository,
    private readonly authorizationService: AuthorizationService,
    private readonly scopeResolver: ScopeResolverService,
    private readonly auditService: AuditService,
  ) {}

  async findAll(tenantId: number): Promise<OrganizationView[]> {
    const orgs = await this.orgRepo.findAll(tenantId, true);
    return orgs.map((o) => this.toOrgView(o));
  }

  async findById(id: number, tenantId: number): Promise<OrganizationView> {
    const org = await this.orgRepo.findById(id, tenantId);
    if (!org) throw new NotFoundException(`Organization ${id} not found`);
    return this.toOrgView(org);
  }

  async getTree(tenantId: number): Promise<OrganizationNode[]> {
    const all = await this.orgRepo.findAll(tenantId, true);
    return this.buildTree(all);
  }

  async create(ctx: AuthContext, input: CreateOrganizationInput): Promise<OrganizationView> {
    await this.authorizationService.assertCan(ctx, Permission.MANAGE_ORGANIZATION, ctx.tenantId);

    if (input.parentOrganizationId !== undefined) {
      await this.assertOrgExists(input.parentOrganizationId, ctx.tenantId);
    }

    const org = await this.orgRepo.create({
      tenantId: ctx.tenantId,
      organizationName: input.organizationName,
      organizationCode: input.organizationCode ?? null,
      parentOrganizationId: input.parentOrganizationId ?? null,
      displayOrder: input.displayOrder ?? 0,
      isActive: true,
      updatedBy: ctx.userAccountId,
    });
    void this.auditService.logEdit({
      tenantId: ctx.tenantId,
      entityType: 'Organization',
      entityId: org.id,
      actionType: 'CREATE',
      changedByEmployeeId: ctx.employeeId,
    });
    return this.toOrgView(org);
  }

  async update(
    ctx: AuthContext,
    id: number,
    input: UpdateOrganizationInput,
  ): Promise<OrganizationView> {
    await this.authorizationService.assertCan(ctx, Permission.MANAGE_ORGANIZATION, ctx.tenantId);
    await this.assertOrgExists(id, ctx.tenantId);

    if (input.parentOrganizationId !== undefined) {
      await this.assertOrgExists(input.parentOrganizationId, ctx.tenantId);
      await this.assertNoCircularReference(id, input.parentOrganizationId, ctx.tenantId);
    }

    const org = await this.orgRepo.update(id, ctx.tenantId, {
      ...(input.organizationName !== undefined && { organizationName: input.organizationName }),
      ...(input.organizationCode !== undefined && { organizationCode: input.organizationCode }),
      ...(input.parentOrganizationId !== undefined && {
        parentOrganizationId: input.parentOrganizationId,
      }),
      ...(input.displayOrder !== undefined && { displayOrder: input.displayOrder }),
      updatedBy: ctx.userAccountId,
    });
    void this.auditService.logEdit({
      tenantId: ctx.tenantId,
      entityType: 'Organization',
      entityId: id,
      actionType: 'UPDATE',
      changedByEmployeeId: ctx.employeeId,
    });
    return this.toOrgView(org);
  }

  async deactivate(ctx: AuthContext, id: number): Promise<void> {
    await this.authorizationService.assertCan(ctx, Permission.MANAGE_ORGANIZATION, ctx.tenantId);
    await this.assertOrgExists(id, ctx.tenantId);

    if (await this.orgRepo.hasActiveChildren(id, ctx.tenantId)) {
      throw new ConflictException('Cannot deactivate: organization has active children');
    }

    if (await this.leaderRepo.hasActiveLeaders(id, ctx.tenantId)) {
      throw new ConflictException(
        'Cannot deactivate: organization has active leaders. Terminate them first.',
      );
    }

    if (await this.orgRepo.hasActiveEmployments(id, ctx.tenantId)) {
      throw new ConflictException(
        'Cannot deactivate: organization has active employments. Terminate them first.',
      );
    }

    await this.orgRepo.deactivate(id, ctx.tenantId, ctx.userAccountId);
    void this.auditService.logEdit({
      tenantId: ctx.tenantId,
      entityType: 'Organization',
      entityId: id,
      actionType: 'DEACTIVATE',
      changedByEmployeeId: ctx.employeeId,
    });
  }

  async getLeaders(
    ctx: AuthContext,
    orgId: number,
    includeTerminated = false,
  ): Promise<OrganizationLeaderView[]> {
    await this.authorizationService.assertCan(ctx, Permission.VIEW_ORG_TREE, ctx.tenantId);
    await this.assertOrgExists(orgId, ctx.tenantId);

    const access = await this.scopeResolver.resolveOrgAccess(ctx);
    if (access.kind === 'ORG_TREE' && !access.orgIds.has(orgId)) {
      throw new NotFoundException(`Organization ${orgId} not found`);
    }

    const leaders = await this.leaderRepo.findByOrganizationId(orgId, ctx.tenantId, includeTerminated);
    return leaders.map((l) => this.toLeaderView(l));
  }

  async addLeader(
    ctx: AuthContext,
    orgId: number,
    input: AddLeaderInput,
  ): Promise<OrganizationLeaderView> {
    await this.authorizationService.assertCan(ctx, Permission.MANAGE_ORGANIZATION, ctx.tenantId);
    await this.assertOrgExists(orgId, ctx.tenantId);

    const employeeExists = await this.orgRepo.employeeExistsInTenant(
      input.employeeId,
      ctx.tenantId,
    );
    if (!employeeExists) {
      throw new NotFoundException(`Employee ${input.employeeId} not found in tenant`);
    }

    // leaderType 単位で有効な部門長は1件まで（設計: 同一組織に有効な部門長は1件だけ許可）
    const hasActiveSameType = await this.leaderRepo.hasActiveLeaderByType(
      orgId,
      ctx.tenantId,
      input.leaderType,
    );
    if (hasActiveSameType) {
      throw new ConflictException(
        `Organization already has an active leader of leaderType ${input.leaderType}`,
      );
    }

    if (input.isPrimaryLeader) {
      const hasPrimary = await this.leaderRepo.hasActivePrimaryLeader(orgId, ctx.tenantId);
      if (hasPrimary) {
        throw new ConflictException('Organization already has an active primary leader');
      }
    }

    const leader = await this.leaderRepo.create({
      tenantId: ctx.tenantId,
      organizationId: orgId,
      employeeId: input.employeeId,
      leaderType: input.leaderType,
      isPrimaryLeader: input.isPrimaryLeader ?? false,
      startDate: input.startDate,
      status: 1, // 有効
      updatedBy: ctx.userAccountId,
    });
    void this.auditService.logEdit({
      tenantId: ctx.tenantId,
      entityType: 'OrganizationLeader',
      entityId: leader.id,
      actionType: 'CREATE',
      changedByEmployeeId: ctx.employeeId,
    });
    return this.toLeaderView(leader);
  }

  async terminateLeader(
    ctx: AuthContext,
    orgId: number,
    leaderId: number,
    endDate: Date,
  ): Promise<void> {
    await this.authorizationService.assertCan(ctx, Permission.MANAGE_ORGANIZATION, ctx.tenantId);
    await this.assertOrgExists(orgId, ctx.tenantId);

    const leader = await this.leaderRepo.findById(leaderId, ctx.tenantId);
    if (!leader || leader.organizationId !== orgId) {
      throw new NotFoundException(`OrganizationLeader ${leaderId} not found`);
    }
    if (leader.status === 2) {
      throw new ConflictException('Leader is already terminated');
    }

    if (endDate < leader.startDate) {
      throw new UnprocessableEntityException('endDate must be on or after startDate');
    }

    await this.leaderRepo.terminate(leaderId, ctx.tenantId, endDate, ctx.userAccountId);
    void this.auditService.logEdit({
      tenantId: ctx.tenantId,
      entityType: 'OrganizationLeader',
      entityId: leaderId,
      actionType: 'TERMINATE',
      changedByEmployeeId: ctx.employeeId,
    });
  }

  private async assertOrgExists(id: number, tenantId: number): Promise<Organization> {
    const org = await this.orgRepo.findById(id, tenantId);
    if (!org) throw new NotFoundException(`Organization ${id} not found`);
    return org;
  }

  // Walk up from newParentId. If we encounter orgId, setting newParentId as parent of orgId
  // would create a circular reference.
  private async assertNoCircularReference(
    orgId: number,
    newParentId: number,
    tenantId: number,
  ): Promise<void> {
    if (orgId === newParentId) {
      throw new UnprocessableEntityException('Organization cannot be its own parent');
    }
    const ancestors = await this.orgRepo.findAncestorIds(newParentId, tenantId);
    if (ancestors.has(orgId)) {
      throw new UnprocessableEntityException(
        'Setting this parent would create a circular reference',
      );
    }
  }

  private buildTree(orgs: Organization[]): OrganizationNode[] {
    const map = new Map<number, OrganizationNode>();
    for (const org of orgs) {
      map.set(org.id, { ...this.toOrgView(org), children: [] });
    }

    const roots: OrganizationNode[] = [];
    for (const node of map.values()) {
      if (node.parentOrganizationId === null) {
        roots.push(node);
      } else {
        const parent = map.get(node.parentOrganizationId);
        if (parent) {
          parent.children.push(node);
        } else {
          roots.push(node); // parent is inactive (filtered out), treat as root
        }
      }
    }

    return roots;
  }

  private toOrgView(org: Organization): OrganizationView {
    return {
      id: org.id,
      tenantId: org.tenantId,
      organizationName: org.organizationName,
      organizationCode: org.organizationCode,
      parentOrganizationId: org.parentOrganizationId,
      displayOrder: org.displayOrder,
      isActive: org.isActive,
      createdAt: org.createdAt,
    };
  }

  private toLeaderView(leader: OrganizationLeader): OrganizationLeaderView {
    return {
      id: leader.id,
      tenantId: leader.tenantId,
      organizationId: leader.organizationId,
      employeeId: leader.employeeId,
      leaderType: leader.leaderType,
      isPrimaryLeader: leader.isPrimaryLeader,
      startDate: leader.startDate,
      endDate: leader.endDate,
      status: leader.status,
      createdAt: leader.createdAt,
    };
  }
}
