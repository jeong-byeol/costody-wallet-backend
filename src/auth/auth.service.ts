import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { v4 as uuidv4 } from 'uuid';
import { EmailService } from '../email/email.service';
import { formatEther, parseEther } from 'ethers';

// 인증 관련 비즈니스 로직을 처리하는 서비스
@Injectable()
export class AuthService {
  constructor(
    private prismaService: PrismaService,
    private jwtService: JwtService,
    private emailService: EmailService,
  ) {}

  // 회원가입 로직
  async register(registerDto: RegisterDto) {
    const { email, password, role } = registerDto;

    // 이메일 중복 체크
    const existingUser = await this.prismaService.users.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictException('이미 등록된 이메일입니다.');
    }

    // 비밀번호 해시화 (bcrypt로 암호화)
    const saltRounds = 10; //해시 반복 횟수
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // 이메일 인증 토큰 생성 (UUID 사용)
    const verificationToken = uuidv4();
    const verificationExpires = new Date();
    verificationExpires.setHours(verificationExpires.getHours() + 2); // 2시간 후 만료

    // 사용자 생성 (이메일 미인증 상태)
    const user = await this.prismaService.users.create({
      data: {
        email,
        password: hashedPassword,
        role: role || 'admin', // 기본값은 admin (스키마의 기본값과 동일)
        email_verified: false, // 초기 상태는 미인증
        email_verification_token: verificationToken,
        email_verification_expires: verificationExpires,
      },
      select: {
        id: true,
        email: true,
        role: true,
        balance: true,
        email_verified: true,
        created_at: true,
      },
    });

    // 인증 이메일 전송
    try {
      await this.emailService.sendVerificationEmail(email, verificationToken);
    } catch (error) {
      // 이메일 전송 실패 시 사용자 삭제 (롤백)
      await this.prismaService.users.delete({ where: { id: user.id } });
      throw new BadRequestException(
        '이메일 전송에 실패했습니다. 다시 시도해주세요.',
      );
    }

