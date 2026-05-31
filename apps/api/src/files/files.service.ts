import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  CreateBucketCommand,
  GetObjectCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { mkdir, readFile, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join, extname } from 'path';
import { randomUUID } from 'crypto';
import { FileKind } from '@mini-agent/types';
import type { File } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const SIGNED_URL_TTL_SECONDS = 3600; // 1 hour

type StorageDriver = 'minio' | 'disk';

/**
 * File storage with two drivers:
 *  - 'minio'  → S3-compatible (production / when Docker is running)
 *  - 'disk'   → local filesystem fallback (dev without Docker)
 *
 * The driver is picked once at startup based on whether MinIO is reachable,
 * so certificate/label/photo uploads always work locally.
 */
@Injectable()
export class FilesService {
  private readonly logger = new Logger(FilesService.name);
  private readonly s3: S3Client;
  private readonly bucket: string;
  private readonly localDir: string;
  private readonly appUrl: string;
  private driver: StorageDriver = 'disk';

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    this.bucket = this.config.get<string>('MINIO_BUCKET') ?? 'mini-agent';
    this.localDir =
      this.config.get<string>('LOCAL_STORAGE_DIR') ?? join(process.cwd(), '.local-storage');
    this.appUrl = this.config.get<string>('APP_URL') ?? 'http://localhost:3000';

    const endpoint = this.config.get<string>('MINIO_ENDPOINT') ?? 'localhost';
    const port = this.config.get<number>('MINIO_PORT') ?? 9000;
    const useSsl = this.config.get<string>('MINIO_USE_SSL') === 'true';

    this.s3 = new S3Client({
      endpoint: `${useSsl ? 'https' : 'http'}://${endpoint}:${port}`,
      region: 'us-east-1',
      credentials: {
        accessKeyId: this.config.get<string>('MINIO_ACCESS_KEY') ?? 'minioadmin',
        secretAccessKey: this.config.get<string>('MINIO_SECRET_KEY') ?? 'minioadmin',
      },
      forcePathStyle: true,
    });
  }

  async onModuleInit() {
    try {
      await this.s3.send(new HeadBucketCommand({ Bucket: this.bucket }));
      this.driver = 'minio';
      this.logger.log(`Storage driver: minio (bucket: ${this.bucket})`);
      return;
    } catch {
      try {
        await this.s3.send(new CreateBucketCommand({ Bucket: this.bucket }));
        this.driver = 'minio';
        this.logger.log(`Storage driver: minio (created bucket: ${this.bucket})`);
        return;
      } catch {
        // fall through to disk
      }
    }
    this.driver = 'disk';
    await mkdir(this.localDir, { recursive: true });
    this.logger.warn(`MinIO unavailable — using local disk storage at ${this.localDir}`);
  }

  // ─── Public interface ──────────────────────────────────────────────────

  async upload(
    buffer: Buffer,
    originalname: string,
    mimetype: string,
    ownerId: string,
    kind: FileKind,
  ): Promise<File> {
    const ext = extname(originalname).toLowerCase() || '.bin';
    const storageKey = `${kind}/${ownerId}/${randomUUID()}${ext}`;

    if (this.driver === 'minio') {
      await this.s3.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: storageKey,
          Body: buffer,
          ContentType: mimetype,
        }),
      );
    } else {
      const fullPath = join(this.localDir, storageKey);
      await mkdir(join(fullPath, '..'), { recursive: true });
      await writeFile(fullPath, buffer);
    }

    return this.prisma.file.create({
      data: { ownerId, kind, storageKey, mime: mimetype, size: buffer.length },
    });
  }

  /** A URL the browser can use to fetch the file. */
  async getDownloadUrl(file: Pick<File, 'id' | 'storageKey'>): Promise<string> {
    if (this.driver === 'minio') {
      const command = new GetObjectCommand({ Bucket: this.bucket, Key: file.storageKey });
      return getSignedUrl(this.s3, command, { expiresIn: SIGNED_URL_TTL_SECONDS });
    }
    return `${this.appUrl}/api/v1/files/${file.id}/raw`;
  }

  /** Read raw bytes (used by the local-disk raw endpoint). */
  async readRaw(id: string): Promise<{ buffer: Buffer; mime: string; storageKey: string }> {
    const file = await this.prisma.file.findUnique({ where: { id } });
    if (!file) throw new NotFoundException('File not found');

    if (this.driver === 'minio') {
      const res = await this.s3.send(
        new GetObjectCommand({ Bucket: this.bucket, Key: file.storageKey }),
      );
      const bytes = await res.Body!.transformToByteArray();
      return { buffer: Buffer.from(bytes), mime: file.mime, storageKey: file.storageKey };
    }

    const fullPath = join(this.localDir, file.storageKey);
    if (!existsSync(fullPath)) throw new NotFoundException('File data missing');
    return { buffer: await readFile(fullPath), mime: file.mime, storageKey: file.storageKey };
  }

  async findById(id: string): Promise<File | null> {
    return this.prisma.file.findUnique({ where: { id } });
  }
}
