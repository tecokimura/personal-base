import { Injectable, NotFoundException } from '@nestjs/common';
import { PositionMaster } from '@prisma/client';
import { AuthorizationService, AuthContext } from '../authorization/authorization.service';
import { Permission } from '../authorization/constants';
import { PositionMasterRepository } from './position-master.repository';

export interface PositionMasterView {
  id: number;
  tenantId: number;
  name: string;
  displayOrder: number;
  isActive: boolean;
  createdAt: Date;
}

export interface CreatePositionMasterInput {
  name: string;
  displayOrder?: number;
}

export interface UpdatePositionMasterInput {
  name?: string;
  displayOrder?: number;
}

@Injectable()
export class PositionMasterService {
  constructor(
    private readonly repo: PositionMasterRepository,
    private readonly authorizationService: AuthorizationService,
  ) {}

  async findAll(ctx: AuthContext): Promise<PositionMasterView[]> {
    await this.authorizationService.assertCan(ctx, Permission.VIEW_ORG_TREE, ctx.tenantId);
    const positions = await this.repo.findAll(ctx.tenantId);
    return positions.map((p) => this.toView(p));
  }

  async create(ctx: AuthContext, input: CreatePositionMasterInput): Promise<PositionMasterView> {
    await this.authorizationService.assertCan(ctx, Permission.MANAGE_EMPLOYEE, ctx.tenantId);
    const position = await this.repo.create({
      tenantId: ctx.tenantId,
      name: input.name,
      displayOrder: input.displayOrder ?? 0,
      updatedBy: ctx.userAccountId,
    });
    return this.toView(position);
  }

  async update(
    ctx: AuthContext,
    id: number,
    input: UpdatePositionMasterInput,
  ): Promise<PositionMasterView> {
    await this.authorizationService.assertCan(ctx, Permission.MANAGE_EMPLOYEE, ctx.tenantId);
    const existing = await this.repo.findById(id, ctx.tenantId);
    if (!existing) throw new NotFoundException(`PositionMaster ${id} not found`);

    const position = await this.repo.update(id, ctx.tenantId, {
      ...(input.name !== undefined && { name: input.name }),
      ...(input.displayOrder !== undefined && { displayOrder: input.displayOrder }),
      updatedBy: ctx.userAccountId,
    });
    return this.toView(position);
  }

  async deactivate(ctx: AuthContext, id: number): Promise<void> {
    await this.authorizationService.assertCan(ctx, Permission.MANAGE_EMPLOYEE, ctx.tenantId);
    const existing = await this.repo.findById(id, ctx.tenantId);
    if (!existing) throw new NotFoundException(`PositionMaster ${id} not found`);
    await this.repo.deactivate(id, ctx.tenantId, ctx.userAccountId);
  }

  private toView(position: PositionMaster): PositionMasterView {
    return {
      id: position.id,
      tenantId: position.tenantId,
      name: position.name,
      displayOrder: position.displayOrder,
      isActive: position.isActive,
      createdAt: position.createdAt,
    };
  }
}
