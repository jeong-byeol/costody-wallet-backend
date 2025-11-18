import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { ethers, formatEther } from 'ethers';
import { stringToHex } from 'viem';
import omnibusAbi from '../abi/omnibusWallet.json';
import { EventsGateway } from './events.gateway';

// 블록체인 이벤트 리스너 서비스 - 실시간으로 이벤트를 감지하고 DB에 저장
@Injectable()
export class EventsService implements OnModuleInit {
  private provider: ethers.JsonRpcProvider;
  private omnibusContract: ethers.Contract;
  private userKeyToEmailMap: Map<string, string> = new Map();
  private readonly logger = new Logger(EventsService.name);
  private isListening = false;

  constructor(
    private readonly prismaService: PrismaService,
    private readonly configService: ConfigService,
    private readonly eventsGateway: EventsGateway,
  ) {
    // Ethereum RPC 프로바이더 초기화
    const rpcUrl = this.configService.get<string>('RPC_URL');
    const contractAddress =
      this.configService.get<string>('OMNIBUS_CONTRACT');
    const ownerPrivateKey = this.configService.get<string>('SIGNER_PRIVATE_KEY');

    if (!rpcUrl) {
      throw new Error('RPC_URL 환경변수가 설정되지 않았습니다.');
    }

    if (!contractAddress) {
      throw new Error('OMNIBUS_CONTRACT 환경변수가 설정되지 않았습니다.');
    }

    if (!ownerPrivateKey) {
      throw new Error('SIGNER_PRIVATE_KEY 환경변수가 설정되지 않았습니다.');
    }

    this.provider = new ethers.JsonRpcProvider(rpcUrl);
    const signer = new ethers.Wallet(ownerPrivateKey, this.provider);
    this.omnibusContract = new ethers.Contract(
      contractAddress,
      omnibusAbi,
      signer,
    );
  }

  // 모듈 초기화 시 이벤트 리스너 시작
  async onModuleInit() {
    // userKey 매핑 업데이트 (실패해도 계속 진행)
    await this.updateUserKeyMap();
    
    // 이벤트 리스너 시작
    await this.startEventListeners();

    // 주기적으로 userKey 매핑 업데이트 (5분마다)
    setInterval(async () => {
      await this.updateUserKeyMap();
    }, 5 * 60 * 1000);
  }

