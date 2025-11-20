"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthController = void 0;
const common_1 = require("@nestjs/common");
const auth_service_1 = require("./auth.service");
const register_dto_1 = require("./dto/register.dto");
const login_dto_1 = require("./dto/login.dto");
const jwt_auth_guard_1 = require("./jwt-auth.guard");
const daily_balance_history_dto_1 = require("./dto/daily-balance-history.dto");
let AuthController = class AuthController {
    authService;
    constructor(authService) {
        this.authService = authService;
    }
    async register(registerDto) {
        return this.authService.register(registerDto);
    }
    async verifyEmail(token, res) {
        if (!token) {
            return res.status(400).send(this.getErrorHtml('토큰이 제공되지 않았습니다.'));
        }
        try {
            const result = await this.authService.verifyEmail(token);
            return res.send(this.getSuccessHtml(result));
        }
        catch (error) {
            return res.status(400).send(this.getErrorHtml(error.message));
        }
    }
    getSuccessHtml(result) {
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
    getErrorHtml(errorMessage) {
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
    async resendVerification(email) {
        if (!email) {
            throw new common_1.BadRequestException('이메일이 제공되지 않았습니다.');
        }
        return this.authService.resendVerificationEmail(email);
    }
    async login(loginDto) {
        return this.authService.login(loginDto);
    }
    async getProfile(req) {
        return {
            message: '프로필 조회 성공',
            user: req.user,
        };
    }
    async getDailyBalanceHistory(req, dto) {
        const userId = req.user.id;
        const days = dto.days ?? 7;
        const data = await this.authService.getDailyBalanceHistory(userId, days);
        return {
            message: '일일 자산 추이 조회가 완료되었습니다.',
            data,
        };
    }
};
exports.AuthController = AuthController;
__decorate([
    (0, common_1.Post)('register'),
    __param(0, (0, common_1.Body)(common_1.ValidationPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [register_dto_1.RegisterDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "register", null);
__decorate([
    (0, common_1.Get)('verify-email'),
    __param(0, (0, common_1.Query)('token')),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "verifyEmail", null);
__decorate([
    (0, common_1.Post)('resend-verification'),
    __param(0, (0, common_1.Body)('email')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "resendVerification", null);
__decorate([
    (0, common_1.Post)('login'),
    __param(0, (0, common_1.Body)(common_1.ValidationPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [login_dto_1.LoginDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "login", null);
__decorate([
    (0, common_1.Get)('profile'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "getProfile", null);
__decorate([
    (0, common_1.Get)('daily-balance-history'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)(common_1.ValidationPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, daily_balance_history_dto_1.DailyBalanceHistoryDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "getDailyBalanceHistory", null);
exports.AuthController = AuthController = __decorate([
    (0, common_1.Controller)('auth'),
    __metadata("design:paramtypes", [auth_service_1.AuthService])
], AuthController);
//# sourceMappingURL=auth.controller.js.map