import { Injectable } from '@nestjs/common';
import { mkdir, writeFile, unlink } from 'fs/promises';
import * as path from 'path';
import { StorageService } from './storage.service';

@Injectable()
export class LocalStorageService extends StorageService {
  private readonly basePath: string;

  constructor() {
    super();
    this.basePath = process.env.STORAGE_LOCAL_PATH ?? path.join(process.cwd(), 'uploads');
  }

  async save(key: string, buffer: Buffer, _mimetype: string): Promise<void> {
    const filePath = this.resolveAbsolutePath(key);
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, buffer);
  }

  async delete(key: string): Promise<void> {
    const filePath = this.resolveAbsolutePath(key);
    await unlink(filePath).catch(() => {
      // Ignore if file does not exist
    });
  }

  resolveAbsolutePath(key: string): string {
    // Prevent path traversal by normalizing and stripping leading ../
    const safe = path.normalize(key).replace(/^(\.\.[/\\])+/, '');
    return path.join(this.basePath, safe);
  }
}
