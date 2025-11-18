import { IsNotEmpty, IsString } from 'class-validator';

export class WithdrawTxDto {
  @IsNotEmpty({ message: 'txId는 필수입니다.' })
  @IsString({ message: 'txId는 문자열이어야 합니다.' })
  txId: string;
}

