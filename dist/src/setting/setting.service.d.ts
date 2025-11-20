import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
export declare class SettingService {
    private readonly prismaService;
    private readonly configService;
    private readonly provider;
    private readonly contract;
    constructor(prismaService: PrismaService, configService: ConfigService);
    registerWhitelistAddress(userId: string, email: string, to: string): Promise<{
        txHash: any;
        whitelist: {
            id: string;
            created_at: Date;
            to_address: string;
            user_id: string;
            updated_at: Date;
        };
    }>;
    getWhitelistAddresses(userId: string): Promise<{
        id: string;
        created_at: Date;
        to_address: string;
    }[]>;
    removeWhitelistAddress(userId: string, email: string, to: string): Promise<{
        txHash: any;
        removedAddress: string;
    }>;
    setUserDailyLimit(email: string, maxEth: number): Promise<{
        txHash: any;
        maxEth: string;
        maxWei: string;
        isUnlimited: boolean;
    }>;
    getUserDailyLimit(email: string): Promise<{
        maxEth: string;
        maxWei: string;
        spentEth: string;
        spentWei: string;
        remainingEth: string | null;
        remainingWei: string | null;
        dayKey: number;
        todayKey: number;
        isUnlimited: boolean;
        isNewDay: boolean;
    }>;
}
