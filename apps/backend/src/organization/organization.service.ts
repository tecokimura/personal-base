import {
  Injectable,
  NotFoundException,
  ConflictException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Organization, OrganizationLeader } from '@prisma/client';
import { AuthorizationService, AuthContext } from '../authorization/authorization.service';
import { Permission } from '../authorization/constants';
import { OrganizationRepository } from './organization.repository';
import { OrganizationLeaderRepository } from './organization-leader.repository';

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

export interface OrganizationNode extends Organization {
  children: OrganizationNode[];
}

@Injectable()
export class OrganizationService {
  constructor(
    private readonly orgRepo: OrganizationRepository,
    private readonly leaderRepo: OrganizationLeaderRepository,
    private readonly authorizationService: AuthorizationService,
  ) {}

  async findAll(tenantId: number): Promise<Organization[]> {
    return this.orgRepo.findAll(tenantId, true);
  }

  async findById(id: number, tenantId: number): Promise<Organization> {
    const org = await this.orgRepo.findById(id, tenantId);
    if (!org) throw new NotFoundException(`Organization ${id} not found`);
    return org;
  }

  async getTree(tenantId: number): Promise<OrganizationNode[]> {
    const all = await this.orgRepo.findAll(tenantId, true);
    return this.buildTree(all);
  }

  async create(ctx: AuthContext, input: CreateOrganizationInput): Promise<Organization> {
    await this.authorizationService.assertCan(ctx, Permission.MANAGE_ORGANIZATION, ctx.tenantId);

    if (input.parentOrganizationId !== undefined) {
      await this.assertOrgExists(input.parentOrganizationId, ctx.tenantId);
    }

    return this.orgRepo.create({
      tenantId: ctx.tenantId,
      organizationName: input.organizationName,
      organizationCode: input.organizationCode ?? null,
      parentOrganizationId: input.parentOrganizationId ?? null,
      displayOrder: input.displayOrder ?? 0,
      isActive: true,
      updatedBy: ctx.userAccountId,
    });
  }

  async update(
    ctx: AuthContext,
    id: number,
    input: UpdateOrganizationInput,
  ): Promise<Organization> {
    await this.authorizationService.assertCan(ctx, Permission.MANAGE_ORGANIZATION, ctx.tenantId);
    await this.assertOrgExists(id, ctx.tenantId);

    if (input.parentOrganizationId !== undefined) {
      await this.assertOrgExists(input.parentOrganizationId, ctx.tenantId);
      await this.assertNoCircularReference(id, input.parentOrganizationId, ctx.tenantId);
    }

    return this.orgRepo.update(id, ctx.tenantId, {
      ...(input.organizationName !== undefined && { organizationName: input.organizationName }),
      ...(input.organizationCode !== undefined && { organizationCode: input.organizationCode }),
      ...(input.parentOrganizationId !== undefined && {
        parentOrganizationId: input.parentOrganizationId,
      }),
      ...(input.displayOrder !== undefined && { displayOrder: input.displayOrder }),
      updatedBy: ctx.userAccountId,
    });
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

    // TODO: check active Employment records when employee-management phase is implemented

    await this.orgRepo.deactivate(id, ctx.tenantId, ctx.userAccountId);
  }

  async getLeaders(orgId: number, tenantId: number): Promise<OrganizationLeader[]> {
    await this.assertOrgExists(orgId, tenantId);
    return this.leaderRepo.findByOrganizationId(orgId, tenantId);
  }

  async addLeader(
    ctx: AuthContext,
    orgId: number,
    input: AddLeaderInput,
  ): Promise<OrganizationLeader> {
    await this.authorizationService.assertCan(ctx, Permission.MANAGE_ORGANIZATION, ctx.tenantId);
    await this.assertOrgExists(orgId, ctx.tenantId);

    const employeeExists = await this.orgRepo.employeeExistsInTenant(
      input.employeeId,
      ctx.tenantId,
    );
    if (!employeeExists) {
      throw new NotFoundException(`Employee ${input.employeeId} not found in tenant`);
    }

    if (input.isPrimaryLeader) {
      const hasPrimary = await this.leaderRepo.hasActivePrimaryLeader(orgId, ctx.tenantId);
      if (hasPrimary) {
        throw new ConflictException('Organization already has an active primary leader');
      }
    }

    return this.leaderRepo.create({
      tenantId: ctx.tenantId,
      organizationId: orgId,
      employeeId: input.employeeId,
      leaderType: input.leaderType,
      isPrimaryLeader: input.isPrimaryLeader ?? false,
      startDate: input.startDate,
      status: 1, // 有効
      updatedBy: ctx.userAccountId,
    });
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
      map.set(org.id, { ...org, children: [] });
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
}
