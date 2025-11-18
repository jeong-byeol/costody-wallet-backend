import { IsNotEmpty, IsString, Matches } from 'class-validator';

// Cold Vault 이동 요청 DTO
export class ColdMoveRequestDto {
  @IsNotEmpty({ message: '금액은 필수입니다.' })
  @IsString({ message: '금액은 문자열이어야 합니다.' })
  @Matches(/^\d+(\.\d+)?$/, { message: '금액은 숫자 형식이어야 합니다.' })
  amountEth: string; // ETH 단위
}

// Cold Vault 이동 승인/실행 DTO
export class ColdMoveActionDto {
  @IsNotEmpty({ message: 'moveId는 필수입니다.' })
  @IsString({ message: 'moveId는 문자열이어야 합니다.' })
  @Matches(/^0x[a-fA-F0-9]{64}$/, { message: 'moveId는 0x로 시작하는 64자리 hex 문자열이어야 합니다.' })
  moveId: string; // bytes32 형식
}

