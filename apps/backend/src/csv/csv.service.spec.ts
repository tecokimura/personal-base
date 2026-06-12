import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UnprocessableEntityException, ForbiddenException } from '@nestjs/common';
import { CsvService } from './csv.service';
import type { AuthorizationService } from '../authorization/authorization.service';
import type { PrismaService } from '../prisma/prisma.service';

const ctx = { userAccountId: 99, employeeId: 99, tenantId: 1 };

const HEADER = 'employee_number,full_name,display_name,email,birth_date,profile_free_text,organization_id,employment_type,start_date,position_master_id,manager_employee_number';

function makeCsv(...rows: string[]): Buffer {
  return Buffer.from([HEADER, ...rows].join('\n'), 'utf-8');
}

const ROW_MINIMAL = 'EMP001,山田 太郎,,,,,,,,,';
const ROW_WITH_ORG = 'EMP001,山田 太郎,,,,,5,1,2026-01-01,,';
const ROW_WITH_MANAGER = 'EMP002,鈴木 花子,,,,,5,1,2026-01-01,,EMP001';

describe('CsvService', () => {
  let service: CsvService;
  let prisma: Record<string, unknown>;
  let authzService: Record<string, ReturnType<typeof vi.fn>>;

  beforeEach(() => {
    authzService = {
      assertCan: vi.fn().mockResolvedValue(undefined),
    };

    prisma = {
      $transaction: vi.fn().mockImplementation((fn: (tx: unknown) => Promise<unknown>) => fn(prisma)),
      employee: {
        count: vi.fn().mockResolvedValue(0),
        create: vi.fn().mockImplementation((args: { data: { employeeNumber?: string | null; id?: number } }) =>
          Promise.resolve({ id: Math.floor(Math.random() * 1000) + 1, ...args.data }),
        ),
        findMany: vi.fn().mockResolvedValue([]),
        findFirst: vi.fn().mockResolvedValue(null),
      },
      employment: {
        create: vi.fn().mockResolvedValue({ id: 10 }),
      },
      organization: {
        findMany: vi.fn().mockResolvedValue([{ id: 5 }]),
      },
    };

    service = new CsvService(
      prisma as unknown as PrismaService,
      authzService as unknown as AuthorizationService,
    );
  });

  // --- import ---

  describe('import', () => {
    it('imports employee without employment when no org provided', async () => {
      const result = await service.import(ctx, makeCsv(ROW_MINIMAL));

      expect(result).toEqual({ imported: 1 });
      expect((prisma.employee as Record<string, ReturnType<typeof vi.fn>>).create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ fullName: '山田 太郎' }) }),
      );
      expect((prisma.employment as Record<string, ReturnType<typeof vi.fn>>).create).not.toHaveBeenCalled();
    });

    it('imports employee with primary employment when org provided', async () => {
      const result = await service.import(ctx, makeCsv(ROW_WITH_ORG));

      expect(result).toEqual({ imported: 1 });
      expect((prisma.employment as Record<string, ReturnType<typeof vi.fn>>).create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            organizationId: 5,
            employmentType: 1,
            status: 1,
          }),
        }),
      );
    });

    it('imports multiple rows', async () => {
      const result = await service.import(ctx, makeCsv(ROW_MINIMAL, 'EMP002,鈴木 花子,,,,,,,,,'));

      expect(result).toEqual({ imported: 2 });
    });

    it('resolves manager_employee_number within the same batch', async () => {
      // EMP001 is created first, EMP002 references EMP001 as manager
      (prisma.employee as Record<string, ReturnType<typeof vi.fn>>).create
        .mockResolvedValueOnce({ id: 1, employeeNumber: 'EMP001' })
        .mockResolvedValueOnce({ id: 2, employeeNumber: 'EMP002' });

      await service.import(ctx, makeCsv(ROW_WITH_ORG, ROW_WITH_MANAGER));

      const empCalls = (prisma.employment as Record<string, ReturnType<typeof vi.fn>>).create.mock.calls;
      const secondEmpCall = empCalls[1][0];
      expect(secondEmpCall.data.managerEmployeeId).toBe(1);
    });

    it('auto-generates TEMP placeholder when employee_number is empty', async () => {
      await service.import(ctx, makeCsv(',山田 太郎,,,,,,,,,'));

      expect((prisma.employee as Record<string, ReturnType<typeof vi.fn>>).create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ employeeNumber: expect.stringMatching(/^TEMP-/) }),
        }),
      );
    });

    it('links Employment correctly to employee with no employee_number via row index', async () => {
      // Two rows with empty employee_number but same full_name — must not cross-link
      (prisma.employee as Record<string, ReturnType<typeof vi.fn>>).create
        .mockResolvedValueOnce({ id: 10, employeeNumber: 'TEMP-000001' })
        .mockResolvedValueOnce({ id: 11, employeeNumber: 'TEMP-000002' });

      await service.import(ctx, makeCsv(
        ',山田 太郎,,,,,5,1,2026-01-01,,',
        ',山田 太郎,,,,,5,1,2026-02-01,,',
      ));

      const empCalls = (prisma.employment as Record<string, ReturnType<typeof vi.fn>>).create.mock.calls;
      expect(empCalls[0][0].data.employeeId).toBe(10);
      expect(empCalls[1][0].data.employeeId).toBe(11);
    });

    it('throws UnprocessableEntityException when full_name is missing', async () => {
      await expect(service.import(ctx, makeCsv('EMP001,,,,,,,,,,'))).rejects.toThrow(
        UnprocessableEntityException,
      );
    });

    it('throws UnprocessableEntityException with row errors when organization_id missing but employment_type provided', async () => {
      const err = await service.import(ctx, makeCsv('EMP001,山田 太郎,,,,,,1,2026-01-01,,')).catch((e: UnprocessableEntityException) => e);
      expect(err).toBeInstanceOf(UnprocessableEntityException);
      const body = (err as UnprocessableEntityException).getResponse() as { errors: { column: string }[] };
      expect(body.errors.some((e) => e.column === 'organization_id')).toBe(true);
    });

    it('throws UnprocessableEntityException when employee_number is duplicate in DB', async () => {
      (prisma.employee as Record<string, ReturnType<typeof vi.fn>>).findMany.mockResolvedValueOnce([
        { employeeNumber: 'EMP001' },
      ]);

      await expect(service.import(ctx, makeCsv(ROW_MINIMAL))).rejects.toThrow(
        UnprocessableEntityException,
      );
    });

    it('throws UnprocessableEntityException when employee_number is duplicate within the file', async () => {
      await expect(service.import(ctx, makeCsv(ROW_MINIMAL, ROW_MINIMAL))).rejects.toThrow(
        UnprocessableEntityException,
      );
    });

    it('throws UnprocessableEntityException when organization_id does not exist in tenant', async () => {
      (prisma.organization as Record<string, ReturnType<typeof vi.fn>>).findMany.mockResolvedValue([]);

      await expect(service.import(ctx, makeCsv(ROW_WITH_ORG))).rejects.toThrow(
        UnprocessableEntityException,
      );
    });

    it('throws UnprocessableEntityException when birth_date has invalid format', async () => {
      await expect(
        service.import(ctx, makeCsv('EMP001,山田 太郎,,,not-a-date,,,,,,'))
      ).rejects.toThrow(UnprocessableEntityException);
    });

    it('throws UnprocessableEntityException for empty CSV', async () => {
      await expect(service.import(ctx, Buffer.from(HEADER, 'utf-8'))).rejects.toThrow(
        UnprocessableEntityException,
      );
    });

    it('throws ForbiddenException when caller lacks MANAGE_EMPLOYEE permission', async () => {
      authzService.assertCan.mockRejectedValue(new ForbiddenException());

      await expect(service.import(ctx, makeCsv(ROW_MINIMAL))).rejects.toThrow(ForbiddenException);
    });
  });

  // --- export ---

  describe('export', () => {
    it('returns CSV buffer with header row', async () => {
      (prisma.employee as Record<string, ReturnType<typeof vi.fn>>).findMany.mockResolvedValue([]);

      const result = await service.export(ctx);

      expect(result).toBeInstanceOf(Buffer);
      const csv = result.toString('utf-8');
      expect(csv).toContain('employee_number,full_name');
    });

    it('exports employee with primary employment', async () => {
      (prisma.employee as Record<string, ReturnType<typeof vi.fn>>).findMany.mockResolvedValue([
        {
          id: 1,
          employeeNumber: 'EMP001',
          fullName: '山田 太郎',
          displayName: null,
          email: 'yamada@example.com',
          birthDate: null,
          profileFreeText: null,
          employments: [
            {
              organizationId: 5,
              employmentType: 1,
              startDate: new Date('2026-01-01'),
              positionMasterId: null,
              managerEmployeeId: null,
            },
          ],
        },
      ]);

      const result = await service.export(ctx);
      const csv = result.toString('utf-8');

      expect(csv).toContain('EMP001');
      expect(csv).toContain('山田 太郎');
      expect(csv).toContain('yamada@example.com');
      expect(csv).toContain('5');
      expect(csv).toContain('2026-01-01');
    });

    it('resolves manager employee_number in export', async () => {
      (prisma.employee as Record<string, ReturnType<typeof vi.fn>>).findMany
        .mockResolvedValueOnce([
          {
            id: 2,
            employeeNumber: 'EMP002',
            fullName: '鈴木 花子',
            displayName: null,
            email: null,
            birthDate: null,
            profileFreeText: null,
            employments: [{ organizationId: 5, employmentType: 1, startDate: new Date('2026-01-01'), positionMasterId: null, managerEmployeeId: 1 }],
          },
        ])
        .mockResolvedValueOnce([{ id: 1, employeeNumber: 'EMP001' }]); // manager lookup

      const result = await service.export(ctx);
      const csv = result.toString('utf-8');

      expect(csv).toContain('EMP001'); // manager employee_number
    });

    it('escapes commas and quotes in CSV values', async () => {
      (prisma.employee as Record<string, ReturnType<typeof vi.fn>>).findMany.mockResolvedValue([
        {
          id: 1,
          employeeNumber: 'EMP001',
          fullName: '山田, 太郎',
          displayName: null,
          email: null,
          birthDate: null,
          profileFreeText: 'He said "hello"',
          employments: [],
        },
      ]);

      const result = await service.export(ctx);
      const csv = result.toString('utf-8');

      expect(csv).toContain('"山田, 太郎"');
      expect(csv).toContain('"He said ""hello"""');
    });

    it('throws ForbiddenException when caller lacks MANAGE_EMPLOYEE permission', async () => {
      authzService.assertCan.mockRejectedValue(new ForbiddenException());

      await expect(service.export(ctx)).rejects.toThrow(ForbiddenException);
    });
  });
});
