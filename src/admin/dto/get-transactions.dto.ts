import { IsOptional, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';

// 입출금 기록 조회 요청 DTO (선택적 쿼리 파라미터)
export class GetTransactionsDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'limit은 숫자여야 합니다.' })
  @Min(1, { message: 'limit은 1 이상이어야 합니다.' })
  limit?: number; // 조회할 최대 개수 (선택, 기본값: 100)
}

