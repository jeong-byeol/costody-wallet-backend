import { IsNotEmpty, IsString, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class SetDailyLimitDto {
  @IsNotEmpty({ message: '일일 출금 한도는 필수입니다.' })
  @IsNumber({}, { message: '일일 출금 한도는 숫자여야 합니다.' })
  @Type(() => Number)
  @Min(0, { message: '일일 출금 한도는 0 이상이어야 합니다. (0은 무제한)' })
  maxEth: number; // ETH 단위로 받아서 Wei로 변환
}

