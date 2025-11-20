import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { EmailService } from '../email/email.service';
export declare class AuthService {
    private prismaService;
    private jwtService;
    private emailService;
    constructor(prismaService: PrismaService, jwtService: JwtService, emailService: EmailService);
    register(registerDto: RegisterDto): Promise<{
        message: string;
        user: {
            id: string;
            email: string;
            role: import("@prisma/client").$Enums.user_role;
            email_verified: boolean | null;
        };
    }>;
    verifyEmail(token: string): Promise<{
        message: string;
        user: {
            email: string;
            role: import("@prisma/client").$Enums.user_role;
            id: string;
            email_verified: boolean | null;
        };
        access_token: string;
    }>;
    resendVerificationEmail(email: string): Promise<{
        message: string;
    }>;
    login(loginDto: LoginDto): Promise<{
        message: string;
        user: {
            id: string;
            email: string;
            role: import("@prisma/client").$Enums.user_role;
            balance: import("@prisma/client/runtime/library").Decimal;
            status: import("@prisma/client").$Enums.user_status;
            email_verified: true;
        };
        access_token: string;
    }>;
    private generateToken;
    getProfile(userId: string): Promise<{
        email: string;
        role: import("@prisma/client").$Enums.user_role;
        id: string;
        balance: import("@prisma/client/runtime/library").Decimal;
        email_verified: boolean | null;
        status: import("@prisma/client").$Enums.user_status;
    }>;
    getDailyBalanceHistory(userId: string, days?: number): Promise<{
        date: string;
        balance: string;
        balanceEth: string;
    }[]>;
}
