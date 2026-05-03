import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Req,
  Res,
  NotFoundException,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { createReadStream, existsSync } from 'fs';
import * as path from 'path';
import { StreamableFile } from '@nestjs/common';
import { SessionGuard } from '../auth/guards/session.guard';
import { AuthenticatedRequest } from '../auth/types/authenticated-request';
import { StorageService } from '../storage/storage.service';

const MIME_MAP: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
};

@Controller('media')
@UseGuards(SessionGuard)
export class MediaController {
  constructor(private readonly storage: StorageService) {}

  @Get('photos/:tenantId/:filename')
  servePhoto(
    @Param('tenantId', ParseIntPipe) tenantId: number,
    @Param('filename') filename: string,
    @Req() req: AuthenticatedRequest,
    @Res({ passthrough: true }) res: Response,
  ): StreamableFile {
    if (req.userAccount.tenantId !== tenantId) {
      throw new NotFoundException();
    }

    const key = `photos/${tenantId}/${filename}`;
    const filePath = this.storage.resolveAbsolutePath(key);

    if (!existsSync(filePath)) {
      throw new NotFoundException();
    }

    const ext = path.extname(filename).toLowerCase();
    const contentType = MIME_MAP[ext] ?? 'application/octet-stream';
    res.set('Content-Type', contentType);
    res.set('Cache-Control', 'private, max-age=3600');

    return new StreamableFile(createReadStream(filePath));
  }
}
