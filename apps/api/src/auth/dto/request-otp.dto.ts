import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsString } from 'class-validator';
import { OtpChannel } from '@mini-agent/types';

export class RequestOtpDto {
  @ApiProperty({ enum: OtpChannel, example: OtpChannel.WHATSAPP })
  @IsEnum(OtpChannel)
  channel!: OtpChannel;

  @ApiProperty({ example: '+8562012345678' })
  @IsString()
  contact!: string;
}
