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
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const bcrypt = __importStar(require("bcrypt"));
const prisma_service_1 = require("../prisma/prisma.service");
const crypto_1 = require("crypto");
const email_service_1 = require("../email/email.service");
const ethers_1 = require("ethers");
let AuthService = class AuthService {
    prismaService;
    jwtService;
    emailService;
    constructor(prismaService, jwtService, emailService) {
        this.prismaService = prismaService;
        this.jwtService = jwtService;
        this.emailService = emailService;
    }
    async register(registerDto) {
        const { email, password, role } = registerDto;
        const existingUser = await this.prismaService.users.findUnique({
            where: { email },
        });
        if (existingUser) {
            throw new common_1.ConflictException('이미 등록된 이메일입니다.');
        }
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        const verificationToken = (0, crypto_1.randomUUID)();
        const verificationExpires = new Date();
        verificationExpires.setHours(verificationExpires.getHours() + 2);
        const user = await this.prismaService.users.create({
            data: {
                email,
                password: hashedPassword,
                role: role || 'admin',
                email_verified: false,
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
        try {
            await this.emailService.sendVerificationEmail(email, verificationToken);
        }
        catch (error) {
            await this.prismaService.users.delete({ where: { id: user.id } });
            throw new common_1.BadRequestException('이메일 전송에 실패했습니다. 다시 시도해주세요.');
        }
        return {
            message: '회원가입이 완료되었습니다. 이메일을 확인하여 인증을 완료해주세요.',
            user: {
                id: user.id,
                email: user.email,
                role: user.role,
                email_verified: user.email_verified,
            },
        };
    }
    async verifyEmail(token) {
        const user = await this.prismaService.users.findUnique({
            where: { email_verification_token: token },
        });
        if (!user) {
            throw new common_1.BadRequestException('유효하지 않은 인증 링크입니다.');
        }
        if (user.email_verified) {
            throw new common_1.BadRequestException('이미 인증된 이메일입니다.');
        }
        if (user.email_verification_expires &&
            user.email_verification_expires < new Date()) {
            throw new common_1.BadRequestException('인증 링크가 만료되었습니다. 재발송을 요청해주세요.');
        }
        const updatedUser = await this.prismaService.users.update({
            where: { id: user.id },
            data: {
                email_verified: true,
                email_verification_token: null,
                email_verification_expires: null,
            },
            select: {
                id: true,
                email: true,
                role: true,
                email_verified: true,
            },
        });
        const accessToken = this.generateToken(updatedUser.id, updatedUser.email);
        this.emailService
            .sendWelcomeEmail(updatedUser.email, updatedUser.email)
            .catch(() => { });
        return {
            message: '이메일 인증이 완료되었습니다.',
            user: updatedUser,
            access_token: accessToken,
        };
    }
    async resendVerificationEmail(email) {
        const user = await this.prismaService.users.findUnique({
            where: { email },
        });
        if (!user) {
            throw new common_1.BadRequestException('등록되지 않은 이메일입니다.');
        }
        if (user.email_verified) {
            throw new common_1.BadRequestException('이미 인증된 이메일입니다.');
        }
        const verificationToken = (0, crypto_1.randomUUID)();
        const verificationExpires = new Date();
        verificationExpires.setHours(verificationExpires.getHours() + 2);
        await this.prismaService.users.update({
            where: { id: user.id },
            data: {
                email_verification_token: verificationToken,
                email_verification_expires: verificationExpires,
            },
        });
        await this.emailService.sendVerificationEmail(email, verificationToken);
        return {
            message: '인증 이메일이 재발송되었습니다.',
        };
    }
    async login(loginDto) {
        const { email, password } = loginDto;
        const user = await this.prismaService.users.findUnique({
            where: { email },
        });
        if (!user) {
            throw new common_1.UnauthorizedException('이메일 또는 비밀번호가 올바르지 않습니다.');
        }
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            throw new common_1.UnauthorizedException('이메일 또는 비밀번호가 올바르지 않습니다.');
        }
        if (!user.email_verified) {
            throw new common_1.UnauthorizedException('이메일 인증이 완료되지 않았습니다. 이메일을 확인해주세요.');
        }
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
    generateToken(userId, email) {
        const payload = { sub: userId, email };
        return this.jwtService.sign(payload);
    }
    async getProfile(userId) {
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
            throw new common_1.UnauthorizedException('사용자를 찾을 수 없습니다.');
        }
        return user;
    }
    async getDailyBalanceHistory(userId, days = 7) {
        try {
            const user = await this.prismaService.users.findUnique({
                where: { id: userId },
                select: {
                    id: true,
                    email: true,
                    balance: true,
                },
            });
            if (!user) {
                throw new common_1.UnauthorizedException('사용자를 찾을 수 없습니다.');
            }
            const endDate = new Date();
            endDate.setHours(23, 59, 59, 999);
            const startDate = new Date(endDate);
            startDate.setDate(startDate.getDate() - days + 1);
            startDate.setHours(0, 0, 0, 0);
            const events = await this.prismaService.deposit_withdraw_events.findMany({
                where: {
                    email: user.email,
                    timestamp: {
                        gte: BigInt(Math.floor(startDate.getTime() / 1000)),
                        lte: BigInt(Math.floor(endDate.getTime() / 1000)),
                    },
                },
                orderBy: {
                    timestamp: 'asc',
                },
            });
            const dailyData = new Map();
            events.forEach((event) => {
                const eventDate = new Date(Number(event.timestamp) * 1000);
                const dateKey = eventDate.toISOString().split('T')[0];
                if (!dailyData.has(dateKey)) {
                    dailyData.set(dateKey, { deposits: 0n, withdraws: 0n });
                }
                const dayData = dailyData.get(dateKey);
                const amountWei = (0, ethers_1.parseEther)(event.amount.toString());
                if (event.type === 'DEPOSIT') {
                    dayData.deposits += amountWei;
                }
                else if (event.type === 'WITHDRAW') {
                    dayData.withdraws += amountWei;
                }
            });
            const currentBalanceWei = BigInt(user.balance.toString());
            const result = [];
            for (let i = 0; i < days; i++) {
                const date = new Date(endDate);
                date.setDate(date.getDate() - i);
                date.setHours(0, 0, 0, 0);
                const dateKey = date.toISOString().split('T')[0];
                let balanceWei = currentBalanceWei;
                for (const event of events) {
                    const eventDate = new Date(Number(event.timestamp) * 1000);
                    const eventDateKey = eventDate.toISOString().split('T')[0];
                    if (eventDateKey > dateKey) {
                        const amountWei = (0, ethers_1.parseEther)(event.amount.toString());
                        if (event.type === 'DEPOSIT') {
                            balanceWei -= amountWei;
                        }
                        else if (event.type === 'WITHDRAW') {
                            balanceWei += amountWei;
                        }
                    }
                }
                const dayData = dailyData.get(dateKey);
                if (dayData) {
                    balanceWei = balanceWei - dayData.deposits + dayData.withdraws;
                }
                if (balanceWei < 0n) {
                    balanceWei = 0n;
                }
                result.push({
                    date: dateKey,
                    balance: balanceWei.toString(),
                    balanceEth: (0, ethers_1.formatEther)(balanceWei),
                });
            }
            result.reverse();
            return result;
        }
        catch (error) {
            console.error('일일 자산 추이 조회 실패:', error);
            if (error instanceof common_1.UnauthorizedException) {
                throw error;
            }
            throw new common_1.BadRequestException('일일 자산 추이 조회에 실패했습니다.');
        }
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        jwt_1.JwtService,
        email_service_1.EmailService])
], AuthService);
//# sourceMappingURL=auth.service.js.map