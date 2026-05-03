import { describe, it, expect, vi, afterEach } from 'vitest';
import { HttpException, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { GlobalExceptionFilter } from './global-exception.filter';
import type { ArgumentsHost } from '@nestjs/common';

function makeHost() {
  const json = vi.fn();
  const status = vi.fn().mockReturnValue({ json });
  const host = {
    switchToHttp: () => ({
      getResponse: () => ({ status }),
      getRequest: () => ({ method: 'GET', url: '/test' }),
    }),
  } as unknown as ArgumentsHost;
  return { host, status, json };
}

describe('GlobalExceptionFilter', () => {
  const filter = new GlobalExceptionFilter();
  let logSpy: { mockRestore(): void } | undefined;

  afterEach(() => {
    logSpy?.mockRestore();
  });

  describe('HttpException', () => {
    it('400 ValidationPipe エラーを VALIDATION_ERROR + details 配列に変換する', () => {
      const { host, status, json } = makeHost();
      filter.catch(
        new HttpException(
          { message: ['fullName must not be empty', 'email must be an email'], error: 'Bad Request', statusCode: 400 },
          400,
        ),
        host,
      );
      expect(status).toHaveBeenCalledWith(400);
      const body = json.mock.calls[0][0];
      expect(body.error.code).toBe('VALIDATION_ERROR');
      expect(body.error.message).toBe('リクエストの内容が不正です');
      expect(body.error.details).toHaveLength(2);
      expect(body.error.details[0].message).toBe('fullName must not be empty');
    });

    it('401 を UNAUTHORIZED に変換する', () => {
      const { host, status, json } = makeHost();
      filter.catch(new HttpException('Unauthorized', 401), host);
      expect(status).toHaveBeenCalledWith(401);
      expect(json.mock.calls[0][0].error.code).toBe('UNAUTHORIZED');
    });

    it('403 を FORBIDDEN に変換する', () => {
      const { host, status, json } = makeHost();
      filter.catch(new HttpException('Forbidden', 403), host);
      expect(status).toHaveBeenCalledWith(403);
      expect(json.mock.calls[0][0].error.code).toBe('FORBIDDEN');
    });

    it('404 を NOT_FOUND に変換する', () => {
      const { host, status, json } = makeHost();
      filter.catch(new HttpException('Not Found', 404), host);
      expect(status).toHaveBeenCalledWith(404);
      expect(json.mock.calls[0][0].error.code).toBe('NOT_FOUND');
    });

    it('409 を CONFLICT に変換する', () => {
      const { host, status, json } = makeHost();
      filter.catch(new HttpException('Conflict', 409), host);
      expect(status).toHaveBeenCalledWith(409);
      expect(json.mock.calls[0][0].error.code).toBe('CONFLICT');
    });

    it('422 CSV エラー ({ errors: [...] }) を details 配列に変換する', () => {
      const { host, status, json } = makeHost();
      filter.catch(
        new HttpException(
          { errors: [{ row: 2, column: 'full_name', message: '氏名は必須です' }] },
          422,
        ),
        host,
      );
      expect(status).toHaveBeenCalledWith(422);
      const body = json.mock.calls[0][0];
      expect(body.error.code).toBe('UNPROCESSABLE_ENTITY');
      expect(body.error.details[0].field).toBe('full_name');
      expect(body.error.details[0].row).toBe(2);
      expect(body.error.details[0].message).toBe('氏名は必須です');
    });

    it('422 文字列メッセージを message にセットする', () => {
      const { host, status, json } = makeHost();
      filter.catch(new HttpException('CSVにデータ行がありません', 422), host);
      expect(json.mock.calls[0][0].error.message).toBe('CSVにデータ行がありません');
    });

    it('標準 HTTP 例外の message 文字列を message にセットする', () => {
      const { host, status, json } = makeHost();
      filter.catch(
        new HttpException({ message: 'Employee 1 not found', statusCode: 404 }, 404),
        host,
      );
      expect(json.mock.calls[0][0].error.message).toBe('Employee 1 not found');
    });
  });

  describe('Prisma エラー', () => {
    it('P2002 を 409 CONFLICT に変換する', () => {
      const { host, status, json } = makeHost();
      filter.catch(
        new Prisma.PrismaClientKnownRequestError('Unique constraint', {
          code: 'P2002',
          clientVersion: '5.0.0',
        }),
        host,
      );
      expect(status).toHaveBeenCalledWith(409);
      expect(json.mock.calls[0][0].error.code).toBe('CONFLICT');
    });

    it('P2025 を 404 NOT_FOUND に変換する', () => {
      const { host, status, json } = makeHost();
      filter.catch(
        new Prisma.PrismaClientKnownRequestError('Record not found', {
          code: 'P2025',
          clientVersion: '5.0.0',
        }),
        host,
      );
      expect(status).toHaveBeenCalledWith(404);
      expect(json.mock.calls[0][0].error.code).toBe('NOT_FOUND');
    });

    it('未知の Prisma エラーを 500 INTERNAL_ERROR に変換し Logger.error を呼ぶ', () => {
      logSpy = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
      const { host, status, json } = makeHost();
      filter.catch(
        new Prisma.PrismaClientKnownRequestError('Unknown', {
          code: 'P9999',
          clientVersion: '5.0.0',
        }),
        host,
      );
      expect(status).toHaveBeenCalledWith(500);
      expect(json.mock.calls[0][0].error.code).toBe('INTERNAL_ERROR');
      expect(logSpy).toHaveBeenCalled();
    });
  });

  describe('想定外エラー', () => {
    it('Error インスタンスを 500 INTERNAL_ERROR に変換し Logger.error を呼ぶ', () => {
      logSpy = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
      const { host, status, json } = makeHost();
      filter.catch(new Error('boom'), host);
      expect(status).toHaveBeenCalledWith(500);
      expect(json.mock.calls[0][0].error.code).toBe('INTERNAL_ERROR');
      expect(logSpy).toHaveBeenCalled();
    });

    it('非 Error 値を 500 INTERNAL_ERROR に変換し Logger.error を呼ぶ', () => {
      logSpy = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
      const { host, status, json } = makeHost();
      filter.catch('string error', host);
      expect(status).toHaveBeenCalledWith(500);
      expect(json.mock.calls[0][0].error.code).toBe('INTERNAL_ERROR');
      expect(logSpy).toHaveBeenCalled();
    });
  });
});
