import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Req,
  ParseIntPipe,
  UseGuards,
  HttpCode,
  HttpStatus,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { SessionGuard } from '../auth/guards/session.guard';
import { AuthenticatedRequest } from '../auth/types/authenticated-request';
import { AuthContext } from '../authorization/authorization.service';
import { EmployeeDirectoryService } from './employee-directory.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { AssistUpdateProfileDto } from './dto/assist-update-profile.dto';
import { AddEmploymentDto } from './dto/add-employment.dto';
import { UpdateEmploymentDto } from './dto/update-employment.dto';
import { TerminateEmploymentDto } from './dto/terminate-employment.dto';
import { SetSupervisorEmployeeDto } from './dto/set-supervisor-employee.dto';

@Controller('employees')
@UseGuards(SessionGuard)
export class EmployeeController {
  constructor(private readonly service: EmployeeDirectoryService) {}

  @Get()
  findAll(@Req() req: AuthenticatedRequest) {
    return this.service.findAll(this.ctx(req));
  }

  // Must come before :id to avoid route shadowing
  @Get('deleted')
  findDeleted(@Req() req: AuthenticatedRequest) {
    return this.service.findDeleted(this.ctx(req));
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number, @Req() req: AuthenticatedRequest) {
    return this.service.findById(this.ctx(req), id);
  }

  @Post()
  create(@Req() req: AuthenticatedRequest, @Body() dto: CreateEmployeeDto) {
    return this.service.create(this.ctx(req), {
      fullName: dto.fullName,
      employeeNumber: dto.employeeNumber,
      displayName: dto.displayName,
      email: dto.email,
      birthDate: dto.birthDate ? new Date(dto.birthDate) : undefined,
      profileFreeText: dto.profileFreeText,
    });
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: AuthenticatedRequest,
    @Body() dto: UpdateEmployeeDto,
  ) {
    return this.service.update(this.ctx(req), id, {
      fullName: dto.fullName,
      displayName: dto.displayName,
      email: dto.email,
      birthDate: dto.birthDate ? new Date(dto.birthDate) : undefined,
      profileFreeText: dto.profileFreeText,
    });
  }

  @Patch(':id/profile')
  @HttpCode(HttpStatus.NO_CONTENT)
  assistUpdateProfile(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: AuthenticatedRequest,
    @Body() dto: AssistUpdateProfileDto,
  ) {
    return this.service.assistUpdateProfile(this.ctx(req), id, {
      profileFreeText: dto.profileFreeText,
    });
  }

  @Post(':id/soft-delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  softDelete(@Param('id', ParseIntPipe) id: number, @Req() req: AuthenticatedRequest) {
    return this.service.softDelete(this.ctx(req), id);
  }

  @Post(':id/restore')
  @HttpCode(HttpStatus.NO_CONTENT)
  restore(@Param('id', ParseIntPipe) id: number, @Req() req: AuthenticatedRequest) {
    return this.service.restore(this.ctx(req), id);
  }

  @Get(':id/employments')
  getEmployments(@Param('id', ParseIntPipe) id: number, @Req() req: AuthenticatedRequest) {
    return this.service.getEmployments(this.ctx(req), id);
  }

  @Post(':id/employments')
  addEmployment(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: AuthenticatedRequest,
    @Body() dto: AddEmploymentDto,
  ) {
    return this.service.addEmployment(this.ctx(req), id, {
      organizationId: dto.organizationId,
      employmentType: dto.employmentType,
      positionMasterId: dto.positionMasterId,
      supervisorEmployeeId: dto.supervisorEmployeeId,
      startDate: new Date(dto.startDate),
      endDate: dto.endDate ? new Date(dto.endDate) : undefined,
    });
  }

  @Patch(':id/employments/:empId')
  updateEmployment(
    @Param('id', ParseIntPipe) id: number,
    @Param('empId', ParseIntPipe) empId: number,
    @Req() req: AuthenticatedRequest,
    @Body() dto: UpdateEmploymentDto,
  ) {
    return this.service.updateEmployment(this.ctx(req), id, empId, {
      organizationId: dto.organizationId,
      employmentType: dto.employmentType,
      positionMasterId: dto.positionMasterId,
      supervisorEmployeeId: dto.supervisorEmployeeId,
      startDate: dto.startDate ? new Date(dto.startDate) : undefined,
      endDate: dto.endDate !== undefined ? (dto.endDate ? new Date(dto.endDate) : null) : undefined,
    });
  }

  @Post(':id/employments/:empId/terminate')
  @HttpCode(HttpStatus.NO_CONTENT)
  terminateEmployment(
    @Param('id', ParseIntPipe) id: number,
    @Param('empId', ParseIntPipe) empId: number,
    @Req() req: AuthenticatedRequest,
    @Body() dto: TerminateEmploymentDto,
  ) {
    return this.service.terminateEmployment(this.ctx(req), id, empId, new Date(dto.endDate));
  }

  @Post(':id/photo')
  @UseInterceptors(FileInterceptor('photo', { storage: memoryStorage() }))
  uploadPhoto(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: AuthenticatedRequest,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }),
          new FileTypeValidator({ fileType: /^image\/(jpeg|png|webp|gif)$/ }),
        ],
      }),
    )
    file: Express.Multer.File,
  ) {
    return this.service.uploadPhoto(this.ctx(req), id, file.buffer, file.mimetype).then((key) => ({
      photoStorageKey: key,
    }));
  }

  @Delete(':id/photo')
  @HttpCode(HttpStatus.NO_CONTENT)
  deletePhoto(@Param('id', ParseIntPipe) id: number, @Req() req: AuthenticatedRequest) {
    return this.service.deletePhoto(this.ctx(req), id);
  }

  @Patch(':id/employments/:empId/set-supervisor')
  setSupervisorEmployee(
    @Param('id', ParseIntPipe) id: number,
    @Param('empId', ParseIntPipe) empId: number,
    @Req() req: AuthenticatedRequest,
    @Body() dto: SetSupervisorEmployeeDto,
  ) {
    return this.service.setSupervisorEmployee(this.ctx(req), id, empId, dto.supervisorEmployeeId);
  }

  private ctx(req: AuthenticatedRequest): AuthContext {
    return { userAccountId: req.userAccount.id, employeeId: req.userAccount.employeeId, tenantId: req.userAccount.tenantId };
  }
}
