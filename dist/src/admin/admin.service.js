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
exports.AdminService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const config_1 = require("@nestjs/config");
const ethers_1 = require("ethers");
const omnibusWallet_json_1 = __importDefault(require("../abi/omnibusWallet.json"));
const coldVault_json_1 = __importDefault(require("../abi/coldVault.json"));
const viem_1 = require("viem");
let AdminService = class AdminService {
    prismaService;
    configService;
    provider;
    omnibusContract;
    coldVaultContract;
    TSScoldVaultContract;
    constructor(prismaService, configService) {
        this.prismaService = prismaService;
        this.configService = configService;
        const rpcUrl = this.configService.get('RPC_URL');
        const contractAddress = this.configService.get('OMNIBUS_CONTRACT');
        const ownerPrivateKey = this.configService.get('SIGNER_PRIVATE_KEY');
        const coldVaultAddress = this.configService.get('COLD_CONTRACT');
        const TSSPrivateKey = this.configService.get('TSS_PRIVATE_KEY');
        if (!rpcUrl) {
            throw new Error('RPC_URL 환경변수가 설정되지 않았습니다.');
        }
        if (!contractAddress) {
            throw new Error('OMNIBUS_CONTRACT 환경변수가 설정되지 않았습니다.');
        }
        if (!ownerPrivateKey) {
            throw new Error('SIGNER_PRIVATE_KEY 환경변수가 설정되지 않았습니다.');
        }
        if (!coldVaultAddress) {
            throw new Error('COLD_CONTRACT 환경변수가 설정되지 않았습니다.');
        }
        if (!TSSPrivateKey) {
            throw new Error('TSS_PRIVATE_KEY 환경변수가 설정되지 않았습니다.');
        }
        this.provider = new ethers_1.ethers.JsonRpcProvider(rpcUrl);
        const signer = new ethers_1.ethers.Wallet(ownerPrivateKey, this.provider);
        this.omnibusContract = new ethers_1.ethers.Contract(contractAddress, omnibusWallet_json_1.default, signer);
        const coldVaultSigner = new ethers_1.ethers.Wallet(ownerPrivateKey, this.provider);
        this.coldVaultContract = new ethers_1.ethers.Contract(coldVaultAddress, coldVault_json_1.default, coldVaultSigner);
        const TSSsigner = new ethers_1.ethers.Wallet(TSSPrivateKey, this.provider);
        this.TSScoldVaultContract = new ethers_1.ethers.Contract(coldVaultAddress, coldVault_json_1.default, TSSsigner);
    }
    async getOmnibusBalance() {
        try {
            const omnibusAddress = await this.omnibusContract.getAddress();
            const balanceWei = await this.provider.getBalance(omnibusAddress);
            const balanceEth = (0, ethers_1.formatEther)(balanceWei);
            return {
                balance: balanceWei.toString(),
                balanceEth,
            };
        }
        catch (error) {
            console.error('Omnibus 잔액 조회 실패:', error);
            throw new common_1.BadRequestException('Omnibus 잔액 조회에 실패했습니다.');
        }
    }
    async getColdBalance() {
        try {
            const coldVaultAddress = await this.omnibusContract.coldVault();
            if (!coldVaultAddress || coldVaultAddress === ethers_1.ethers.ZeroAddress) {
                throw new common_1.BadRequestException('Cold vault 주소가 설정되지 않았습니다.');
            }
            const balanceWei = await this.provider.getBalance(coldVaultAddress);
            const balanceEth = (0, ethers_1.formatEther)(balanceWei);
            return {
                balance: balanceWei.toString(),
                balanceEth,
            };
        }
        catch (error) {
            console.error('Cold 잔액 조회 실패:', error);
            throw new common_1.BadRequestException('Cold 잔액 조회에 실패했습니다.');
        }
    }
    async getAllUsers() {
        try {
            const users = await this.prismaService.users.findMany({
                select: {
                    id: true,
                    email: true,
                    role: true,
                    status: true,
                    balance: true,
                    created_at: true,
                },
                orderBy: {
                    created_at: 'desc',
                },
            });
            const formattedUsers = users.map((user) => {
                const balanceWei = BigInt(user.balance.toString());
                const balanceEth = (0, ethers_1.formatEther)(balanceWei);
                return {
                    id: user.id,
                    email: user.email,
                    role: user.role,
                    status: user.status.toUpperCase(),
                    balance: user.balance.toString(),
                    balanceEth,
                    createdAt: user.created_at.toISOString(),
                };
            });
            return formattedUsers;
        }
        catch (error) {
            console.error('유저 목록 조회 실패:', error);
            throw new common_1.BadRequestException('유저 목록 조회에 실패했습니다.');
        }
    }
    async updateUserStatus(userId, status) {
        try {
            const statusLower = status.toLowerCase();
            const updatedUser = await this.prismaService.users.update({
                where: { id: userId },
                data: {
                    status: statusLower,
                },
                select: {
                    id: true,
                    status: true,
                },
            });
            return {
                id: updatedUser.id,
                status: updatedUser.status.toUpperCase(),
            };
        }
        catch (error) {
            if (error.code === 'P2025') {
                throw new common_1.NotFoundException('사용자를 찾을 수 없습니다.');
            }
            console.error('유저 상태 업데이트 실패:', error);
            throw new common_1.BadRequestException('유저 상태 업데이트에 실패했습니다.');
        }
    }
    async pauseOmnibus(paused) {
        try {
            const currentPaused = await this.omnibusContract.paused();
            if (currentPaused === paused) {
                return {
                    paused,
                    message: paused
                        ? 'Omnibus 지갑이 이미 동결 상태입니다.'
                        : 'Omnibus 지갑이 이미 활성화 상태입니다.',
                    txHash: null,
                };
            }
            const tx = await this.omnibusContract.pause(paused);
            const receipt = await tx.wait();
            return {
                paused,
                message: paused
                    ? 'Omnibus 지갑이 동결되었습니다.'
                    : 'Omnibus 지갑이 해제되었습니다.',
                txHash: receipt.hash,
                blockNumber: receipt.blockNumber?.toString(),
            };
        }
        catch (error) {
            console.error('Omnibus 지갑 동결/해제 실패:', error);
            if (error.message?.includes('NotOwner') || error.message?.includes('OwnableUnauthorizedAccount')) {
                throw new common_1.BadRequestException('Omnibus 컨트랙트 소유자만 동결/해제할 수 있습니다.');
            }
            throw new common_1.BadRequestException('Omnibus 지갑 동결/해제에 실패했습니다.');
        }
    }
    async getOmnibusPausedStatus() {
        try {
            const paused = await this.omnibusContract.paused();
            return {
                paused,
                status: paused ? 'PAUSED' : 'ACTIVE',
            };
        }
        catch (error) {
            console.error('Omnibus 지갑 상태 조회 실패:', error);
            throw new common_1.BadRequestException('Omnibus 지갑 상태 조회에 실패했습니다.');
        }
    }
    async getDepositWithdrawTransactions(limit = 100) {
        try {
            const events = await this.prismaService.deposit_withdraw_events.findMany({
                orderBy: {
                    timestamp: 'desc',
                },
                take: limit,
            });
            const transactions = events.map((event) => {
                const result = {
                    type: event.type,
                    email: event.email,
                    amount: event.amount.toString(),
                    timestamp: Number(event.timestamp) * 1000,
                };
                if (event.type === 'DEPOSIT' && event.from_address) {
                    result.from = event.from_address;
                }
                if (event.type === 'WITHDRAW' && event.to_address) {
                    result.to = event.to_address;
                }
                return result;
            });
            const total = await this.prismaService.deposit_withdraw_events.count();
            return {
                total,
                limit,
                transactions,
            };
        }
        catch (error) {
            console.error('입출금 기록 조회 실패:', error);
            throw new common_1.BadRequestException('입출금 기록 조회에 실패했습니다.');
        }
    }
    async coldDeposit(amountEth) {
        try {
            const amountWei = (0, ethers_1.parseEther)(amountEth);
            const tx = await this.coldVaultContract.adminDeposit({
                value: amountWei,
            });
            const receipt = await tx.wait();
            return {
                txHash: receipt.hash,
                blockNumber: receipt.blockNumber?.toString(),
                amount: amountWei.toString(),
                amountEth,
            };
        }
        catch (error) {
            console.error('Cold Vault 입금 실패:', error);
            if (error.message?.includes('NotOwner') || error.message?.includes('OwnableUnauthorizedAccount')) {
                throw new common_1.BadRequestException('Cold Vault 소유자만 입금할 수 있습니다.');
            }
            throw new common_1.BadRequestException('Cold Vault 입금에 실패했습니다.');
        }
    }
    async coldRequestMove(amountEth) {
        try {
            const amountWei = (0, ethers_1.parseEther)(amountEth);
            const tx = await this.coldVaultContract.requestMove(amountWei);
            const receipt = await tx.wait();
            const event = receipt.logs.find((log) => {
                try {
                    const parsed = this.coldVaultContract.interface.parseLog({
                        topics: log.topics,
                        data: log.data,
                    });
                    return parsed?.name === 'MoveRequested';
                }
                catch {
                    return false;
                }
            });
            let moveId = null;
            if (event) {
                const parsed = this.coldVaultContract.interface.parseLog({
                    topics: event.topics,
                    data: event.data,
                });
                moveId = parsed?.args.moveId;
            }
            return {
                txHash: receipt.hash,
                blockNumber: receipt.blockNumber?.toString(),
                moveId: moveId || '이벤트에서 추출 실패',
                amount: amountWei.toString(),
                amountEth,
            };
        }
        catch (error) {
            console.error('Cold Vault 이동 요청 실패:', error);
            if (error.message?.includes('NotManagerOrOwner')) {
                throw new common_1.BadRequestException('관리자 또는 소유자만 이동을 요청할 수 있습니다.');
            }
            if (error.message?.includes('PausedError')) {
                throw new common_1.BadRequestException('Cold Vault가 동결 상태입니다.');
            }
            throw new common_1.BadRequestException('Cold Vault 이동 요청에 실패했습니다.');
        }
    }
    async coldApproveMove(moveId) {
        try {
            if (!ethers_1.ethers.isHexString(moveId, 32)) {
                throw new common_1.BadRequestException('유효하지 않은 moveId 형식입니다.');
            }
            const move = await this.coldVaultContract.moves(moveId);
            if (move.executed) {
                throw new common_1.BadRequestException('이미 실행된 이동 요청입니다.');
            }
            let txHash = null;
            let blockNumber = null;
            let TSStxHash = null;
            let TSSblockNumber = null;
            try {
                const tx = await this.coldVaultContract.approveMove(moveId);
                const receipt = await tx.wait();
                txHash = receipt.hash;
                blockNumber = receipt.blockNumber?.toString() || null;
            }
            catch (error) {
                console.warn('첫 번째 승인 실패 (이미 승인했을 수 있음):', error);
            }
            const moveAfterFirst = await this.coldVaultContract.moves(moveId);
            if (!moveAfterFirst.executed && !(moveAfterFirst.approvedAdmin1 && moveAfterFirst.approvedAdmin2)) {
                try {
                    const tx2 = await this.TSScoldVaultContract.approveMove(moveId);
                    const receipt2 = await tx2.wait();
                    TSStxHash = receipt2.hash;
                    TSSblockNumber = receipt2.blockNumber?.toString() || null;
                }
                catch (error) {
                    console.error('두 번째 승인 실패:', error);
                    if (txHash) {
                        throw new common_1.BadRequestException('첫 번째 승인은 완료되었지만 두 번째 승인에 실패했습니다.');
                    }
                    if (error.message?.includes('DuplicateApprover')) {
                        throw new common_1.BadRequestException('이미 승인한 관리자는 다시 승인할 수 없습니다.');
                    }
                    if (error.message?.includes('OnlyAdmin1OrAdmin2')) {
                        throw new common_1.BadRequestException('admin1 또는 admin2만 승인할 수 있습니다.');
                    }
                    throw error;
                }
            }
            const updatedMove = await this.coldVaultContract.moves(moveId);
            return {
                txHash,
                blockNumber,
                TSStxHash,
                TSSblockNumber,
                moveId,
                approvedAdmin1: updatedMove.approvedAdmin1,
                approvedAdmin2: updatedMove.approvedAdmin2,
                isExecutable: updatedMove.approvedAdmin1 && updatedMove.approvedAdmin2,
            };
        }
        catch (error) {
            console.error('Cold Vault 이동 승인 실패:', error);
            if (error.message?.includes('OnlyAdmin1OrAdmin2')) {
                throw new common_1.BadRequestException('admin1 또는 admin2만 승인할 수 있습니다.');
            }
            if (error.message?.includes('DuplicateApprover')) {
                throw new common_1.BadRequestException('이미 승인한 관리자는 다시 승인할 수 없습니다.');
            }
            if (error.message?.includes('AlreadyExecuted')) {
                throw new common_1.BadRequestException('이미 실행된 이동 요청입니다.');
            }
            if (error.message?.includes('PausedError')) {
                throw new common_1.BadRequestException('Cold Vault가 동결 상태입니다.');
            }
            if (error instanceof common_1.BadRequestException) {
                throw error;
            }
            throw new common_1.BadRequestException('Cold Vault 이동 승인에 실패했습니다.');
        }
    }
    async coldExecuteMove(moveId) {
        try {
            if (!ethers_1.ethers.isHexString(moveId, 32)) {
                throw new common_1.BadRequestException('유효하지 않은 moveId 형식입니다.');
            }
            const isExecutable = await this.coldVaultContract.isExecutableMoveView(moveId);
            if (!isExecutable) {
                const move = await this.coldVaultContract.moves(moveId);
                if (move.executed) {
                    throw new common_1.BadRequestException('이미 실행된 이동 요청입니다.');
                }
                if (!(move.approvedAdmin1 && move.approvedAdmin2)) {
                    throw new common_1.BadRequestException('2/2 승인이 완료되지 않았습니다.');
                }
                throw new common_1.BadRequestException('이동 요청을 실행할 수 없습니다.');
            }
            const tx = await this.coldVaultContract.executeMove(moveId);
            const receipt = await tx.wait();
            const executedMove = await this.coldVaultContract.moves(moveId);
            return {
                txHash: receipt.hash,
                blockNumber: receipt.blockNumber?.toString(),
                moveId,
                amount: executedMove.amount.toString(),
                amountEth: (0, ethers_1.formatEther)(executedMove.amount),
                executed: executedMove.executed,
            };
        }
        catch (error) {
            console.error('Cold Vault 이동 실행 실패:', error);
            if (error.message?.includes('NotOwner') || error.message?.includes('OwnableUnauthorizedAccount')) {
                throw new common_1.BadRequestException('Cold Vault 소유자만 실행할 수 있습니다.');
            }
            if (error.message?.includes('AlreadyExecuted')) {
                throw new common_1.BadRequestException('이미 실행된 이동 요청입니다.');
            }
            if (error.message?.includes('NotExecutable')) {
                throw new common_1.BadRequestException('2/2 승인이 완료되지 않았거나 실행할 수 없는 상태입니다.');
            }
            if (error.message?.includes('OmnibusNotSet')) {
                throw new common_1.BadRequestException('Omnibus Vault 주소가 설정되지 않았습니다.');
            }
            if (error.message?.includes('TransferFailed')) {
                throw new common_1.BadRequestException('ETH 전송에 실패했습니다.');
            }
            if (error.message?.includes('PausedError')) {
                throw new common_1.BadRequestException('Cold Vault가 동결 상태입니다.');
            }
            if (error instanceof common_1.BadRequestException) {
                throw error;
            }
            throw new common_1.BadRequestException('Cold Vault 이동 실행에 실패했습니다.');
        }
    }
    async getPendingWithdrawalRequests(limit = 50) {
        try {
            const smallTxThresholdWei = (0, ethers_1.parseEther)('0.01');
            const pendingRequests = [];
            const currentBlock = await this.provider.getBlockNumber();
            const fromBlock = Math.max(0, currentBlock - 10000);
            const submittedEventFilter = this.omnibusContract.filters.Submitted();
            const events = await this.omnibusContract.queryFilter(submittedEventFilter, fromBlock, currentBlock);
            const sortedEvents = events
                .sort((a, b) => (b.blockNumber || 0) - (a.blockNumber || 0))
                .slice(0, limit * 2);
            for (const event of sortedEvents) {
                if (pendingRequests.length >= limit)
                    break;
                try {
                    if (!('args' in event)) {
                        continue;
                    }
                    const txId = event.args.txId;
                    const onchainTx = await this.omnibusContract.txs(txId);
                    if (!onchainTx ||
                        onchainTx.userKey === ethers_1.ethers.ZeroHash ||
                        onchainTx.executed) {
                        continue;
                    }
                    const amountInWei = BigInt(onchainTx.amount.toString());
                    const isSmallTx = amountInWei < smallTxThresholdWei;
                    const requiresManagerApproval = !isSmallTx && onchainTx.approvedTss && !onchainTx.approvedManager;
                    if (requiresManagerApproval || (!onchainTx.approvedTss && !isSmallTx)) {
                        let email = null;
                        try {
                            const users = await this.prismaService.users.findMany({
                                select: { email: true },
                            });
                            for (const user of users) {
                                const userKey = (0, viem_1.stringToHex)(user.email.trim().toLowerCase(), {
                                    size: 32,
                                });
                                if (userKey === onchainTx.userKey) {
                                    email = user.email;
                                    break;
                                }
                            }
                        }
                        catch (error) {
                            console.warn('이메일 변환 실패:', error);
                        }
                        pendingRequests.push({
                            txId,
                            email,
                            to: onchainTx.to.toLowerCase(),
                            amount: amountInWei.toString(),
                            amountEth: (0, ethers_1.formatEther)(amountInWei),
                            approvedTss: onchainTx.approvedTss,
                            approvedManager: onchainTx.approvedManager,
                            executed: onchainTx.executed,
                            requiresManagerApproval,
                        });
                    }
                }
                catch (error) {
                    console.warn('출금 요청 정보 조회 실패:', error);
                    continue;
                }
            }
            return {
                total: pendingRequests.length,
                requests: pendingRequests,
            };
        }
        catch (error) {
            console.error('승인 대기 출금 요청 조회 실패:', error);
            throw new common_1.BadRequestException('승인 대기 출금 요청 조회에 실패했습니다.');
        }
    }
    async getWithdrawalRequestInfo(txId) {
        try {
            if (!ethers_1.ethers.isHexString(txId, 32)) {
                throw new common_1.BadRequestException('유효하지 않은 txId 형식입니다.');
            }
            const onchainTx = await this.omnibusContract.txs(txId);
            if (!onchainTx || onchainTx.userKey === ethers_1.ethers.ZeroHash) {
                throw new common_1.NotFoundException('존재하지 않는 출금 요청입니다.');
            }
            let email = null;
            let userId = null;
            try {
                const users = await this.prismaService.users.findMany({
                    select: { id: true, email: true },
                });
                for (const user of users) {
                    const userKey = (0, viem_1.stringToHex)(user.email.trim().toLowerCase(), {
                        size: 32,
                    });
                    if (userKey === onchainTx.userKey) {
                        email = user.email;
                        userId = user.id;
                        break;
                    }
                }
            }
            catch (error) {
                console.warn('이메일 변환 실패:', error);
            }
            const amountInWei = BigInt(onchainTx.amount.toString());
            const smallTxThresholdWei = (0, ethers_1.parseEther)('0.01');
            const isSmallTx = amountInWei < smallTxThresholdWei;
            return {
                txId,
                email,
                userId,
                to: onchainTx.to.toLowerCase(),
                amount: amountInWei.toString(),
                amountEth: (0, ethers_1.formatEther)(amountInWei),
                approvedTss: onchainTx.approvedTss,
                approvedManager: onchainTx.approvedManager,
                executed: onchainTx.executed,
                isSmallTx,
                requiresManagerApproval: !isSmallTx && onchainTx.approvedTss && !onchainTx.approvedManager,
            };
        }
        catch (error) {
            if (error instanceof common_1.BadRequestException || error instanceof common_1.NotFoundException) {
                throw error;
            }
            console.error('출금 요청 정보 조회 실패:', error);
            throw new common_1.BadRequestException('출금 요청 정보 조회에 실패했습니다.');
        }
    }
    async approveWithdrawalRequest(txId) {
        try {
            if (!ethers_1.ethers.isHexString(txId, 32)) {
                throw new common_1.BadRequestException('유효하지 않은 txId 형식입니다.');
            }
            const onchainTx = await this.omnibusContract.txs(txId);
            if (!onchainTx || onchainTx.userKey === ethers_1.ethers.ZeroHash) {
                throw new common_1.NotFoundException('존재하지 않는 출금 요청입니다.');
            }
            if (onchainTx.executed) {
                throw new common_1.BadRequestException('이미 실행된 출금 요청입니다.');
            }
            if (onchainTx.approvedManager) {
                throw new common_1.BadRequestException('이미 Manager 승인이 완료된 출금 요청입니다.');
            }
            if (!onchainTx.approvedTss) {
                throw new common_1.BadRequestException('TSS 승인이 완료되지 않았습니다.');
            }
            const tx = await this.omnibusContract.approveTx(txId);
            const receipt = await tx.wait();
            const updatedTx = await this.omnibusContract.txs(txId);
            const amountInWei = BigInt(onchainTx.amount.toString());
            return {
                txHash: receipt.hash,
                blockNumber: receipt.blockNumber?.toString(),
                txId,
                amount: amountInWei.toString(),
                amountEth: (0, ethers_1.formatEther)(amountInWei),
                approvedTss: updatedTx.approvedTss,
                approvedManager: updatedTx.approvedManager,
                executed: updatedTx.executed,
                status: 'manager_approved',
            };
        }
        catch (error) {
            if (error instanceof common_1.BadRequestException ||
                error instanceof common_1.NotFoundException) {
                throw error;
            }
            console.error('출금 요청 Manager 승인 실패:', error);
            if (error.message?.includes('NotManager') ||
                error.message?.includes('NotManagerOrOwner')) {
                throw new common_1.BadRequestException('Manager 권한이 없습니다.');
            }
            throw new common_1.BadRequestException('출금 요청 Manager 승인에 실패했습니다.');
        }
    }
    async executeWithdrawalRequest(txId) {
        try {
            if (!ethers_1.ethers.isHexString(txId, 32)) {
                throw new common_1.BadRequestException('유효하지 않은 txId 형식입니다.');
            }
            const onchainTx = await this.omnibusContract.txs(txId);
            if (!onchainTx || onchainTx.userKey === ethers_1.ethers.ZeroHash) {
                throw new common_1.NotFoundException('존재하지 않는 출금 요청입니다.');
            }
            if (onchainTx.executed) {
                throw new common_1.BadRequestException('이미 실행된 출금 요청입니다.');
            }
            const smallTxThresholdWei = (0, ethers_1.parseEther)('0.01');
            const amountInWei = BigInt(onchainTx.amount.toString());
            const isSmallTx = amountInWei < smallTxThresholdWei;
            if (!onchainTx.approvedTss) {
                throw new common_1.BadRequestException('TSS 승인이 완료되지 않았습니다.');
            }
            if (!isSmallTx && !onchainTx.approvedManager) {
                throw new common_1.BadRequestException('Manager 승인이 완료되지 않았습니다.');
            }
            let email = null;
            let userId = null;
            const users = await this.prismaService.users.findMany({
                select: { id: true, email: true, balance: true },
            });
            for (const user of users) {
                const userKey = (0, viem_1.stringToHex)(user.email.trim().toLowerCase(), {
                    size: 32,
                });
                if (userKey === onchainTx.userKey) {
                    email = user.email;
                    userId = user.id;
                    break;
                }
            }
            if (!email || !userId) {
                throw new common_1.NotFoundException('출금 요청에 해당하는 사용자를 찾을 수 없습니다.');
            }
            const user = await this.prismaService.users.findUnique({
                where: { id: userId },
                select: { id: true, email: true, balance: true },
            });
            if (!user) {
                throw new common_1.NotFoundException('사용자를 찾을 수 없습니다.');
            }
            const userBalance = BigInt(user.balance.toString());
            if (userBalance < amountInWei) {
                throw new common_1.BadRequestException('사용자 잔액이 부족합니다.');
            }
            const txResponse = await this.omnibusContract.execute(txId, smallTxThresholdWei);
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
            const ownerContractAddress = (await this.omnibusContract.getAddress()).toLowerCase();
            const recipientAddress = onchainTx.to?.toLowerCase();
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
                amountEth: (0, ethers_1.formatEther)(amountInWei),
                newBalance: result.updatedUser.balance.toString(),
                email,
                userId,
            };
        }
        catch (error) {
            if (error instanceof common_1.BadRequestException ||
                error instanceof common_1.NotFoundException) {
                throw error;
            }
            console.error('출금 실행 실패:', error);
            if (error.message?.includes('NotExecutable')) {
                throw new common_1.BadRequestException('출금 요청을 실행할 수 없는 상태입니다.');
            }
            if (error.message?.includes('AlreadyExecuted')) {
                throw new common_1.BadRequestException('이미 실행된 출금 요청입니다.');
            }
            if (error.message?.includes('Insufficient')) {
                throw new common_1.BadRequestException('컨트랙트 잔액이 부족합니다.');
            }
            throw new common_1.BadRequestException('출금 실행에 실패했습니다.');
        }
    }
};
exports.AdminService = AdminService;
exports.AdminService = AdminService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        config_1.ConfigService])
], AdminService);
//# sourceMappingURL=admin.service.js.map