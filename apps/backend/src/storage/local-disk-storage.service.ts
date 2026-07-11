import { randomUUID } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { ReadableFile, StorageService, StoredFile } from './storage.service';

/**
 * LocalDiskStorageService — writes files to a local directory
 * (`UPLOADS_DIR`, default `./uploads`).
 *
 * This is a genuinely working implementation, not a stub — it's the
 * default because this environment has no live Firebase Storage
 * bucket to integrate against. Fine for local dev / single-instance
 * deployments; a multi-instance production deployment should swap in
 * a `FirebaseStorageService` (or S3, etc.) implementing the same
 * `StorageService` interface.
 */
@Injectable()
export class LocalDiskStorageService extends StorageService {
  private readonly rootDir: string;

  constructor(config: ConfigService) {
    super();
    this.rootDir = config.get<string>('storage.localRoot') ?? path.join(process.cwd(), 'uploads');
    fs.mkdirSync(this.rootDir, { recursive: true });
  }

  async save({
    buffer,
    originalName,
    folder,
  }: {
    buffer: Buffer;
    originalName: string;
    mimeType: string;
    folder: string;
  }): Promise<StoredFile> {
    const dir = path.join(this.rootDir, folder);
    fs.mkdirSync(dir, { recursive: true });

    const ext = path.extname(originalName);
    const filename = `${randomUUID()}${ext}`;
    fs.writeFileSync(path.join(dir, filename), buffer);

    return { storagePath: path.join(folder, filename) };
  }

  async getReadStream(storagePath: string): Promise<ReadableFile> {
    const fullPath = path.join(this.rootDir, storagePath);
    if (!fs.existsSync(fullPath)) {
      throw new Error(`File not found at storagePath: ${storagePath}`);
    }
    return { stream: fs.createReadStream(fullPath) };
  }

  async delete(storagePath: string): Promise<void> {
    const fullPath = path.join(this.rootDir, storagePath);
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }
  }
}
