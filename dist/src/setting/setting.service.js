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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SettingService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const config_1 = require("@nestjs/config");
const ethers_1 = require("ethers");
const viem_1 = require("viem");
const policyGuard_json_1 = __importDefault(require("../abi/policyGuard.json"));
let SettingService = class SettingService {
    prismaService;
    configService;
    provider;
    contract;
    constructor(prismaService, configService) {
        this.prismaService = prismaService;
        this.configService = configService;
        const rpcUrl = this.configService.get('RPC_URL');
        const contractAddress = this.configService.get('GUARD_CONTRACT');
        const ownerPrivateKey = this.configService.get('SIGNER_PRIVATE_KEY');
        if (!rpcUrl) {
            throw new Error('RPC_URL 환경변수가 설정되지 않았습니다.');
        }
        if (!contractAddress) {
            throw new Error('GUARD_CONTRACT 환경변수가 설정되지 않았습니다.');
        }
        if (!ownerPrivateKey) {
            throw new Error('OWNER_PRIVATE_KEY 환경변수가 설정되지 않았습니다. (Omnibus 컨트랙트 소유자 키)');
        }
        this.provider = new ethers_1.ethers.JsonRpcProvider(rpcUrl);
        const signer = new ethers_1.ethers.Wallet(ownerPrivateKey, this.provider);
        this.contract = new ethers_1.ethers.Contract(contractAddress, policyGuard_json_1.default, signer);
    }
    async registerWhitelistAddress(userId, email, to) {
        if (!email) {
            throw new common_1.BadRequestException('이메일 정보를 확인할 수 없습니다.');
        }
        const normalizedEmail = email.trim().toLowerCase();
        const userKey = (0, viem_1.stringToHex)(normalizedEmail, { size: 32 });
        console.log('userKey', userKey);
        try {
            const tx = await this.contract.setUserWL(userKey, to);
            const receipt = await tx.wait();
            const whitelist = await this.prismaService.withdrawal_whitelist.upsert({
                where: {
                    user_id_to_address: {
                        user_id: userId,
                        to_address: to.toLowerCase(),
                    },
                },
                create: {
                    user_id: userId,
                    to_address: to.toLowerCase(),
                },
                update: {},
            });
            return {
                txHash: receipt.hash,
                whitelist,
            };
        }
        catch (error) {
            console.error('화이트리스트 등록 실패:', error);
            throw error;
        }
    }
    async getWhitelistAddresses(userId) {
        return this.prismaService.withdrawal_whitelist.findMany({
            where: { user_id: userId },
            select: {
                id: true,
                to_address: true,
                created_at: true,
            },
            orderBy: {
                created_at: 'desc',
            },
        });
    }
    async removeWhitelistAddress(userId, email, to) {
        if (!email) {
            throw new common_1.BadRequestException('이메일 정보를 확인할 수 없습니다.');
        }
        const normalizedEmail = email.trim().toLowerCase();
        const userKey = (0, viem_1.stringToHex)(normalizedEmail, { size: 32 });
        const tx = await this.contract.unsetUserWL(userKey, to);
        const receipt = await tx.wait();
        await this.prismaService.withdrawal_whitelist.deleteMany({
            where: {
                user_id: userId,
                to_address: to.toLowerCase(),
            },
        });
        return {
            txHash: receipt.hash,
            removedAddress: to.toLowerCase(),
        };
    }
    async setUserDailyLimit(email, maxEth) {
        if (!email) {
            throw new common_1.BadRequestException('이메일 정보를 확인할 수 없습니다.');
        }
        if (maxEth < 0) {
            throw new common_1.BadRequestException('일일 출금 한도는 0 이상이어야 합니다.');
        }
        const normalizedEmail = email.trim().toLowerCase();
        const userKey = (0, viem_1.stringToHex)(normalizedEmail, { size: 32 });
        try {
            const maxWei = maxEth === 0 ? 0n : (0, ethers_1.parseEther)(maxEth.toString());
            const tx = await this.contract.setUserDailyLimit(userKey, maxWei);
            const receipt = await tx.wait();
            return {
                txHash: receipt.hash,
                maxEth: maxEth.toString(),
                maxWei: maxWei.toString(),
                isUnlimited: maxEth === 0,
            };
        }
        catch (error) {
            console.error('일일 출금 한도 설정 실패:', error);
            throw error;
        }
    }
    async getUserDailyLimit(email) {
        if (!email) {
            throw new common_1.BadRequestException('이메일 정보를 확인할 수 없습니다.');
        }
        const normalizedEmail = email.trim().toLowerCase();
        const userKey = (0, viem_1.stringToHex)(normalizedEmail, { size: 32 });
        try {
            const dailyLimit = await this.contract.userDailyETH(userKey);
            const maxWei = BigInt(dailyLimit.max.toString());
            const spentWei = BigInt(dailyLimit.spent.toString());
            const dayKey = Number(dailyLimit.dayKey);
            const maxEth = maxWei === 0n ? '0' : (0, ethers_1.formatEther)(maxWei);
            const spentEth = (0, ethers_1.formatEther)(spentWei);
            const todayKey = Math.floor(Date.now() / 1000 / 86400);
            const remainingWei = maxWei === 0n ? null : maxWei > spentWei ? maxWei - spentWei : 0n;
            const remainingEth = remainingWei === null ? null : (0, ethers_1.formatEther)(remainingWei);
            return {
                maxEth,
                maxWei: maxWei.toString(),
                spentEth,
                spentWei: spentWei.toString(),
                remainingEth: remainingEth === null ? null : remainingEth,
                remainingWei: remainingWei === null ? null : remainingWei.toString(),
                dayKey,
                todayKey,
                isUnlimited: maxWei === 0n,
                isNewDay: dayKey !== todayKey,
            };
        }
        catch (error) {
            console.error('일일 출금 한도 조회 실패:', error);
            throw error;
        }
    }
};
exports.SettingService = SettingService;
exports.SettingService = SettingService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        config_1.ConfigService])
], SettingService);
//# sourceMappingURL=setting.service.js.map