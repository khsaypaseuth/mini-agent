import {
  Controller,
  MaxFileSizeValidator,
  ParseFilePipe,
  Post,
  UploadedFile,
  UseInterceptors,
  Body,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsEnum, IsString } from 'class-validator';
import { FileKind } from '@mini-agent/types';
import type { User } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { FilesService } from './files.service';

class UploadFileBody {
  @IsEnum(FileKind)
  kind!: FileKind;

  @IsString()
  name?: string;
}

const TEN_MB = 10 * 1024 * 1024;

@ApiTags('files')
@ApiBearerAuth()
@Controller('files')
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Post()
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload a file (scan, photo, certificate, proof)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        kind: { type: 'string', enum: Object.values(FileKind) },
      },
    },
  })
  upload(
    @UploadedFile(new ParseFilePipe({ validators: [new MaxFileSizeValidator({ maxSize: TEN_MB })] }))
    file: Express.Multer.File,
    @Body() body: UploadFileBody,
    @CurrentUser() user: User,
  ) {
    return this.filesService.upload(
      file.buffer,
      file.originalname,
      file.mimetype,
      user.id,
      body.kind ?? FileKind.SCAN,
    );
  }
}
