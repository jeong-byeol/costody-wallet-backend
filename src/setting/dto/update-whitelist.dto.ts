import { IsEthereumAddress, IsNotEmpty } from 'class-validator';

export class UpdateWhitelistDto {
  @IsNotEmpty({ message: '출금 주소는 필수입니다.' })
  @IsEthereumAddress({ message: '유효한 이더리움 주소를 입력하세요.' })
  to: string;
}

