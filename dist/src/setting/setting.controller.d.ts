import { SettingService } from './setting.service';
import { UpdateWhitelistDto } from './dto/update-whitelist.dto';
import { SetDailyLimitDto } from './dto/set-daily-limit.dto';
export declare class SettingController {
    private readonly settingService;
    constructor(settingService: SettingService);
    registerWhitelist(req: any, dto: UpdateWhitelistDto): Promise<{
        message: string;
        data: {
            txHash: any;
            whitelist: {
                id: string;
                created_at: Date;
                to_address: string;
                user_id: string;
                updated_at: Date;
            };
        };
    }>;
    getWhitelist(req: any): Promise<{
        message: string;
        data: {
            id: string;
            created_at: Date;
            to_address: string;
        }[];
    }>;
    removeWhitelist(req: any, dto: UpdateWhitelistDto): Promise<{
        message: string;
        data: {
            txHash: any;
            removedAddress: string;
        };
    }>;
    setDailyLimit(req: any, dto: SetDailyLimitDto): Promise<{
        message: string;
        data: {
            txHash: any;
            maxEth: string;
            maxWei: string;
            isUnlimited: boolean;
        };
    }>;
    getDailyLimit(req: any): Promise<{
        message: string;
        data: {
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
        };
    }>;
}
