import { IsNotEmpty, IsString, IsEnum } from 'class-validator';

// 유저 상태 업데이트 요청 DTO
export class UpdateUserStatusDto {
  @IsNotEmpty({ message: '사용자 ID는 필수입니다.' })
  @IsString({ message: '사용자 ID는 문자열이어야 합니다.' })
  userId: string;

  @IsNotEmpty({ message: '상태는 필수입니다.' })
  @IsEnum(['ACTIVE', 'FROZEN'], {
    message: '상태는 ACTIVE 또는 FROZEN이어야 합니다.',
  })
  status: 'ACTIVE' | 'FROZEN';
}

