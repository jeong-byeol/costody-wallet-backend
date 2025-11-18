import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Request,
  ValidationPipe,
  Query,
  BadRequestException,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import { DailyBalanceHistoryDto } from './dto/daily-balance-history.dto';

// 인증 관련 API 엔드포인트를 제공하는 컨트롤러
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // 회원가입 API: POST /auth/register
  @Post('register')
  async register(@Body(ValidationPipe) registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  // 이메일 인증 API: GET /auth/verify-email?token=xxx
  // 사용자가 이메일 링크를 클릭하면 이 엔드포인트가 호출되어 HTML 페이지를 반환
  @Get('verify-email')
  async verifyEmail(@Query('token') token: string, @Res() res: Response) {
    if (!token) {
      return res.status(400).send(this.getErrorHtml('토큰이 제공되지 않았습니다.'));
    }

    try {
      // 인증 처리 - authService.verifyEmail() 함수 실행
      const result = await this.authService.verifyEmail(token);

      // 성공 페이지 HTML 반환
      return res.send(this.getSuccessHtml(result));
    } catch (error) {
      // 에러 페이지 HTML 반환
      return res.status(400).send(this.getErrorHtml(error.message));
    }
  }

  // 성공 페이지 HTML 생성 (private 헬퍼 메서드)
  private getSuccessHtml(result: any): string {
    
    return `
      <!DOCTYPE html>
      <html lang="ko">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>이메일 인증 완료</title>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          }
          .container {
            background: white;
            padding: 50px 40px;
            border-radius: 15px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.2);
            text-align: center;
            max-width: 500px;
            width: 90%;
            animation: slideUp 0.5s ease-out;
          }
          @keyframes slideUp {
            from {
              opacity: 0;
              transform: translateY(30px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          .success-icon {
            width: 80px;
            height: 80px;
            background: #4CAF50;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 25px;
            animation: scaleIn 0.5s ease-out 0.2s both;
          }
          @keyframes scaleIn {
            from {
              transform: scale(0);
            }
            to {
              transform: scale(1);
            }
          }
          .success-icon::after {
            content: '✓';
            font-size: 48px;
            color: white;
            font-weight: bold;
          }
          h1 {
            color: #333;
            margin-bottom: 15px;
            font-size: 28px;
          }
          .email {
            color: #667eea;
            font-weight: 600;
            margin-bottom: 10px;
          }
          p {
            color: #666;
            line-height: 1.6;
            margin-bottom: 30px;
            font-size: 16px;
          }
          .button {
            display: inline-block;
            padding: 14px 35px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            text-decoration: none;
            border-radius: 8px;
            font-weight: 600;
            font-size: 16px;
            transition: transform 0.2s, box-shadow 0.2s;
            box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
          }
          .button:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(102, 126, 234, 0.6);
          }
          .redirect-info {
            background: #f5f5f5;
            padding: 15px;
            border-radius: 8px;
            margin-top: 25px;
            font-size: 13px;
            color: #888;
          }
          .countdown {
            font-weight: 600;
            color: #667eea;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="success-icon"></div>
          <h1>이메일 인증 완료! 🎉</h1>
          <div class="email">${result.user.email}</div>
          <p>
            이메일 인증이 성공적으로 완료되었습니다.<br>
            이제 모든 서비스를 이용하실 수 있습니다.
          </p>
      </body>
      </html>
    `;
  }

  // 에러 페이지 HTML 생성 (private 헬퍼 메서드)
  private getErrorHtml(errorMessage: string): string {
    const frontendUrl = process.env.FRONTEND_URL;
    
    return `
      <!DOCTYPE html>
      <html lang="ko">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>이메일 인증 실패</title>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
          }
          .container {
            background: white;
            padding: 50px 40px;
            border-radius: 15px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.2);
            text-align: center;
            max-width: 500px;
            width: 90%;
            animation: slideUp 0.5s ease-out;
          }
          @keyframes slideUp {
            from {
              opacity: 0;
              transform: translateY(30px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          .error-icon {
            width: 80px;
            height: 80px;
            background: #f44336;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 25px;
            animation: scaleIn 0.5s ease-out 0.2s both;
          }
          @keyframes scaleIn {
            from {
              transform: scale(0);
            }
            to {
              transform: scale(1);
            }
          }
          .error-icon::after {
            content: '✗';
            font-size: 48px;
            color: white;
            font-weight: bold;
          }
          h1 {
            color: #333;
            margin-bottom: 20px;
            font-size: 28px;
          }
          .error-message {
            background: #ffebee;
            color: #c62828;
            padding: 18px;
            border-radius: 8px;
            margin-bottom: 25px;
            border-left: 4px solid #f44336;
            font-weight: 500;
          }
          p {
            color: #666;
            line-height: 1.6;
            margin-bottom: 30px;
            font-size: 15px;
          }
          .button {
            display: inline-block;
            padding: 14px 30px;
            background: #2196F3;
            color: white;
            text-decoration: none;
            border-radius: 8px;
            font-weight: 600;
            margin: 5px;
            transition: transform 0.2s, box-shadow 0.2s;
            box-shadow: 0 4px 15px rgba(33, 150, 243, 0.3);
            font-size: 15px;
          }
          .button:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(33, 150, 243, 0.5);
          }
          .button.secondary {
            background: #757575;
            box-shadow: 0 4px 15px rgba(117, 117, 117, 0.3);
          }
          .button.secondary:hover {
            box-shadow: 0 6px 20px rgba(117, 117, 117, 0.5);
          }
          .button-group {
            display: flex;
            flex-direction: column;
            gap: 10px;
            align-items: center;
          }
          @media (min-width: 500px) {
            .button-group {
              flex-direction: row;
              justify-content: center;
            }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="error-icon"></div>
          <h1>인증 실패</h1>
          <div class="error-message">
            ${errorMessage}
          </div>
          <p>
            인증 링크가 만료되었거나 유효하지 않습니다.<br>
            새로운 인증 이메일을 받으려면 아래 버튼을 클릭해주세요.
          </p>
          <div class="button-group">
            <a href="${frontendUrl}" class="button secondary">
              홈으로 가기
            </a>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  // 인증 이메일 재발송 API: POST /auth/resend-verification
  @Post('resend-verification')
  async resendVerification(@Body('email') email: string) {
    if (!email) {
      throw new BadRequestException('이메일이 제공되지 않았습니다.');
    }
    return this.authService.resendVerificationEmail(email);
  }

  // 로그인 API: POST /auth/login
  @Post('login')
  async login(@Body(ValidationPipe) loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  // 프로필 조회 API (JWT 인증 필요): GET /auth/profile
  @Get('profile')
  @UseGuards(JwtAuthGuard) // JWT 인증 가드 적용
  async getProfile(@Request() req) {
    // JwtStrategy의 validate 메서드에서 반환된 사용자 정보
    return {
      message: '프로필 조회 성공',
      user: req.user,
    };
  }

  // 일일 자산 추이 조회 API (JWT 인증 필요): GET /auth/daily-balance-history
  @Get('daily-balance-history')
  @UseGuards(JwtAuthGuard) // JWT 인증 가드 적용
  async getDailyBalanceHistory(
    @Request() req,
    @Query(ValidationPipe) dto: DailyBalanceHistoryDto,
  ) {
    const userId = req.user.id;
    const days = dto.days ?? 7;

    const data = await this.authService.getDailyBalanceHistory(userId, days);

    return {
      message: '일일 자산 추이 조회가 완료되었습니다.',
      data,
    };
  }
}
