import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  Logger,
} from '@nestjs/common';
import { Response, Request } from 'express';
import { Prisma } from '@prisma/client';

interface ErrorBody {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

const HTTP_CODE_MAP: Record<number, string> = {
  400: 'VALIDATION_ERROR',
  401: 'UNAUTHORIZED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  409: 'CONFLICT',
  422: 'UNPROCESSABLE_ENTITY',
};

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();

    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      const { status, body } = this.mapPrismaError(exception);
      res.status(status).json(body);
      return;
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const raw = exception.getResponse();
      res.status(status).json(this.mapHttpException(status, raw));
      return;
    }

    this.logger.error(
      `[${req.method} ${req.url}] Unhandled error`,
      exception instanceof Error ? exception.stack : String(exception),
    );
    res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'サーバー内部でエラーが発生しました' },
    } satisfies ErrorBody);
  }

  private mapPrismaError(err: Prisma.PrismaClientKnownRequestError): { status: number; body: ErrorBody } {
    switch (err.code) {
      case 'P2002':
        return {
          status: 409,
          body: { error: { code: 'CONFLICT', message: '一意制約違反: 既に同じ値が登録されています' } },
        };
      case 'P2025':
        return {
          status: 404,
          body: { error: { code: 'NOT_FOUND', message: '対象のレコードが見つかりませんでした' } },
        };
      default:
        this.logger.error(`Unhandled Prisma error [${err.code}]: ${err.message}`);
        return {
          status: 500,
          body: { error: { code: 'INTERNAL_ERROR', message: 'サーバー内部でエラーが発生しました' } },
        };
    }
  }

  private mapHttpException(status: number, raw: unknown): ErrorBody {
    const code = HTTP_CODE_MAP[status] ?? (status >= 500 ? 'INTERNAL_ERROR' : 'ERROR');

    if (typeof raw !== 'object' || raw === null) {
      return { error: { code, message: String(raw) } };
    }

    const r = raw as Record<string, unknown>;

    // ValidationPipe produces { message: string[], error: string, statusCode }
    if (Array.isArray(r.message)) {
      return {
        error: {
          code,
          message: 'リクエストの内容が不正です',
          details: (r.message as string[]).map((m) => ({ message: m })),
        },
      };
    }

    // CSV import / row-level errors: UnprocessableEntityException({ errors: [...] })
    if (Array.isArray(r.errors)) {
      type RowError = { row?: number; column?: string; message: string };
      return {
        error: {
          code,
          message: 'バリデーションエラーがあります',
          details: (r.errors as RowError[]).map((e) => ({
            ...(e.column !== undefined && { field: e.column }),
            ...(e.row !== undefined && { row: e.row }),
            message: e.message,
          })),
        },
      };
    }

    return {
      error: {
        code,
        message: typeof r.message === 'string' ? r.message : code,
      },
    };
  }
}
