export abstract class StorageService {
  abstract save(key: string, buffer: Buffer, mimetype: string): Promise<void>;
  abstract delete(key: string): Promise<void>;
  abstract resolveAbsolutePath(key: string): string;
}
