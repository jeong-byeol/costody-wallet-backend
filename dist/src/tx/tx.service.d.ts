import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
export declare class TxService {
    private prismaService;
    private configService;
    private provider;
    private contract;
    private ownerContract;
    private readonly maxHistory;
    private readonly smallTxThresholdWei;
    constructor(prismaService: PrismaService, configService: ConfigService);
    deposit(userId: string, txHash: string): Promise<{
        txHash: string;
        amount: string;
        status: import("@prisma/client").$Enums.tx_status;
        blockNumber: string | undefined;
        newBalance: string;
    }>;
    withdrawSubmit(email: string, to: string, amount: string, password: string): Promise<{
        txId: string;
        txHash: any;
        amount: string;
        status: string;
    }>;
    withdrawApprove(txId: string): Promise<{
        txHash: any;
        managerTxHash: null;
        status: string;
        isSmallTx: boolean;
        amount: string;
        requiresManagerApproval: boolean;
    }>;
    withdrawExecute(txId: string, userId: string, email: string): Promise<{
        txHash: any;
        status: string;
        amount: string;
        newBalance: string;
    }>;
    getTransactionHistory(userId: string, direction?: 'IN' | 'OUT'): Promise<Array<{
        txHash: string;
        direction: 'IN' | 'OUT';
        status: string;
        amount: string;
        createdAt: string | null;
        from: string;
        to: string;
        blockNumber: string | null;
    }>>;
    private validateTxId;
}
