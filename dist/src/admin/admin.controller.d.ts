import { AdminService } from './admin.service';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';
import { GetTransactionsDto } from './dto/get-transactions.dto';
import { PauseOmnibusDto } from './dto/pause-omnibus.dto';
import { ColdDepositDto } from './dto/cold-deposit.dto';
import { ColdMoveRequestDto, ColdMoveActionDto } from './dto/cold-move.dto';
import { ApproveWithdrawalDto } from './dto/approve-withdrawal.dto';
export declare class AdminController {
    private readonly adminService;
    constructor(adminService: AdminService);
    getOmnibusBalance(): Promise<{
        message: string;
        data: {
            balance: string;
            balanceEth: string;
        };
    }>;
    getColdBalance(): Promise<{
        message: string;
        data: {
            balance: string;
            balanceEth: string;
        };
    }>;
    getAllUsers(): Promise<{
        message: string;
        data: {
            id: string;
            email: string;
            role: import("@prisma/client").$Enums.user_role;
            status: "ACTIVE" | "FROZEN";
            balance: string;
            balanceEth: string;
            createdAt: string;
        }[];
    }>;
    updateUserStatus(dto: UpdateUserStatusDto): Promise<{
        message: string;
        data: {
            id: string;
            status: "ACTIVE" | "FROZEN";
        };
    }>;
    getOmnibusPausedStatus(): Promise<{
        message: string;
        data: {
            paused: any;
            status: string;
        };
    }>;
    pauseOmnibus(dto: PauseOmnibusDto): Promise<{
        message: string;
        data: {
            paused: boolean;
            message: string;
            txHash: null;
            blockNumber?: undefined;
        } | {
            paused: boolean;
            message: string;
            txHash: any;
            blockNumber: any;
        };
    }>;
    coldDeposit(dto: ColdDepositDto): Promise<{
        message: string;
        data: {
            txHash: any;
            blockNumber: any;
            amount: string;
            amountEth: string;
        };
    }>;
    coldRequestMove(dto: ColdMoveRequestDto): Promise<{
        message: string;
        data: {
            txHash: any;
            blockNumber: any;
            moveId: string;
            amount: string;
            amountEth: string;
        };
    }>;
    coldApproveMove(dto: ColdMoveActionDto): Promise<{
        message: string;
        data: {
            txHash: string | null;
            blockNumber: string | null;
            TSStxHash: string | null;
            TSSblockNumber: string | null;
            moveId: `0x${string}`;
            approvedAdmin1: any;
            approvedAdmin2: any;
            isExecutable: any;
        };
    }>;
    coldExecuteMove(dto: ColdMoveActionDto): Promise<{
        message: string;
        data: {
            txHash: any;
            blockNumber: any;
            moveId: `0x${string}`;
            amount: any;
            amountEth: string;
            executed: any;
        };
    }>;
    getDepositWithdrawTransactions(dto: GetTransactionsDto): Promise<{
        message: string;
        data: {
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
        };
    }>;
    getPendingWithdrawalRequests(limit?: number): Promise<{
        message: string;
        data: {
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
        };
    }>;
    getWithdrawalRequestInfo(txId: string): Promise<{
        message: string;
        data: {
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
        };
    }>;
    approveWithdrawalRequest(dto: ApproveWithdrawalDto): Promise<{
        message: string;
        data: {
            txHash: any;
            blockNumber: any;
            txId: `0x${string}`;
            amount: string;
            amountEth: string;
            approvedTss: any;
            approvedManager: any;
            executed: any;
            status: string;
        };
    }>;
    executeWithdrawalRequest(dto: ApproveWithdrawalDto): Promise<{
        message: string;
        data: {
            txHash: any;
            status: string;
            amount: string;
            amountEth: string;
            newBalance: string;
            email: string;
            userId: string;
        };
    }>;
}
