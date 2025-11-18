import { IsString, IsNotEmpty } from 'class-validator';

// 입금 요청 시 프론트에서 받을 데이터 형식
export class DepositDto {
  @IsString()
  @IsNotEmpty()
  txHash: string; // 트랜잭션 해시 값
}

