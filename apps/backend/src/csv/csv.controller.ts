import {
  Controller,
  Get,
  Post,
  Req,
  Res,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { Response } from 'express';
import { SessionGuard } from '../auth/guards/session.guard';
import { AuthenticatedRequest } from '../auth/types/authenticated-request';
import { CsvService } from './csv.service';

@Controller('csv')
@UseGuards(SessionGuard)
export class CsvController {
  constructor(private readonly csvService: CsvService) {}

  @Post('import')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  import(
    @Req() req: AuthenticatedRequest,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 10 * 1024 * 1024 }),
          // Accept common CSV MIME types: text/csv, text/plain, application/csv,
          // application/vnd.ms-excel (sent by some browsers/OS on Windows)
          new FileTypeValidator({
            fileType: /^(text\/(csv|plain)|application\/(csv|vnd\.ms-excel))$/,
          }),
        ],
      }),
    )
    file: Express.Multer.File,
  ) {
    return this.csvService.import(
      { userAccountId: req.userAccount.id, tenantId: req.userAccount.tenantId },
      file.buffer,
    );
  }

  @Get('export')
  async export(@Req() req: AuthenticatedRequest, @Res() res: Response) {
    const buffer = await this.csvService.export({
      userAccountId: req.userAccount.id,
      tenantId: req.userAccount.tenantId,
    });
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="employees.csv"');
    res.send(buffer);
  }
}
