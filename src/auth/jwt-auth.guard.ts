import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

// JWT 인증 가드 - 보호된 라우트에 JWT 인증 적용
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    // JWT 전략을 사용하여 인증 수행
    return super.canActivate(context);
  }
}
