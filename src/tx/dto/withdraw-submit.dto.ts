import { IsEthereumAddress, IsNotEmpty, IsString } from 'class-validator';

export class WithdrawSubmitDto {
  @IsEthereumAddress({ message: '유효한 이더리움 주소를 입력해주세요.' })
  to: string;

  @IsNotEmpty({ message: '출금 금액은 필수입니다.' })
  @IsString({ message: '출금 금액은 문자열 형식이어야 합니다.' })
  amount: string;

  @IsNotEmpty({ message: '비밀번호는 필수입니다.' })
  @IsString({ message: '비밀번호는 문자열이어야 합니다.' })
  password: string;
}

