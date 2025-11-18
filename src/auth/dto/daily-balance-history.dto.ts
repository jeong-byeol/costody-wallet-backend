import { IsOptional, IsNumber, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

// 일일 자산 추이 조회 요청 DTO
export class DailyBalanceHistoryDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'days는 숫자여야 합니다.' })
  @Min(1, { message: 'days는 1 이상이어야 합니다.' })
  @Max(365, { message: 'days는 365 이하여야 합니다.' })
  days?: number; // 조회할 일수 (기본값: 7)
}

