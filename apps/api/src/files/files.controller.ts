import {
  Controller,
  Get,
  MaxFileSizeValidator,
  Param,
  ParseFilePipe,
  Post,
  Res,
  UploadedFile,
  UseInterceptors,
  Body,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { FileKind } from '@mini-agent/types';
import type { User } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { FilesService } from './files.service';

class UploadFileBody {
  @IsEnum(FileKind)
  kind!: FileKind;

  @IsOptional()
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
    @UploadedFile(
      new ParseFilePipe({ validators: [new MaxFileSizeValidator({ maxSize: TEN_MB })] }),
    )
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

  @Public()
  @Get(':id/raw')
  @ApiOperation({ summary: 'Stream raw file bytes (used by local-disk storage driver)' })
  async raw(@Param('id') id: string, @Res() res: Response) {
    const { buffer, mime } = await this.filesService.readRaw(id);
    res.setHeader('Content-Type', mime);
    res.send(buffer);
  }
}
