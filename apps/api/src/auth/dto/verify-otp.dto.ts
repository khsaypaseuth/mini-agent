import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsString, Length } from 'class-validator';
import { OtpChannel } from '@mini-agent/types';

export class VerifyOtpDto {
  @ApiProperty({ enum: OtpChannel })
  @IsEnum(OtpChannel)
  channel!: OtpChannel;

  @ApiProperty({ example: '+8562012345678' })
  @IsString()
  contact!: string;

  @ApiProperty({ example: '123456', minLength: 6, maxLength: 6 })
  @IsString()
  @Length(6, 6)
  code!: string;
}
