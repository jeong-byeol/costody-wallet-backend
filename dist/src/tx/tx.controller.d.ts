import { TxService } from './tx.service';
import { DepositDto } from './dto/deposit.dto';
import { WithdrawSubmitDto } from './dto/withdraw-submit.dto';
import { WithdrawTxDto } from './dto/withdraw-tx.dto';
export declare class TxController {
    private readonly txService;
    private readonly logger;
    constructor(txService: TxService);
    deposit(req: any, depositDto: DepositDto): Promise<{
        message: string;
        data: {
            txHash: string;
            amount: string;
            status: import("@prisma/client").$Enums.tx_status;
            blockNumber: string | undefined;
            newBalance: string;
        };
    }>;
    withdrawSubmit(req: any, withdrawSubmitDto: WithdrawSubmitDto): Promise<{
        message: string;
        data: {
            txId: string;
            txHash: any;
            amount: string;
            status: string;
        };
    }>;
    withdrawApprove(withdrawTxDto: WithdrawTxDto): Promise<{
        message: string;
        data: {
            txHash: any;
            managerTxHash: null;
            status: string;
            isSmallTx: boolean;
            amount: string;
            requiresManagerApproval: boolean;
        };
    }>;
    withdrawExecute(req: any, withdrawTxDto: WithdrawTxDto): Promise<{
        message: string;
        data: {
            txHash: any;
            status: string;
            amount: string;
            newBalance: string;
        };
    }>;
    getTransactionHistory(req: any, direction?: string): Promise<{
        message: string;
        data: {
            txHash: string;
            direction: "IN" | "OUT";
            status: string;
            amount: string;
            createdAt: string | null;
            from: string;
            to: string;
            blockNumber: string | null;
        }[];
    }>;
}
