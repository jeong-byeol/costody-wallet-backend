import { IsNotEmpty, IsString, Matches } from 'class-validator';

// Cold Vault 입금 요청 DTO
export class ColdDepositDto {
  @IsNotEmpty({ message: '금액은 필수입니다.' })
  @IsString({ message: '금액은 문자열이어야 합니다.' })
  @Matches(/^\d+(\.\d+)?$/, { message: '금액은 숫자 형식이어야 합니다.' })
  amountEth: string; // ETH 단위
}

