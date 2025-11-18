import { IsNotEmpty, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';

// Omnibus 지갑 동결/해제 요청 DTO
export class PauseOmnibusDto {
  @IsNotEmpty({ message: '동결 상태는 필수입니다.' })
  @IsBoolean({ message: '동결 상태는 boolean 값이어야 합니다.' })
  @Type(() => Boolean)
  paused: boolean; // true: 동결, false: 해제
}

