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
var EventsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const config_1 = require("@nestjs/config");
const ethers_1 = require("ethers");
const viem_1 = require("viem");
const omnibusWallet_json_1 = __importDefault(require("../abi/omnibusWallet.json"));
const events_gateway_1 = require("./events.gateway");
let EventsService = EventsService_1 = class EventsService {
    prismaService;
    configService;
    eventsGateway;
    provider;
    omnibusContract;
    userKeyToEmailMap = new Map();
    logger = new common_1.Logger(EventsService_1.name);
    isListening = false;
    reconnectTimer;
    constructor(prismaService, configService, eventsGateway) {
        this.prismaService = prismaService;
        this.configService = configService;
        this.eventsGateway = eventsGateway;
        const rpcUrl = this.configService.get('RPC_URL');
        const contractAddress = this.configService.get('OMNIBUS_CONTRACT');
        const ownerPrivateKey = this.configService.get('SIGNER_PRIVATE_KEY');
        if (!rpcUrl) {
            throw new Error('RPC_URL 환경변수가 설정되지 않았습니다.');
        }
        if (!contractAddress) {
            throw new Error('OMNIBUS_CONTRACT 환경변수가 설정되지 않았습니다.');
        }
        if (!ownerPrivateKey) {
            throw new Error('SIGNER_PRIVATE_KEY 환경변수가 설정되지 않았습니다.');
        }
        if (rpcUrl.startsWith('ws://') || rpcUrl.startsWith('wss://')) {
            this.provider = new ethers_1.ethers.WebSocketProvider(rpcUrl);
            this.logger.log('WebSocket RPC 연결 사용 (필터 만료 문제 해결)');
        }
        else {
            this.provider = new ethers_1.ethers.JsonRpcProvider(rpcUrl);
            this.logger.warn('HTTP RPC 사용 중 - WebSocket 사용을 권장합니다 (wss://)');
        }
        const signer = new ethers_1.ethers.Wallet(ownerPrivateKey, this.provider);
        this.omnibusContract = new ethers_1.ethers.Contract(contractAddress, omnibusWallet_json_1.default, signer);
        this.provider.on('error', (error) => {
            this.logger.error('Provider 에러 발생:', error);
            if (error?.error?.code === -32001 || error?.code === 'UNKNOWN_ERROR') {
                this.logger.warn('필터 만료 감지, 이벤트 리스너 재시작 시도...');
                this.restartEventListeners();
            }
        });
    }
    async onModuleInit() {
        await this.updateUserKeyMap();
        await this.startEventListeners();
        setInterval(async () => {
            await this.updateUserKeyMap();
        }, 5 * 60 * 1000);
    }
    async updateUserKeyMap() {
        try {
            const users = await this.prismaService.users.findMany({
                select: {
                    id: true,
                    email: true,
                },
            });
            this.userKeyToEmailMap.clear();
            users.forEach((user) => {
                const normalizedEmail = user.email.trim().toLowerCase();
                const userKey = (0, viem_1.stringToHex)(normalizedEmail, { size: 32 });
                this.userKeyToEmailMap.set(userKey.toLowerCase(), user.email);
            });
            this.logger.log(`UserKey 매핑 업데이트 완료: ${this.userKeyToEmailMap.size}명`);
        }
        catch (error) {
            if (error?.code === 'P2021') {
                this.logger.warn('데이터베이스 테이블이 존재하지 않습니다. 마이그레이션을 실행해주세요: npx prisma migrate deploy');
                return;
            }
            this.logger.error('UserKey 매핑 업데이트 실패:', error);
        }
    }
    async startEventListeners() {
        if (this.isListening) {
            this.logger.warn('이벤트 리스너가 이미 실행 중입니다.');
            return;
        }
        this.isListening = true;
        this.logger.log('블록체인 이벤트 리스너 시작');
        this.omnibusContract.on('Deposit', async (userKey, from, token, amount, event) => {
            try {
                await this.handleDepositEvent(userKey, from, token, amount, event);
            }
            catch (error) {
                this.logger.error('Deposit 이벤트 처리 실패:', error);
            }
        });
        this.omnibusContract.on('Submitted', async (txId, to, amount, userKey, event) => {
            try {
                await this.handleSubmittedEvent(txId, to, amount, userKey, event);
            }
            catch (error) {
                this.logger.error('Submitted 이벤트 처리 실패:', error);
            }
        });
        this.logger.log('이벤트 리스너 등록 완료');
    }
    async handleDepositEvent(userKey, from, token, amount, event) {
        try {
            const transactionHash = event.log.transactionHash;
            const blockNumber = event.log.blockNumber;
            if (!transactionHash) {
                this.logger.warn('트랜잭션 해시를 찾을 수 없습니다.');
                return;
            }
            const existing = await this.prismaService.deposit_withdraw_events.findUnique({
                where: {
                    transaction_hash: transactionHash,
                },
            });
            if (existing) {
                this.logger.debug(`이미 저장된 Deposit 이벤트: ${transactionHash}`);
                return;
            }
            const block = await this.provider.getBlock(blockNumber);
            if (!block) {
                this.logger.warn(`블록 정보를 찾을 수 없음: ${blockNumber}`);
                return;
            }
            const email = this.userKeyToEmailMap.get(userKey.toLowerCase()) || null;
            const savedEvent = await this.prismaService.deposit_withdraw_events.create({
                data: {
                    type: 'DEPOSIT',
                    email,
                    from_address: from.toLowerCase(),
                    to_address: null,
                    amount: (0, ethers_1.formatEther)(amount),
                    timestamp: BigInt(block.timestamp),
                    transaction_hash: transactionHash,
                    block_number: BigInt(blockNumber),
                },
            });
            this.logger.log(`Deposit 이벤트 저장 완료: ${transactionHash} (${(0, ethers_1.formatEther)(amount)} ETH)`);
            this.eventsGateway.broadcastDepositWithdrawEvent({
                type: 'DEPOSIT',
                email,
                from: from.toLowerCase(),
                amount: (0, ethers_1.formatEther)(amount),
                timestamp: block.timestamp * 1000,
            });
        }
        catch (error) {
            if (error.code === 'P2002') {
                this.logger.debug(`중복된 Deposit 이벤트: ${event.log?.transactionHash || 'unknown'}`);
                return;
            }
            throw error;
        }
    }
    async handleSubmittedEvent(txId, to, amount, userKey, event) {
        try {
            const transactionHash = event.log.transactionHash;
            const blockNumber = event.log.blockNumber;
            if (!transactionHash) {
                this.logger.warn('트랜잭션 해시를 찾을 수 없습니다.');
                return;
            }
            const existing = await this.prismaService.deposit_withdraw_events.findUnique({
                where: {
                    transaction_hash: transactionHash,
                },
            });
            if (existing) {
                this.logger.debug(`이미 저장된 Submitted 이벤트: ${transactionHash}`);
                return;
            }
            const block = await this.provider.getBlock(blockNumber);
            if (!block) {
                this.logger.warn(`블록 정보를 찾을 수 없음: ${blockNumber}`);
                return;
            }
            const email = this.userKeyToEmailMap.get(userKey.toLowerCase()) || null;
            const savedEvent = await this.prismaService.deposit_withdraw_events.create({
                data: {
                    type: 'WITHDRAW',
                    email,
                    from_address: null,
                    to_address: to.toLowerCase(),
                    amount: (0, ethers_1.formatEther)(amount),
                    timestamp: BigInt(block.timestamp),
                    transaction_hash: transactionHash,
                    block_number: BigInt(blockNumber),
                },
            });
            this.logger.log(`Submitted 이벤트 저장 완료: ${transactionHash} (${(0, ethers_1.formatEther)(amount)} ETH)`);
            this.eventsGateway.broadcastDepositWithdrawEvent({
                type: 'WITHDRAW',
                email,
                to: to.toLowerCase(),
                amount: (0, ethers_1.formatEther)(amount),
                timestamp: block.timestamp * 1000,
            });
        }
        catch (error) {
            if (error.code === 'P2002') {
                this.logger.debug(`중복된 Submitted 이벤트: ${event.log?.transactionHash || 'unknown'}`);
                return;
            }
            throw error;
        }
    }
    async restartEventListeners() {
        if (this.reconnectTimer) {
            return;
        }
        this.logger.log('이벤트 리스너 재시작 예약 (10초 후)...');
        await this.stopEventListeners();
        this.reconnectTimer = setTimeout(async () => {
            try {
                this.logger.log('이벤트 리스너 재시작 중...');
                await this.startEventListeners();
                this.reconnectTimer = undefined;
                this.logger.log('이벤트 리스너 재시작 완료');
            }
            catch (error) {
                this.logger.error('이벤트 리스너 재시작 실패:', error);
                this.reconnectTimer = undefined;
                setTimeout(() => this.restartEventListeners(), 30000);
            }
        }, 10000);
    }
    async stopEventListeners() {
        if (!this.isListening) {
            return;
        }
        this.omnibusContract.removeAllListeners('Deposit');
        this.omnibusContract.removeAllListeners('Submitted');
        this.isListening = false;
        this.logger.log('이벤트 리스너 중지');
    }
};
exports.EventsService = EventsService;
exports.EventsService = EventsService = EventsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        config_1.ConfigService,
        events_gateway_1.EventsGateway])
], EventsService);
//# sourceMappingURL=events.service.js.map