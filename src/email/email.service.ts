import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    // SMTP 설정 (Gmail 예시)
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT!), // 이메일 전송 시 암호화 사용 포트 (TLS)
      secure: false, // TLS 사용
      auth: {
        // 발신자 메일
        user: process.env.SMTP_USER, // Gmail 주소
        pass: process.env.SMTP_PASS, // Gmail 앱 비밀번호
      },
    });
  }

  // 인증 이메일 전송
  async sendVerificationEmail(email: string, token: string): Promise<void> {
    // 백엔드 API를 직접 호출하도록 변경
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
    } catch (error) {
      console.error('이메일 전송 실패:', error);
      throw new Error('이메일 전송에 실패했습니다.');
    }
  }

  // 인증 완료 환영 이메일 (선택사항)
  async sendWelcomeEmail(email: string, userName: string): Promise<void> {
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
    } catch (error) {
      console.error('환영 이메일 전송 실패:', error);
      // 환영 이메일 실패는 치명적이지 않으므로 에러를 throw하지 않음
    }
  }
}