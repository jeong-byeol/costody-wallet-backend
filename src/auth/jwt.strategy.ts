import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../prisma/prisma.service';

// JWT 인증 전략 - JWT 토큰을 검증하고 사용자 정보를 추출
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private prismaService: PrismaService) {
    super({
      // Authorization 헤더의 Bearer 토큰에서 JWT 추출
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false, // 만료된 토큰 거부
      secretOrKey: process.env.JWT_SECRET!, // JWT 시크릿 키
    });
  }

  // JWT 페이로드를 검증하고 사용자 정보 반환
  async validate(payload: any) {
    const user = await this.prismaService.users.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        balance: true,
        created_at: true,
      },
    });

    // 사용자가 존재하지 않으면 예외 발생
    if (!user) {
      throw new UnauthorizedException('유효하지 않은 토큰입니다.');
    }

    return user;
  }
}