    return {
      message:
        '회원가입이 완료되었습니다. 이메일을 확인하여 인증을 완료해주세요.',
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        email_verified: user.email_verified,
      },
    };
  }
  // ------------------------------------------------------------
  // 이메일 인증 처리
  async verifyEmail(token: string) {
    // 토큰으로 사용자 찾기
    const user = await this.prismaService.users.findUnique({
      where: { email_verification_token: token },
    });

    if (!user) {
      throw new BadRequestException('유효하지 않은 인증 링크입니다.');
    }

    // 이미 인증된 경우
    if (user.email_verified) {
      throw new BadRequestException('이미 인증된 이메일입니다.');
    }

    // 토큰 만료 확인
    if (
      user.email_verification_expires &&
      user.email_verification_expires < new Date()
    ) {
      throw new BadRequestException(
        '인증 링크가 만료되었습니다. 재발송을 요청해주세요.',
      );
    }

    // 이메일 인증 완료 처리
    const updatedUser = await this.prismaService.users.update({
      where: { id: user.id },
      data: {
        email_verified: true,
        email_verification_token: null, // 토큰 삭제
        email_verification_expires: null,
      },
      select: {
        id: true,
        email: true,
        role: true,
        email_verified: true,
      },
    });

    // JWT 토큰 생성 (인증 후 자동 로그인)
    const accessToken = this.generateToken(updatedUser.id, updatedUser.email);

    // 환영 이메일 전송 (비동기, 실패해도 무시)
    this.emailService
      .sendWelcomeEmail(updatedUser.email, updatedUser.email)
      .catch(() => {});

    return {
      message: '이메일 인증이 완료되었습니다.',
      user: updatedUser,
      access_token: accessToken,
    };
  }
  // ------------------------------------------------------------
  // 인증 이메일 재발송
  async resendVerificationEmail(email: string) {
    const user = await this.prismaService.users.findUnique({
      where: { email },
    });

    if (!user) {
      throw new BadRequestException('등록되지 않은 이메일입니다.');
    }

    if (user.email_verified) {
      throw new BadRequestException('이미 인증된 이메일입니다.');
    }

    // 새 토큰 생성
    const verificationToken = uuidv4();
    const verificationExpires = new Date();
    verificationExpires.setHours(verificationExpires.getHours() + 2);

    // 토큰 업데이트
    await this.prismaService.users.update({
      where: { id: user.id },
      data: {
        email_verification_token: verificationToken,
        email_verification_expires: verificationExpires,
      },
    });

    // 인증 이메일 재전송
    await this.emailService.sendVerificationEmail(email, verificationToken);

    return {
      message: '인증 이메일이 재발송되었습니다.',
    };
  }
  // ------------------------------------------------------------
  // 로그인 로직
  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;

    // 사용자 조회
    const user = await this.prismaService.users.findUnique({
      where: { email },
    });

    // 사용자가 존재하지 않으면 예외 발생
    if (!user) {
      throw new UnauthorizedException(
        '이메일 또는 비밀번호가 올바르지 않습니다.',
      );
    }

    // 비밀번호 검증
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException(
        '이메일 또는 비밀번호가 올바르지 않습니다.',
      );
    }

    // 이메일 인증 여부 확인
    if (!user.email_verified) {
      throw new UnauthorizedException(
        '이메일 인증이 완료되지 않았습니다. 이메일을 확인해주세요.',
      );
    }

    // JWT 토큰 생성
    const token = this.generateToken(user.id, user.email);

    return {
      message: '로그인이 완료되었습니다.',
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        balance: user.balance,
        status: user.status,
        email_verified: user.email_verified,
      },
      access_token: token,
    };
  }
  // ------------------------------------------------------------
  // JWT 토큰 생성 헬퍼 메서드
  private generateToken(userId: string, email: string): string {
    const payload = { sub: userId, email };
    return this.jwtService.sign(payload);
  }
  // ------------------------------------------------------------
  // 사용자 정보 조회 (인증된 사용자)
  async getProfile(userId: string) {
    const user = await this.prismaService.users.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        role: true,
        balance: true,
        status: true,
        email_verified: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('사용자를 찾을 수 없습니다.');
    }

    return user;
  }

  // ------------------------------------------------------------
  // 일일 자산 추이 조회 (인증된 사용자)
  async getDailyBalanceHistory(userId: string, days: number = 7) {
    try {
      // 사용자 정보 조회
      const user = await this.prismaService.users.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          balance: true,
        },
      });

      if (!user) {
        throw new UnauthorizedException('사용자를 찾을 수 없습니다.');
      }

      // 현재 시간 기준으로 조회 기간 설정
      const endDate = new Date();
      endDate.setHours(23, 59, 59, 999); // 오늘 마지막 시간
      const startDate = new Date(endDate);
      startDate.setDate(startDate.getDate() - days + 1); // N일 전부터
      startDate.setHours(0, 0, 0, 0); // 시작일 00:00:00

      // 사용자의 입출금 이벤트 조회 (조회 기간 내)
      const events = await this.prismaService.deposit_withdraw_events.findMany({
        where: {
          email: user.email,
          timestamp: {
            gte: BigInt(Math.floor(startDate.getTime() / 1000)), // 초 단위로 변환
            lte: BigInt(Math.floor(endDate.getTime() / 1000)),
          },
        },
        orderBy: {
          timestamp: 'asc', // 시간순 정렬
        },
      });

      // 날짜별 입출금 합계 계산
      const dailyData = new Map<string, { deposits: bigint; withdraws: bigint }>();

      events.forEach((event) => {
        const eventDate = new Date(Number(event.timestamp) * 1000);
        const dateKey = eventDate.toISOString().split('T')[0]; // YYYY-MM-DD 형식

        if (!dailyData.has(dateKey)) {
          dailyData.set(dateKey, { deposits: 0n, withdraws: 0n });
        }

        const dayData = dailyData.get(dateKey)!;
        const amountWei = parseEther(event.amount.toString());

        if (event.type === 'DEPOSIT') {
          dayData.deposits += amountWei;
        } else if (event.type === 'WITHDRAW') {
          dayData.withdraws += amountWei;
        }
      });

      // 현재 잔액 (Wei 단위) - 오늘 마지막 잔액
      const currentBalanceWei = BigInt(user.balance.toString());

      // 날짜별 잔액 계산 (역순으로 계산)
      const result: Array<{
        date: string;
        balance: string;
        balanceEth: string;
      }> = [];

      // 조회 기간의 모든 날짜 생성 (오늘부터 과거로)
      for (let i = 0; i < days; i++) {
        const date = new Date(endDate);
        date.setDate(date.getDate() - i);
        date.setHours(0, 0, 0, 0);
        const dateKey = date.toISOString().split('T')[0];

        // 해당 날짜의 마지막 잔액 계산
        // 현재 잔액에서 해당 날짜 이후의 모든 이벤트를 역순으로 계산
        let balanceWei = currentBalanceWei;

        // 해당 날짜 이후의 모든 이벤트를 역순으로 계산
        for (const event of events) {
          const eventDate = new Date(Number(event.timestamp) * 1000);
          const eventDateKey = eventDate.toISOString().split('T')[0];

          // 해당 날짜 이후의 이벤트인 경우 (역순 계산)
          if (eventDateKey > dateKey) {
            const amountWei = parseEther(event.amount.toString());
            // 역순 계산: 입금이면 차감, 출금이면 추가
            if (event.type === 'DEPOSIT') {
              balanceWei -= amountWei;
            } else if (event.type === 'WITHDRAW') {
              balanceWei += amountWei;
            }
          }
        }

        // 해당 날짜의 입출금 반영하여 해당 날짜의 마지막 잔액 계산
        const dayData = dailyData.get(dateKey);
        if (dayData) {
          // 해당 날짜의 입출금을 반영 (입금은 추가, 출금은 차감)
          balanceWei = balanceWei - dayData.deposits + dayData.withdraws;
        }

        // 음수 방지
        if (balanceWei < 0n) {
          balanceWei = 0n;
        }

        result.push({
          date: dateKey,
          balance: balanceWei.toString(),
          balanceEth: formatEther(balanceWei),
        });
      }

      // 날짜순으로 정렬 (과거부터 현재까지)
      result.reverse();

      return result;
    } catch (error) {
      console.error('일일 자산 추이 조회 실패:', error);
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new BadRequestException('일일 자산 추이 조회에 실패했습니다.');
    }
  }
}
