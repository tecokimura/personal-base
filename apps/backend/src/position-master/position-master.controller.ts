import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Req,
  ParseIntPipe,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { SessionGuard } from '../auth/guards/session.guard';
import { AuthenticatedRequest } from '../auth/types/authenticated-request';
import { AuthContext } from '../authorization/authorization.service';
import { PositionMasterService, PositionMasterView } from './position-master.service';
import { CreatePositionMasterDto } from './dto/create-position-master.dto';
import { UpdatePositionMasterDto } from './dto/update-position-master.dto';

@Controller('position-masters')
@UseGuards(SessionGuard)
export class PositionMasterController {
  constructor(private readonly positionMasterService: PositionMasterService) {}

  @Get()
  findAll(@Req() req: AuthenticatedRequest): Promise<PositionMasterView[]> {
    return this.positionMasterService.findAll(this.toAuthContext(req));
  }

  @Post()
  create(
    @Body() body: CreatePositionMasterDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<PositionMasterView> {
    return this.positionMasterService.create(this.toAuthContext(req), body);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdatePositionMasterDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<PositionMasterView> {
    return this.positionMasterService.update(this.toAuthContext(req), id, body);
  }

  @Post(':id/deactivate')
  @HttpCode(HttpStatus.OK)
  async deactivate(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: AuthenticatedRequest,
  ): Promise<{ message: string }> {
    await this.positionMasterService.deactivate(this.toAuthContext(req), id);
    return { message: 'ok' };
  }

  private toAuthContext(req: AuthenticatedRequest): AuthContext {
    return {
      userAccountId: req.userAccount.id,
      employeeId: req.userAccount.employeeId,
      tenantId: req.userAccount.tenantId,
    };
  }
}
