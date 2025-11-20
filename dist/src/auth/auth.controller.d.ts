import type { Response } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { DailyBalanceHistoryDto } from './dto/daily-balance-history.dto';
export declare class AuthController {
    private readonly authService;
    constructor(authService: AuthService);
    register(registerDto: RegisterDto): Promise<{
        message: string;
        user: {
            id: string;
            email: string;
            role: import("@prisma/client").$Enums.user_role;
            email_verified: boolean | null;
        };
    }>;
    verifyEmail(token: string, res: Response): Promise<Response<any, Record<string, any>>>;
    private getSuccessHtml;
    private getErrorHtml;
    resendVerification(email: string): Promise<{
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
    getProfile(req: any): Promise<{
        message: string;
        user: any;
    }>;
    getDailyBalanceHistory(req: any, dto: DailyBalanceHistoryDto): Promise<{
        message: string;
        data: {
            date: string;
            balance: string;
            balanceEth: string;
        }[];
    }>;
}
