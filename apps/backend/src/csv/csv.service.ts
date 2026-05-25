import { Injectable, UnprocessableEntityException } from '@nestjs/common';
import { parse } from 'csv-parse/sync';
import { AuthorizationService, AuthContext } from '../authorization/authorization.service';
import { Permission } from '../authorization/constants';
import { PrismaService } from '../prisma/prisma.service';
import { EMPLOYMENT_STATUS } from '../employee/employment.repository';

const CSV_COLUMNS = [
  'employee_number',
  'full_name',
  'display_name',
  'email',
  'birth_date',
  'profile_free_text',
  'organization_id',
  'employment_type',
  'start_date',
  'position_master_id',
  'manager_employee_number',
] as const;

type CsvRow = Record<(typeof CSV_COLUMNS)[number], string>;

interface CsvImportError {
  row: number;
  column: string;
  message: string;
}

export interface ImportResult {
  imported: number;
}

function csvEscape(value: string | null | undefined): string {
  const s = value ?? '';
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function formatDate(date: Date | null | undefined): string {
  if (!date) return '';
  return date.toISOString().split('T')[0];
}

function parseDate(value: string): Date | null {
  if (!value.trim()) return null;
  const d = new Date(value.trim());
  if (isNaN(d.getTime())) return null;
  return d;
}

@Injectable()
export class CsvService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authorizationService: AuthorizationService,
  ) {}

  async import(ctx: AuthContext, buffer: Buffer): Promise<ImportResult> {
    await this.authorizationService.assertCan(ctx, Permission.MANAGE_EMPLOYEE, ctx.tenantId);

    let rows: CsvRow[];
    try {
      rows = parse(buffer, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        bom: true,
        encoding: 'utf8',
      }) as CsvRow[];
    } catch {
      throw new UnprocessableEntityException('CSVのパースに失敗しました。フォーマットを確認してください。');
    }

    if (rows.length === 0) {
      throw new UnprocessableEntityException('CSVにデータ行がありません。');
    }

    const errors = await this.validateRows(rows, ctx.tenantId);
    if (errors.length > 0) {
      throw new UnprocessableEntityException({ errors });
    }

    const imported = await this.prisma.$transaction(async (tx) => {
      // Maps employee_number → id (for manager resolution)
      const employeeNumberToId = new Map<string, number>();
      // Maps row index → employeeId (for safe Employment linkage regardless of employee_number)
      const rowIndexToEmployeeId = new Map<number, number>();

      // Pre-load existing employees by number (for manager cross-ref from DB)
      const batchEmployeeNumbers = rows
        .map((r) => r.employee_number.trim())
        .filter((n) => n.length > 0);
      if (batchEmployeeNumbers.length > 0) {
        const existing = await tx.employee.findMany({
          where: { tenantId: ctx.tenantId, employeeNumber: { in: batchEmployeeNumbers }, isDeleted: false },
          select: { id: true, employeeNumber: true },
        });
        for (const e of existing) {
          if (e.employeeNumber) employeeNumberToId.set(e.employeeNumber, e.id);
        }
      }

      // Step 1: create all employees; record row index → employeeId
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        let employeeNumber = row.employee_number.trim() || null;
        if (!employeeNumber) {
          const count = await tx.employee.count({ where: { tenantId: ctx.tenantId } });
          employeeNumber = `TEMP-${String(count + 1).padStart(6, '0')}`;
        }

        const employee = await tx.employee.create({
          data: {
            tenantId: ctx.tenantId,
            employeeNumber,
            fullName: row.full_name.trim(),
            displayName: row.display_name.trim() || null,
            email: row.email.trim() || null,
            birthDate: parseDate(row.birth_date),
            photoStorageKey: null,
            profileFreeText: row.profile_free_text.trim() || null,
            updatedBy: ctx.userAccountId,
          },
        });
        rowIndexToEmployeeId.set(i, employee.id);
        employeeNumberToId.set(employeeNumber, employee.id);
      }

      // Step 2: create employments using row index for safe linkage
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const orgIdRaw = row.organization_id.trim();
        if (!orgIdRaw) continue;

        const employeeId = rowIndexToEmployeeId.get(i);
        if (!employeeId) continue;

        const managerNumber = row.manager_employee_number.trim();
        let supervisorEmployeeId: number | null = null;
        if (managerNumber) {
          supervisorEmployeeId = employeeNumberToId.get(managerNumber) ?? null;
          if (!supervisorEmployeeId) {
            const mgr = await tx.employee.findFirst({
              where: { tenantId: ctx.tenantId, employeeNumber: managerNumber, isDeleted: false },
              select: { id: true },
            });
            supervisorEmployeeId = mgr?.id ?? null;
          }
        }

        await tx.employment.create({
          data: {
            tenantId: ctx.tenantId,
            employeeId,
            organizationId: parseInt(orgIdRaw, 10),
            employmentType: parseInt(row.employment_type.trim(), 10),
            supervisorEmployeeId,
            positionMasterId: row.position_master_id.trim()
              ? parseInt(row.position_master_id.trim(), 10)
              : null,
            startDate: parseDate(row.start_date)!,
            status: EMPLOYMENT_STATUS.ACTIVE,
            updatedBy: ctx.userAccountId,
          },
        });
      }

      return rows.length;
    });

    return { imported };
  }

  async export(ctx: AuthContext): Promise<Buffer> {
    await this.authorizationService.assertCan(ctx, Permission.MANAGE_EMPLOYEE, ctx.tenantId);

    const employees = await this.prisma.employee.findMany({
      where: { tenantId: ctx.tenantId, isDeleted: false },
      orderBy: { id: 'asc' },
      include: {
        employments: {
          where: { endDate: null },
          orderBy: { id: 'asc' },
          take: 1,
        },
      },
    });

    // Build supervisor employee_number lookup map
    const supervisorIds = employees
      .flatMap((e) => e.employments)
      .map((emp) => emp.supervisorEmployeeId)
      .filter((id): id is number => id !== null);

    const supervisorMap = new Map<number, string | null>();
    if (supervisorIds.length > 0) {
      const supervisors = await this.prisma.employee.findMany({
        where: { id: { in: supervisorIds } },
        select: { id: true, employeeNumber: true },
      });
      for (const m of supervisors) {
        supervisorMap.set(m.id, m.employeeNumber);
      }
    }

    const header = CSV_COLUMNS.map(csvEscape).join(',');
    const dataRows = employees.map((e) => {
      const emp = e.employments[0] ?? null;
      return [
        e.employeeNumber,
        e.fullName,
        e.displayName,
        e.email,
        formatDate(e.birthDate),
        e.profileFreeText,
        emp ? String(emp.organizationId) : '',
        emp ? String(emp.employmentType) : '',
        emp ? formatDate(emp.startDate) : '',
        emp?.positionMasterId ? String(emp.positionMasterId) : '',
        emp?.supervisorEmployeeId ? (supervisorMap.get(emp.supervisorEmployeeId) ?? '') : '',
      ]
        .map(csvEscape)
        .join(',');
    });

    const csv = [header, ...dataRows].join('\n') + '\n';
    return Buffer.from(csv, 'utf-8');
  }

  private async validateRows(rows: CsvRow[], tenantId: number): Promise<CsvImportError[]> {
    const errors: CsvImportError[] = [];

    // Collect employee numbers appearing in the file to detect in-file duplicates
    const fileEmployeeNumbers = new Map<string, number>(); // number → first row index

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2; // 1-based + header row

      // full_name: required
      if (!row.full_name.trim()) {
        errors.push({ row: rowNum, column: 'full_name', message: '氏名は必須です' });
      }

      // employee_number: uniqueness within file
      const empNum = row.employee_number.trim();
      if (empNum) {
        if (fileEmployeeNumbers.has(empNum)) {
          errors.push({
            row: rowNum,
            column: 'employee_number',
            message: `社員番号 "${empNum}" がファイル内で重複しています（最初の出現: ${fileEmployeeNumbers.get(empNum)}行目）`,
          });
        } else {
          fileEmployeeNumbers.set(empNum, rowNum);
        }
      }

      // birth_date: format check
      if (row.birth_date.trim() && !parseDate(row.birth_date)) {
        errors.push({ row: rowNum, column: 'birth_date', message: '生年月日はYYYY-MM-DD形式で入力してください' });
      }

      // start_date: format check
      if (row.start_date.trim() && !parseDate(row.start_date)) {
        errors.push({ row: rowNum, column: 'start_date', message: '雇用開始日はYYYY-MM-DD形式で入力してください' });
      }

      // organization_id + employment_type + start_date: required together
      const hasOrg = !!row.organization_id.trim();
      const hasEmpType = !!row.employment_type.trim();
      const hasStartDate = !!row.start_date.trim();

      if (hasOrg || hasEmpType || hasStartDate) {
        if (!hasOrg) {
          errors.push({ row: rowNum, column: 'organization_id', message: '雇用区分または開始日を指定する場合、組織IDは必須です' });
        }
        if (!hasEmpType) {
          errors.push({ row: rowNum, column: 'employment_type', message: '組織IDを指定する場合、雇用区分は必須です' });
        } else if (isNaN(parseInt(row.employment_type.trim(), 10))) {
          errors.push({ row: rowNum, column: 'employment_type', message: '雇用区分は数値で入力してください' });
        }
        if (!hasStartDate) {
          errors.push({ row: rowNum, column: 'start_date', message: '組織IDを指定する場合、雇用開始日は必須です' });
        }
        if (hasOrg && isNaN(parseInt(row.organization_id.trim(), 10))) {
          errors.push({ row: rowNum, column: 'organization_id', message: '組織IDは数値で入力してください' });
        }
      }
    }

    if (errors.length > 0) return errors;

    // DB-level validations (only if basic validation passes)

    // Check employee number uniqueness against DB
    const fileNumbers = [...fileEmployeeNumbers.keys()];
    if (fileNumbers.length > 0) {
      const existing = await this.prisma.employee.findMany({
        where: { tenantId, employeeNumber: { in: fileNumbers }, isDeleted: false },
        select: { employeeNumber: true },
      });
      for (const e of existing) {
        if (e.employeeNumber) {
          const rowNum = fileEmployeeNumbers.get(e.employeeNumber)!;
          errors.push({
            row: rowNum,
            column: 'employee_number',
            message: `社員番号 "${e.employeeNumber}" は既に登録されています`,
          });
        }
      }
    }

    // Check organization IDs exist in tenant
    const orgIds = [
      ...new Set(
        rows
          .map((r) => r.organization_id.trim())
          .filter((s) => s && !isNaN(parseInt(s, 10)))
          .map((s) => parseInt(s, 10)),
      ),
    ];
    if (orgIds.length > 0) {
      const existingOrgs = await this.prisma.organization.findMany({
        where: { id: { in: orgIds }, tenantId, isActive: true },
        select: { id: true },
      });
      const existingOrgIds = new Set(existingOrgs.map((o) => o.id));
      for (let i = 0; i < rows.length; i++) {
        const orgIdRaw = rows[i].organization_id.trim();
        if (!orgIdRaw) continue;
        const orgId = parseInt(orgIdRaw, 10);
        if (!existingOrgIds.has(orgId)) {
          errors.push({
            row: i + 2,
            column: 'organization_id',
            message: `組織ID ${orgId} はテナント内に存在しないか、無効な組織です`,
          });
        }
      }
    }

    // position_master_id: format check only (no master table to validate against in MVP)
    for (let i = 0; i < rows.length; i++) {
      const pidRaw = rows[i].position_master_id.trim();
      if (pidRaw && isNaN(parseInt(pidRaw, 10))) {
        errors.push({
          row: i + 2,
          column: 'position_master_id',
          message: '役職IDは数値で入力してください',
        });
      }
    }

    return errors;
  }
}