  // userKey -> email 매핑 업데이트
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
        const userKey = stringToHex(normalizedEmail, { size: 32 });
        this.userKeyToEmailMap.set(userKey.toLowerCase(), user.email);
      });

      this.logger.log(`UserKey 매핑 업데이트 완료: ${this.userKeyToEmailMap.size}명`);
    } catch (error: any) {
      // 테이블이 존재하지 않는 경우 (마이그레이션 미실행)
      if (error?.code === 'P2021') {
        this.logger.warn(
          '데이터베이스 테이블이 존재하지 않습니다. 마이그레이션을 실행해주세요: npx prisma migrate deploy',
        );
        return;
      }
      this.logger.error('UserKey 매핑 업데이트 실패:', error);
    }
  }

  // 이벤트 리스너 시작
  async startEventListeners() {
    if (this.isListening) {
      this.logger.warn('이벤트 리스너가 이미 실행 중입니다.');
      return;
    }

    this.isListening = true;
    this.logger.log('블록체인 이벤트 리스너 시작');

    // Deposit 이벤트 리스너 (입금)
    this.omnibusContract.on(
      'Deposit',
      async (
        userKey: string,
        from: string,
        token: string,
        amount: bigint,
        event: ethers.ContractEventPayload,
      ) => {
        try {
          await this.handleDepositEvent(
            userKey,
            from,
            token,
            amount,
            event,
          );
        } catch (error) {
          this.logger.error('Deposit 이벤트 처리 실패:', error);
        }
      },
    );

    // Submitted 이벤트 리스너 (출금)
    this.omnibusContract.on(
      'Submitted',
      async (
        txId: string,
        to: string,
        amount: bigint,
        userKey: string,
        event: ethers.ContractEventPayload,
      ) => {
        try {
          await this.handleSubmittedEvent(txId, to, amount, userKey, event);
        } catch (error) {
          this.logger.error('Submitted 이벤트 처리 실패:', error);
        }
      },
    );

    this.logger.log('이벤트 리스너 등록 완료');
  }

  // Deposit 이벤트 처리 (입금)
  private async handleDepositEvent(
    userKey: string,
    from: string,
    token: string,
    amount: bigint,
    event: ethers.ContractEventPayload,
  ) {
    try {
      // 이벤트 로그에서 트랜잭션 해시와 블록 번호 가져오기
      const transactionHash = event.log.transactionHash;
      const blockNumber = event.log.blockNumber;

      if (!transactionHash) {
        this.logger.warn('트랜잭션 해시를 찾을 수 없습니다.');
        return;
      }

      // 중복 체크
      const existing = await this.prismaService.deposit_withdraw_events.findUnique(
        {
          where: {
            transaction_hash: transactionHash,
          },
        },
      );

      if (existing) {
        this.logger.debug(
          `이미 저장된 Deposit 이벤트: ${transactionHash}`,
        );
        return;
      }

      // 블록 정보 가져오기
      const block = await this.provider.getBlock(blockNumber);
      if (!block) {
        this.logger.warn(`블록 정보를 찾을 수 없음: ${blockNumber}`);
        return;
      }

      // userKey로 email 찾기
      const email = this.userKeyToEmailMap.get(userKey.toLowerCase()) || null;

      // DB에 저장
      const savedEvent = await this.prismaService.deposit_withdraw_events.create(
        {
          data: {
            type: 'DEPOSIT',
            email,
            from_address: from.toLowerCase(),
            to_address: null,
            amount: formatEther(amount),
            timestamp: BigInt(block.timestamp),
            transaction_hash: transactionHash,
            block_number: BigInt(blockNumber),
          },
        },
      );

      this.logger.log(
        `Deposit 이벤트 저장 완료: ${transactionHash} (${formatEther(amount)} ETH)`,
      );

      // WebSocket으로 브로드캐스트
      this.eventsGateway.broadcastDepositWithdrawEvent({
        type: 'DEPOSIT',
        email,
        from: from.toLowerCase(),
        amount: formatEther(amount),
        timestamp: block.timestamp * 1000,
      });
    } catch (error) {
      // 중복 키 에러는 무시
      if (error.code === 'P2002') {
        this.logger.debug(
          `중복된 Deposit 이벤트: ${event.log?.transactionHash || 'unknown'}`,
        );
        return;
      }
      throw error;
    }
  }

  // Submitted 이벤트 처리 (출금)
  private async handleSubmittedEvent(
    txId: string,
    to: string,
    amount: bigint,
    userKey: string,
    event: ethers.ContractEventPayload,
  ) {
    try {
      // 이벤트 로그에서 트랜잭션 해시와 블록 번호 가져오기
      const transactionHash = event.log.transactionHash;
      const blockNumber = event.log.blockNumber;

      if (!transactionHash) {
        this.logger.warn('트랜잭션 해시를 찾을 수 없습니다.');
        return;
      }

      // 중복 체크
      const existing = await this.prismaService.deposit_withdraw_events.findUnique(
        {
          where: {
            transaction_hash: transactionHash,
          },
        },
      );

      if (existing) {
        this.logger.debug(
          `이미 저장된 Submitted 이벤트: ${transactionHash}`,
        );
        return;
      }

      // 블록 정보 가져오기
      const block = await this.provider.getBlock(blockNumber);
      if (!block) {
        this.logger.warn(`블록 정보를 찾을 수 없음: ${blockNumber}`);
        return;
      }

      // userKey로 email 찾기
      const email = this.userKeyToEmailMap.get(userKey.toLowerCase()) || null;

      // DB에 저장
      const savedEvent = await this.prismaService.deposit_withdraw_events.create(
        {
          data: {
            type: 'WITHDRAW',
            email,
            from_address: null,
            to_address: to.toLowerCase(),
            amount: formatEther(amount),
            timestamp: BigInt(block.timestamp),
            transaction_hash: transactionHash,
            block_number: BigInt(blockNumber),
          },
        },
      );

      this.logger.log(
        `Submitted 이벤트 저장 완료: ${transactionHash} (${formatEther(amount)} ETH)`,
      );

      // WebSocket으로 브로드캐스트
      this.eventsGateway.broadcastDepositWithdrawEvent({
        type: 'WITHDRAW',
        email,
        to: to.toLowerCase(),
        amount: formatEther(amount),
        timestamp: block.timestamp * 1000,
      });
    } catch (error) {
      // 중복 키 에러는 무시
      if (error.code === 'P2002') {
        this.logger.debug(
          `중복된 Submitted 이벤트: ${event.log?.transactionHash || 'unknown'}`,
        );
        return;
      }
      throw error;
    }
  }

  // 이벤트 리스너 중지
  async stopEventListeners() {
    if (!this.isListening) {
      return;
    }

    this.omnibusContract.removeAllListeners('Deposit');
    this.omnibusContract.removeAllListeners('Submitted');
    this.isListening = false;
    this.logger.log('이벤트 리스너 중지');
  }
}

