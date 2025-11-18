import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './jwt.strategy';
import { EmailModule } from '../email/email.module';

// 인증 모듈 - 회원가입, 로그인, JWT 인증 기능 제공
@Module({
  imports: [
    PassportModule, // Passport 인증 라이브러리
    EmailModule, // Email 서비스 모듈
    JwtModule.register({
      secret: process.env.JWT_SECRET!, // JWT 시크릿 키
      signOptions: {
        expiresIn: '9h', // 토큰 만료 시간 (9시간)
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService, JwtModule], // 다른 모듈에서 AuthService 사용 가능
})
export class AuthModule {}
