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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TxService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const ethers_1 = require("ethers");
const bcrypt = __importStar(require("bcrypt"));
const config_1 = require("@nestjs/config");
const viem_1 = require("viem");
const omnibusWallet_json_1 = __importDefault(require("../abi/omnibusWallet.json"));
let TxService = class TxService {
    prismaService;
    configService;
    provider;
    contract;
    ownerContract;
    maxHistory = 100;
    smallTxThresholdWei = (0, ethers_1.parseEther)('0.01');
    constructor(prismaService, configService) {
        this.prismaService = prismaService;
        this.configService = configService;
        const rpcUrl = this.configService.get('RPC_URL');
        const contractAddress = this.configService.get('OMNIBUS_CONTRACT');
        const TSSownerPrivateKey = this.configService.get('TSS_PRIVATE_KEY');
        const ownerPrivateKey = this.configService.get('SIGNER_PRIVATE_KEY');
        if (!ownerPrivateKey) {
            throw new Error('OWNER_PRIVATE_KEY 환경변수가 설정되지 않았습니다.');
        }
        if (!rpcUrl) {
            throw new Error('RPC_URL 환경변수가 설정되지 않았습니다.');
        }
        if (!contractAddress) {
            throw new Error('OMNIBUS_CONTRACT 환경변수가 설정되지 않았습니다.');
        }
        if (!TSSownerPrivateKey) {
            throw new Error('TSS_PRIVATE_KEY 환경변수가 설정되지 않았습니다.');
        }
        this.provider = new ethers_1.ethers.JsonRpcProvider(rpcUrl);
        const signer = new ethers_1.ethers.Wallet(TSSownerPrivateKey, this.provider);
        this.contract = new ethers_1.ethers.Contract(contractAddress, omnibusWallet_json_1.default, signer);
        const ownerSigner = new ethers_1.ethers.Wallet(ownerPrivateKey, this.provider);
        this.ownerContract = new ethers_1.ethers.Contract(contractAddress, omnibusWallet_json_1.default, ownerSigner);
    }
    async deposit(userId, txHash) {
        try {
            if (!ethers_1.ethers.isHexString(txHash, 32)) {
                throw new common_1.BadRequestException('유효하지 않은 트랜잭션 해시입니다.');
            }
            const existingTx = await this.prismaService.transactions.findUnique({
                where: { txhash: txHash },
            });
            if (existingTx) {
                throw new common_1.ConflictException('이미 처리된 트랜잭션입니다.');
            }
            const tx = await this.provider.getTransaction(txHash);
            if (!tx) {
                throw new common_1.BadRequestException('블록체인에서 트랜잭션을 찾을 수 없습니다.');
            }
            const receipt = await this.provider.getTransactionReceipt(txHash);
            if (!receipt) {
                throw new common_1.BadRequestException('트랜잭션이 아직 컨펌되지 않았습니다. 잠시 후 다시 시도해주세요.');
            }
            const txStatus = receipt.status === 1 ? 'success' : 'failed';
            if (txStatus === 'failed') {
                throw new common_1.BadRequestException('실패한 트랜잭션입니다.');
            }
            const amountInWei = tx.value;
            const gasUsed = receipt.gasUsed;
            const effectiveGasPrice = receipt.gasPrice || 0n;
            const feePaid = gasUsed * effectiveGasPrice;
            const block = await this.provider.getBlock(receipt.blockNumber);
            const blockTimestamp = block
                ? new Date(block.timestamp * 1000)
                : new Date();
            const user = await this.prismaService.users.findUnique({
                where: { id: userId },
            });
            if (!user) {
                throw new common_1.BadRequestException('사용자를 찾을 수 없습니다.');
            }
            const result = await this.prismaService.$transaction(async (prisma) => {
                const depositTxData = {
                    txhash: txHash,
                    user_id: userId,
                    status: txStatus,
                    direction: 'IN',
                    blocknumber: BigInt(receipt.blockNumber),
                    blockhash: receipt.blockHash,
                    blocktimestamp: blockTimestamp,
                    from_address: tx.from.toLowerCase(),
                    to_address: tx.to ? tx.to.toLowerCase() : '',
                    amount: amountInWei.toString(),
                    gasused: gasUsed,
                    effectivegasprice: effectiveGasPrice.toString(),
                    feepaid: feePaid.toString(),
                };
                const savedTx = await prisma.transactions.create({
                    data: depositTxData,
                });
                const updatedUser = await prisma.users.update({
                    where: { id: userId },
                    data: {
                        balance: {
                            increment: amountInWei.toString(),
                        },
                    },
                    select: {
                        id: true,
                        email: true,
                        balance: true,
                    },
                });
                return {
                    transaction: savedTx,
                    user: updatedUser,
                };
            });
            return {
                txHash: result.transaction.txhash,
                amount: result.transaction.amount.toString(),
                status: result.transaction.status,
                blockNumber: result.transaction.blocknumber?.toString(),
                newBalance: result.user.balance.toString(),
            };
        }
        catch (error) {
            if (error instanceof common_1.BadRequestException ||
                error instanceof common_1.ConflictException) {
                throw error;
            }
            console.error('입금 처리 중 오류 발생:', error);
            throw new common_1.InternalServerErrorException('입금 처리 중 오류가 발생했습니다.');
        }
    }
    async withdrawSubmit(email, to, amount, password) {
        const normalizedEmail = email.trim().toLowerCase();
        const userKey = (0, viem_1.stringToHex)(normalizedEmail, { size: 32 });
        const user = await this.prismaService.users.findUnique({
            where: { email: normalizedEmail },
            select: {
                id: true,
                password: true,
            },
        });
        if (!user) {
            throw new common_1.BadRequestException('사용자를 찾을 수 없습니다.');
        }
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            throw new common_1.UnauthorizedException('비밀번호가 일치하지 않습니다.');
        }
        const weiAmount = (0, ethers_1.parseEther)(amount);
        const currentNonce = await this.ownerContract.nonce();
        const txId = await this.ownerContract.computeTxId(to, weiAmount, userKey, currentNonce);
        const txResponse = await this.ownerContract.submitTx(to, weiAmount, userKey);
        const receipt = await txResponse.wait();
        return {
            txId,
            txHash: receipt.hash,
            amount,
            status: 'submitted',
        };
    }
    async withdrawApprove(txId) {
        this.validateTxId(txId);
        const onchainTx = await this.ownerContract.txs(txId);
        if (!onchainTx || onchainTx.userKey === ethers_1.ethers.ZeroHash) {
            throw new common_1.BadRequestException('존재하지 않는 출금 요청입니다.');
        }
        const amountInWei = BigInt(onchainTx.amount.toString());
        const isSmallTx = amountInWei < this.smallTxThresholdWei;
        const tssTxResponse = await this.contract.approveTx(txId);
        const tssReceipt = await tssTxResponse.wait();
        return {
            txHash: tssReceipt.hash,
            managerTxHash: null,
            status: isSmallTx ? 'approved' : 'tss_approved',
            isSmallTx,
            amount: amountInWei.toString(),
            requiresManagerApproval: !isSmallTx,
        };
    }
    async withdrawExecute(txId, userId, email) {
        this.validateTxId(txId);
        const normalizedEmail = email.trim().toLowerCase();
        const onchainTx = await this.ownerContract.txs(txId);
        if (!onchainTx || onchainTx.userKey === ethers_1.ethers.ZeroHash) {
            throw new common_1.BadRequestException('존재하지 않는 출금 요청입니다.');
        }
        const expectedUserKey = (0, viem_1.stringToHex)(normalizedEmail, { size: 32 });
        if (expectedUserKey !== onchainTx.userKey) {
            throw new common_1.UnauthorizedException('출금 요청 정보와 사용자 정보가 일치하지 않습니다.');
        }
        const user = await this.prismaService.users.findUnique({
            where: { id: userId },
            select: { id: true, email: true, balance: true },
        });
        if (!user) {
            throw new common_1.BadRequestException('출금 대상 사용자를 찾을 수 없습니다.');
        }
        if (user.email.toLowerCase() !== normalizedEmail) {
            throw new common_1.UnauthorizedException('사용자 정보가 일치하지 않습니다.');
        }
        const amountInWei = BigInt(onchainTx.amount.toString());
        const userBalance = BigInt(user.balance.toString());
        if (userBalance < amountInWei) {
            throw new common_1.BadRequestException('사용자 잔액이 부족합니다.');
        }
        const recipientAddress = onchainTx.to?.toLowerCase();
        if (!recipientAddress) {
            throw new common_1.BadRequestException('출금 목적지 정보를 찾을 수 없습니다.');
        }
        const txResponse = await this.ownerContract.execute(txId, this.smallTxThresholdWei);
        const receipt = await txResponse.wait();
        const block = receipt.blockNumber
            ? await this.provider.getBlock(receipt.blockNumber)
            : null;
        const blockTimestamp = block
            ? new Date(block.timestamp * 1000)
            : new Date();
        const gasUsed = receipt.gasUsed ?? 0n;
        const effectiveGasPrice = receipt.gasPrice ?? receipt.effectiveGasPrice ?? 0n;
        const feePaid = gasUsed * effectiveGasPrice;
        const amountAsString = amountInWei.toString();
        const ownerContractAddress = (await this.ownerContract.getAddress()).toLowerCase();
        const result = await this.prismaService.$transaction(async (prisma) => {
            const updatedUser = await prisma.users.update({
                where: { id: user.id },
                data: {
                    balance: {
                        decrement: amountAsString,
                    },
                },
                select: {
                    id: true,
                    balance: true,
                },
            });
            const withdrawTxData = {
                txhash: receipt.hash,
                user_id: user.id,
                status: 'success',
                direction: 'OUT',
                blocknumber: receipt.blockNumber ? BigInt(receipt.blockNumber) : null,
                blockhash: receipt.blockHash ?? null,
                blocktimestamp: blockTimestamp,
                from_address: ownerContractAddress,
                to_address: recipientAddress,
                amount: amountAsString,
                gasused: gasUsed,
                effectivegasprice: effectiveGasPrice.toString(),
                feepaid: feePaid.toString(),
            };
            const savedTx = await prisma.transactions.create({
                data: withdrawTxData,
            });
            return { updatedUser, savedTx };
        });
        return {
            txHash: receipt.hash,
            status: 'success',
            amount: amountAsString,
            newBalance: result.updatedUser.balance.toString(),
        };
    }
    async getTransactionHistory(userId, direction) {
        const where = {
            user_id: userId,
        };
        if (direction) {
            where.direction = direction;
        }
        const transactions = await this.prismaService.transactions.findMany({
            where,
            orderBy: {
                createdat: 'desc',
            },
            take: this.maxHistory,
        });
        return transactions.map((tx) => ({
            txHash: tx.txhash,
            direction: (tx.direction || 'IN'),
            status: tx.status,
            amount: tx.amount.toString(),
            createdAt: tx.createdat ? tx.createdat.toISOString() : null,
            from: tx.from_address,
            to: tx.to_address,
            blockNumber: tx.blocknumber ? tx.blocknumber.toString() : null,
        }));
    }
    validateTxId(txId) {
        if (!ethers_1.ethers.isHexString(txId, 32)) {
            throw new common_1.BadRequestException('유효하지 않은 txId 형식입니다.');
        }
    }
};
exports.TxService = TxService;
exports.TxService = TxService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        config_1.ConfigService])
], TxService);
//# sourceMappingURL=tx.service.js.map