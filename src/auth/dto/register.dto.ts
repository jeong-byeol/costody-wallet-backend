import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MinLength,
  IsEnum,
  IsOptional,
} from 'class-validator';

// 회원가입 요청 DTO
export class RegisterDto {
  @IsEmail({}, { message: '올바른 이메일 형식이 아닙니다.' })
  @IsNotEmpty({ message: '이메일은 필수 항목입니다.' })
  email: string;

  @IsString()
  @MinLength(8, { message: '비밀번호는 최소 8자 이상이어야 합니다.' })
  @IsNotEmpty({ message: '비밀번호는 필수 항목입니다.' })
  password: string;

  @IsEnum(['user', 'admin'], {
    message: '역할은 user 또는 admin이어야 합니다.',
  })
  @IsOptional()
  role?: 'user' | 'admin';
}
