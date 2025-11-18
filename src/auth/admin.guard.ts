import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';

// Admin 역할 체크 가드 - 관리자만 접근 가능하도록 보호
@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // 사용자 정보가 없거나 admin 역할이 아니면 접근 거부
    if (!user || user.role !== 'admin') {
      throw new ForbiddenException('관리자 권한이 필요합니다.');
    }

    return true;
  }
}

