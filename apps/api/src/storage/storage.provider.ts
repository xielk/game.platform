export interface StoredObject { key: string; publicPath: string; size: number; sha256: string; mimeType: string; originalName: string; }
export interface StorageProvider {
  put(buffer: Buffer, originalName: string, mimeType: string, namespace?: string): Promise<StoredObject>;
  read(key: string): Promise<Buffer>;
  exists(key: string): Promise<boolean>;
  remove(key: string): Promise<void>;
}
