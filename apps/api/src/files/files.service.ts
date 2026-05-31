import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  CreateBucketCommand,
  GetObjectCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';
import { extname } from 'path';
import { FileKind } from '@mini-agent/types';
import type { File } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const SIGNED_URL_TTL_SECONDS = 3600; // 1 hour

@Injectable()
export class FilesService {
  private readonly logger = new Logger(FilesService.name);
  private readonly s3: S3Client;
  private readonly bucket: string;
  private available = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    this.bucket = this.config.get<string>('MINIO_BUCKET') ?? 'mini-agent';
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
      this.available = true;
      this.logger.log(`Connected to MinIO — bucket: ${this.bucket}`);
    } catch {
      try {
        await this.s3.send(new CreateBucketCommand({ Bucket: this.bucket }));
        this.available = true;
        this.logger.log(`Created MinIO bucket: ${this.bucket}`);
      } catch {
        this.logger.warn('MinIO not available — file uploads will fail gracefully. Start Docker to enable.');
      }
    }
  }

  // ─── Public interface ──────────────────────────────────────────────────

  async upload(
    buffer: Buffer,
    originalname: string,
    mimetype: string,
    ownerId: string,
    kind: FileKind,
  ): Promise<File> {
    if (!this.available) {
      throw new ServiceUnavailableException('File storage not available — MinIO is not running');
    }

    const ext = extname(originalname).toLowerCase() || '.bin';
    const storageKey = `${kind}/${ownerId}/${randomUUID()}${ext}`;

    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: storageKey,
        Body: buffer,
        ContentType: mimetype,
      }),
    );

    return this.prisma.file.create({
      data: {
        ownerId,
        kind,
        storageKey,
        mime: mimetype,
        size: buffer.length,
      },
    });
  }

  async getSignedDownloadUrl(storageKey: string): Promise<string> {
    if (!this.available) throw new ServiceUnavailableException('File storage not available');
    const command = new GetObjectCommand({ Bucket: this.bucket, Key: storageKey });
    return getSignedUrl(this.s3, command, { expiresIn: SIGNED_URL_TTL_SECONDS });
  }

  async findById(id: string): Promise<File | null> {
    return this.prisma.file.findUnique({ where: { id } });
  }
}
