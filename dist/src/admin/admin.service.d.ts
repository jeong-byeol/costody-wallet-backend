import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
export declare class AdminService {
    private readonly prismaService;
    private readonly configService;
    private provider;
    private omnibusContract;
    private coldVaultContract;
    private TSScoldVaultContract;
    constructor(prismaService: PrismaService, configService: ConfigService);
    getOmnibusBalance(): Promise<{
        balance: string;
        balanceEth: string;
    }>;
    getColdBalance(): Promise<{
        balance: string;
        balanceEth: string;
    }>;
    getAllUsers(): Promise<{
        id: string;
        email: string;
        role: import("@prisma/client").$Enums.user_role;
        status: "ACTIVE" | "FROZEN";
        balance: string;
        balanceEth: string;
        createdAt: string;
    }[]>;
    updateUserStatus(userId: string, status: 'ACTIVE' | 'FROZEN'): Promise<{
        id: string;
        status: "ACTIVE" | "FROZEN";
    }>;
    pauseOmnibus(paused: boolean): Promise<{
        paused: boolean;
        message: string;
        txHash: null;
        blockNumber?: undefined;
    } | {
        paused: boolean;
        message: string;
        txHash: any;
        blockNumber: any;
    }>;
    getOmnibusPausedStatus(): Promise<{
        paused: any;
        status: string;
    }>;
    getDepositWithdrawTransactions(limit?: number): Promise<{
        total: number;
        limit: number;
        transactions: {
            type: "DEPOSIT" | "WITHDRAW";
            email: string | null;
            from?: string;
            to?: string;
            amount: string;
            timestamp: number;
        }[];
    }>;
    coldDeposit(amountEth: string): Promise<{
        txHash: any;
        blockNumber: any;
        amount: string;
        amountEth: string;
    }>;
    coldRequestMove(amountEth: string): Promise<{
        txHash: any;
        blockNumber: any;
        moveId: string;
        amount: string;
        amountEth: string;
    }>;
    coldApproveMove(moveId: string): Promise<{
        txHash: string | null;
        blockNumber: string | null;
        TSStxHash: string | null;
        TSSblockNumber: string | null;
        moveId: `0x${string}`;
        approvedAdmin1: any;
        approvedAdmin2: any;
        isExecutable: any;
    }>;
    coldExecuteMove(moveId: string): Promise<{
        txHash: any;
        blockNumber: any;
        moveId: `0x${string}`;
        amount: any;
        amountEth: string;
        executed: any;
    }>;
    getPendingWithdrawalRequests(limit?: number): Promise<{
        total: number;
        requests: {
            txId: string;
            email: string | null;
            to: string;
            amount: string;
            amountEth: string;
            approvedTss: boolean;
            approvedManager: boolean;
            executed: boolean;
            requiresManagerApproval: boolean;
        }[];
    }>;
    getWithdrawalRequestInfo(txId: string): Promise<{
        txId: `0x${string}`;
        email: string | null;
        userId: string | null;
        to: string;
        amount: string;
        amountEth: string;
        approvedTss: any;
        approvedManager: any;
        executed: any;
        isSmallTx: boolean;
        requiresManagerApproval: any;
    }>;
    approveWithdrawalRequest(txId: string): Promise<{
        txHash: any;
        blockNumber: any;
        txId: `0x${string}`;
        amount: string;
        amountEth: string;
        approvedTss: any;
        approvedManager: any;
        executed: any;
        status: string;
    }>;
    executeWithdrawalRequest(txId: string): Promise<{
        txHash: any;
        status: string;
        amount: string;
        amountEth: string;
        newBalance: string;
        email: string;
        userId: string;
    }>;
}
