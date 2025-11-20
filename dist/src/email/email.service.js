"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmailService = void 0;
const common_1 = require("@nestjs/common");
const nodemailer = __importStar(require("nodemailer"));
let EmailService = class EmailService {
    transporter;
    constructor() {
        this.transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: parseInt(process.env.SMTP_PORT),
            secure: false,
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
        });
    }
    async sendVerificationEmail(email, token) {
        const backendUrl = process.env.BACKEND_URL;
        const verificationUrl = `${backendUrl}/auth/verify-email?token=${token}`;
        try {
            await this.transporter.sendMail({
                from: `"${process.env.APP_NAME}" <${process.env.SMTP_USER}>`,
                to: email,
                subject: '이메일 인증을 완료해주세요',
                html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>이메일 인증</h2>
            <p>회원가입을 완료하려면 아래 버튼을 클릭하여 이메일 인증을 완료해주세요.</p>
            <p>이 링크는 2시간 동안 유효합니다.</p>
            
            <a href="${verificationUrl}" 
               style="display: inline-block; padding: 12px 24px; background-color: #4CAF50; 
                      color: white; text-decoration: none; border-radius: 4px; margin: 20px 0;">
              이메일 인증하기
            </a>
          
            <p style="color: #666; font-size: 12px;">
              이 이메일을 요청하지 않으셨다면 무시하셔도 됩니다.
            </p>
          </div>
        `,
            });
        }
        catch (error) {
            console.error('이메일 전송 실패:', error);
            throw new Error('이메일 전송에 실패했습니다.');
        }
    }
    async sendWelcomeEmail(email, userName) {
        try {
            await this.transporter.sendMail({
                from: `"${process.env.APP_NAME}" <${process.env.SMTP_USER}>`,
                to: email,
                subject: '가입을 환영합니다!',
                html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>가입을 환영합니다! 🎉</h2>
            <p>${userName}님, 이메일 인증이 완료되었습니다.</p>
            <p>이제 Custody Wallet의 모든 서비스를 이용하실 수 있습니다.</p>
          </div>
        `,
            });
        }
        catch (error) {
            console.error('환영 이메일 전송 실패:', error);
        }
    }
};
exports.EmailService = EmailService;
exports.EmailService = EmailService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], EmailService);
//# sourceMappingURL=email.service.js.map