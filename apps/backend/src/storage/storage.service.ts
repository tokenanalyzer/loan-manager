/**
 * StorageService — abstraction over "put a file somewhere and get it
 * back later." `LocalDiskStorageService` is the only implementation
 * for now (writes under `UPLOADS_DIR`, works with zero external
 * config). A `FirebaseStorageService` implementing this same
 * interface is a clean future swap once a real Firebase Storage
 * bucket is configured — nothing above this layer would need to change.
 */
export interface StoredFile {
  storagePath: string;
}

export interface ReadableFile {
  stream: NodeJS.ReadableStream;
  mimeType?: string;
}

export abstract class StorageService {
  abstract save(params: {
    buffer: Buffer;
    originalName: string;
    mimeType: string;
    folder: string;
  }): Promise<StoredFile>;

  abstract getReadStream(storagePath: string): Promise<ReadableFile>;

  abstract delete(storagePath: string): Promise<void>;
}
