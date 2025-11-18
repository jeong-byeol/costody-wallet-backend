import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { ethers, formatEther, parseEther } from 'ethers';
import omnibusAbi from '../abi/omnibusWallet.json';
import coldVaultAbi from '../abi/coldVault.json';
import { stringToHex } from 'viem';

// 관리자 전용 비즈니스 로직을 담당하는 서비스
@Injectable()
export class AdminService {
  private provider: ethers.JsonRpcProvider;
  private omnibusContract: ethers.Contract;
  private coldVaultContract: ethers.Contract;
  private TSScoldVaultContract: ethers.Contract;
  constructor(
    private readonly prismaService: PrismaService,
    private readonly configService: ConfigService,
  ) {
    // Ethereum RPC 프로바이더 초기화
    const rpcUrl = this.configService.get<string>('RPC_URL');
    const contractAddress =
      this.configService.get<string>('OMNIBUS_CONTRACT');
    const ownerPrivateKey = this.configService.get<string>('SIGNER_PRIVATE_KEY');
    const coldVaultAddress = this.configService.get<string>('COLD_CONTRACT');
    const TSSPrivateKey = this.configService.get<string>('TSS_PRIVATE_KEY');

    // 환경변수 검증
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

    // Provider 초기화
    this.provider = new ethers.JsonRpcProvider(rpcUrl);

    // Omnibus 컨트랙트 초기화
    const signer = new ethers.Wallet(ownerPrivateKey, this.provider);
    this.omnibusContract = new ethers.Contract(
      contractAddress,
      omnibusAbi,
      signer,
    );

    // Cold Vault 컨트랙트 초기화 (Owner용)
    const coldVaultSigner = new ethers.Wallet(ownerPrivateKey, this.provider);
    this.coldVaultContract = new ethers.Contract(
      coldVaultAddress,
      coldVaultAbi,
      coldVaultSigner,
    );

    // Cold Vault 컨트랙트 초기화 (TSS용)
    const TSSsigner = new ethers.Wallet(TSSPrivateKey, this.provider);
    this.TSScoldVaultContract = new ethers.Contract(
      coldVaultAddress,
      coldVaultAbi,
      TSSsigner,
    );
  }

  /**
   * Omnibus 잔액 조회 (관리자 전용)
   * @returns balance (Wei 단위 문자열), balanceEth (ETH 단위 문자열)
   */
  async getOmnibusBalance() {
    try {
      // Omnibus 컨트랙트 주소 가져오기
      const omnibusAddress = await this.omnibusContract.getAddress();

      // Omnibus 컨트랙트의 잔액 조회 (Wei 단위)
      const balanceWei = await this.provider.getBalance(omnibusAddress);

      // Wei를 ETH로 변환
      const balanceEth = formatEther(balanceWei);

      return {
        balance: balanceWei.toString(),
        balanceEth,
      };
    } catch (error) {
      console.error('Omnibus 잔액 조회 실패:', error);
      throw new BadRequestException('Omnibus 잔액 조회에 실패했습니다.');
    }
  }

  /**
   * Cold 잔액 조회 (관리자 전용)
   * @returns balance (Wei 단위 문자열), balanceEth (ETH 단위 문자열)
   */
  async getColdBalance() {
    try {
      // Omnibus 컨트랙트에서 cold vault 주소 가져오기
      const coldVaultAddress = await this.omnibusContract.coldVault();

      if (!coldVaultAddress || coldVaultAddress === ethers.ZeroAddress) {
        throw new BadRequestException('Cold vault 주소가 설정되지 않았습니다.');
      }

      // Cold vault 주소의 잔액 조회 (Wei 단위)
      const balanceWei = await this.provider.getBalance(coldVaultAddress);

      // Wei를 ETH로 변환
      const balanceEth = formatEther(balanceWei);

      return {
        balance: balanceWei.toString(),
        balanceEth,
      };
    } catch (error) {
      console.error('Cold 잔액 조회 실패:', error);
      throw new BadRequestException('Cold 잔액 조회에 실패했습니다.');
    }
  }

  /**
   * 모든 유저 목록 조회 (관리자 전용)
   * @returns 유저 목록 배열 (id, email, role, status, balance, balanceEth, createdAt)
   */
  async getAllUsers() {
    try {
      // 모든 유저 조회
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
          created_at: 'desc', // 최신순 정렬
        },
      });

      // 유저 정보 포맷팅 (balance를 ETH로 변환, status를 대문자로 변환)
      const formattedUsers = users.map((user) => {
        const balanceWei = BigInt(user.balance.toString());
        const balanceEth = formatEther(balanceWei);

        return {
          id: user.id,
          email: user.email,
          role: user.role,
          status: user.status.toUpperCase() as 'ACTIVE' | 'FROZEN',
          balance: user.balance.toString(),
          balanceEth,
          createdAt: user.created_at.toISOString(),
        };
      });

      return formattedUsers;
    } catch (error) {
      console.error('유저 목록 조회 실패:', error);
      throw new BadRequestException('유저 목록 조회에 실패했습니다.');
    }
  }

  /**
   * 유저 동결/해제 (관리자 전용)
   * @param userId 사용자 ID
   * @param status 변경할 상태 (ACTIVE 또는 FROZEN)
   * @returns 업데이트된 사용자 정보
   */
  async updateUserStatus(userId: string, status: 'ACTIVE' | 'FROZEN') {
    try {
      // 상태를 소문자로 변환 (DB enum은 소문자)
      const statusLower = status.toLowerCase() as 'active' | 'frozen';

      // 사용자 존재 여부 확인 및 상태 업데이트
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
        status: updatedUser.status.toUpperCase() as 'ACTIVE' | 'FROZEN',
      };
    } catch (error) {
      // 사용자가 존재하지 않는 경우
      if (error.code === 'P2025') {
        throw new NotFoundException('사용자를 찾을 수 없습니다.');
      }

      console.error('유저 상태 업데이트 실패:', error);
      throw new BadRequestException('유저 상태 업데이트에 실패했습니다.');
    }
  }

  /**
   * Omnibus 지갑 동결/해제 (관리자 전용)
   * @param paused true: 동결, false: 해제
   * @returns 트랜잭션 해시 및 상태
   */
  async pauseOmnibus(paused: boolean) {
    try {
      // 현재 상태 확인
      const currentPaused = await this.omnibusContract.paused();

      // 이미 원하는 상태인 경우
      if (currentPaused === paused) {
        return {
          paused,
          message: paused
            ? 'Omnibus 지갑이 이미 동결 상태입니다.'
            : 'Omnibus 지갑이 이미 활성화 상태입니다.',
          txHash: null,
        };
      }

      // pause 함수 호출
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
    } catch (error) {
      console.error('Omnibus 지갑 동결/해제 실패:', error);

      // 권한 에러 처리
      if (error.message?.includes('NotOwner') || error.message?.includes('OwnableUnauthorizedAccount')) {
        throw new BadRequestException('Omnibus 컨트랙트 소유자만 동결/해제할 수 있습니다.');
      }

      throw new BadRequestException('Omnibus 지갑 동결/해제에 실패했습니다.');
    }
  }

  /**
   * Omnibus 지갑 동결 상태 조회 (관리자 전용)
   * @returns 동결 상태 (true: 동결, false: 활성화)
   */
  async getOmnibusPausedStatus() {
    try {
      const paused = await this.omnibusContract.paused();

      return {
        paused,
        status: paused ? 'PAUSED' : 'ACTIVE',
      };
    } catch (error) {
      console.error('Omnibus 지갑 상태 조회 실패:', error);
      throw new BadRequestException('Omnibus 지갑 상태 조회에 실패했습니다.');
    }
  }

  /**
   * 입출금 기록 조회 (관리자 전용)
   * DB에 저장된 입출금 이벤트를 조회하여 반환
   * @param limit 조회할 최대 개수 (선택, 기본값: 100)
   * @returns 입출금 기록 배열
   */
  async getDepositWithdrawTransactions(limit: number = 100) {
    try {
      // DB에서 이벤트 조회 (최신순)
      const events = await this.prismaService.deposit_withdraw_events.findMany({
        orderBy: {
          timestamp: 'desc',
        },
        take: limit,
      });

      // 응답 형식으로 변환
      const transactions = events.map((event) => {
        const result: {
          type: 'DEPOSIT' | 'WITHDRAW';
          email: string | null;
          from?: string;
          to?: string;
          amount: string;
          timestamp: number;
        } = {
          type: event.type,
          email: event.email,
          amount: event.amount.toString(),
          timestamp: Number(event.timestamp) * 1000, // 초를 밀리초로 변환
        };

        if (event.type === 'DEPOSIT' && event.from_address) {
          result.from = event.from_address;
        }

        if (event.type === 'WITHDRAW' && event.to_address) {
          result.to = event.to_address;
        }

        return result;
      });

      // 전체 개수 조회
      const total = await this.prismaService.deposit_withdraw_events.count();

      return {
        total,
        limit,
        transactions,
      };
    } catch (error) {
      console.error('입출금 기록 조회 실패:', error);
      throw new BadRequestException('입출금 기록 조회에 실패했습니다.');
    }
  }

  /**
   * Cold Vault 입금 (관리자 전용)
   * @param amountEth ETH 단위 금액
   * @returns 트랜잭션 해시
   */
  async coldDeposit(amountEth: string) {
    try {
      const amountWei = parseEther(amountEth);

      // adminDeposit 함수 호출 (payable)
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
    } catch (error) {
      console.error('Cold Vault 입금 실패:', error);

      // 권한 에러 처리
      if (error.message?.includes('NotOwner') || error.message?.includes('OwnableUnauthorizedAccount')) {
        throw new BadRequestException('Cold Vault 소유자만 입금할 수 있습니다.');
      }

      throw new BadRequestException('Cold Vault 입금에 실패했습니다.');
    }
  }

  /**
   * Cold Vault 이동 요청 (관리자 전용)
   * @param amountEth ETH 단위 금액
   * @returns moveId (bytes32)
   */
  async coldRequestMove(amountEth: string) {
    try {
      const amountWei = parseEther(amountEth);

      // requestMove 함수 호출
      const tx = await this.coldVaultContract.requestMove(amountWei);
      const receipt = await tx.wait();

      // MoveRequested 이벤트에서 moveId 추출
      const event = receipt.logs.find((log: any) => {
        try {
          const parsed = this.coldVaultContract.interface.parseLog({
            topics: log.topics,
            data: log.data,
          });
          return parsed?.name === 'MoveRequested';
        } catch {
          return false;
        }
      });

      let moveId: string | null = null;
      if (event) {
        const parsed = this.coldVaultContract.interface.parseLog({
          topics: event.topics,
          data: event.data,
        });
        moveId = parsed?.args.moveId as string;
      }

      return {
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber?.toString(),
        moveId: moveId || '이벤트에서 추출 실패',
        amount: amountWei.toString(),
        amountEth,
      };
    } catch (error) {
      console.error('Cold Vault 이동 요청 실패:', error);

      // 권한 에러 처리
      if (error.message?.includes('NotManagerOrOwner')) {
        throw new BadRequestException('관리자 또는 소유자만 이동을 요청할 수 있습니다.');
      }

      if (error.message?.includes('PausedError')) {
        throw new BadRequestException('Cold Vault가 동결 상태입니다.');
      }

      throw new BadRequestException('Cold Vault 이동 요청에 실패했습니다.');
    }
  }

  /**
   * Cold Vault 이동 승인 (관리자 전용)
   * @param moveId 이동 요청 ID (bytes32)
   * @returns 트랜잭션 해시 및 승인 상태
   */
  async coldApproveMove(moveId: string) {
    try {
      // moveId 형식 검증
      if (!ethers.isHexString(moveId, 32)) {
        throw new BadRequestException('유효하지 않은 moveId 형식입니다.');
      }

      // 현재 승인 상태 확인
      const move = await this.coldVaultContract.moves(moveId);
      if (move.executed) {
        throw new BadRequestException('이미 실행된 이동 요청입니다.');
      }

      // 첫 번째 승인 (Owner)
      let txHash: string | null = null;
      let blockNumber: string | null = null;
      let TSStxHash: string | null = null;
      let TSSblockNumber: string | null = null;

      try {
        const tx = await this.coldVaultContract.approveMove(moveId);
        const receipt = await tx.wait();
        txHash = receipt.hash;
        blockNumber = receipt.blockNumber?.toString() || null;
      } catch (error) {
        // 첫 번째 승인이 실패한 경우 (이미 승인했거나 권한 없음)
        console.warn('첫 번째 승인 실패 (이미 승인했을 수 있음):', error);
        // 두 번째 승인을 시도하기 위해 계속 진행
      }

      // 두 번째 승인 (TSS) - 첫 번째 승인 후 상태 확인
      const moveAfterFirst = await this.coldVaultContract.moves(moveId);
      if (!moveAfterFirst.executed && !(moveAfterFirst.approvedAdmin1 && moveAfterFirst.approvedAdmin2)) {
        try {
          const tx2 = await this.TSScoldVaultContract.approveMove(moveId);
          const receipt2 = await tx2.wait();
          TSStxHash = receipt2.hash;
          TSSblockNumber = receipt2.blockNumber?.toString() || null;
        } catch (error) {
          // 두 번째 승인 실패 처리
          console.error('두 번째 승인 실패:', error);
          
          // 첫 번째 승인은 성공했지만 두 번째가 실패한 경우
          if (txHash) {
            throw new BadRequestException('첫 번째 승인은 완료되었지만 두 번째 승인에 실패했습니다.');
          }
          
          // 에러 메시지 확인
          if (error.message?.includes('DuplicateApprover')) {
            throw new BadRequestException('이미 승인한 관리자는 다시 승인할 수 없습니다.');
          }
          
          if (error.message?.includes('OnlyAdmin1OrAdmin2')) {
            throw new BadRequestException('admin1 또는 admin2만 승인할 수 있습니다.');
          }
          
          throw error;
        }
      }

      // 최종 승인 상태 확인
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
    } catch (error) {
      console.error('Cold Vault 이동 승인 실패:', error);

      // 권한 에러 처리
      if (error.message?.includes('OnlyAdmin1OrAdmin2')) {
        throw new BadRequestException('admin1 또는 admin2만 승인할 수 있습니다.');
      }

      if (error.message?.includes('DuplicateApprover')) {
        throw new BadRequestException('이미 승인한 관리자는 다시 승인할 수 없습니다.');
      }

      if (error.message?.includes('AlreadyExecuted')) {
        throw new BadRequestException('이미 실행된 이동 요청입니다.');
      }

      if (error.message?.includes('PausedError')) {
        throw new BadRequestException('Cold Vault가 동결 상태입니다.');
      }

      if (error instanceof BadRequestException) {
        throw error;
      }

      throw new BadRequestException('Cold Vault 이동 승인에 실패했습니다.');
    }
  }

  /**
   * Cold Vault 이동 실행 (관리자 전용)
   * @param moveId 이동 요청 ID (bytes32)
   * @returns 트랜잭션 해시 및 실행 결과
   */
  async coldExecuteMove(moveId: string) {
    try {

      // moveId 형식 검증
      if (!ethers.isHexString(moveId, 32)) {
        throw new BadRequestException('유효하지 않은 moveId 형식입니다.');
      }

      // 실행 가능 여부 확인
      const isExecutable = await this.coldVaultContract.isExecutableMoveView(moveId);
      if (!isExecutable) {
        const move = await this.coldVaultContract.moves(moveId);
        if (move.executed) {
          throw new BadRequestException('이미 실행된 이동 요청입니다.');
        }
        if (!(move.approvedAdmin1 && move.approvedAdmin2)) {
          throw new BadRequestException('2/2 승인이 완료되지 않았습니다.');
        }
        throw new BadRequestException('이동 요청을 실행할 수 없습니다.');
      }

      // executeMove 함수 호출
      const tx = await this.coldVaultContract.executeMove(moveId);
      const receipt = await tx.wait();

      // 실행 후 이동 정보 확인
      const executedMove = await this.coldVaultContract.moves(moveId);

      return {
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber?.toString(),
        moveId,
        amount: executedMove.amount.toString(),
        amountEth: formatEther(executedMove.amount),
        executed: executedMove.executed,
      };
    } catch (error) {
      console.error('Cold Vault 이동 실행 실패:', error);

      // 권한 에러 처리
      if (error.message?.includes('NotOwner') || error.message?.includes('OwnableUnauthorizedAccount')) {
        throw new BadRequestException('Cold Vault 소유자만 실행할 수 있습니다.');
      }

      if (error.message?.includes('AlreadyExecuted')) {
        throw new BadRequestException('이미 실행된 이동 요청입니다.');
      }

      if (error.message?.includes('NotExecutable')) {
        throw new BadRequestException('2/2 승인이 완료되지 않았거나 실행할 수 없는 상태입니다.');
      }

      if (error.message?.includes('OmnibusNotSet')) {
        throw new BadRequestException('Omnibus Vault 주소가 설정되지 않았습니다.');
      }

      if (error.message?.includes('TransferFailed')) {
        throw new BadRequestException('ETH 전송에 실패했습니다.');
      }

      if (error.message?.includes('PausedError')) {
        throw new BadRequestException('Cold Vault가 동결 상태입니다.');
      }

      if (error instanceof BadRequestException) {
        throw error;
      }

      throw new BadRequestException('Cold Vault 이동 실행에 실패했습니다.');
    }
  }

  /**
   * 승인 대기 중인 출금 요청 목록 조회 (관리자 전용)
   * - 최근 Submitted 이벤트를 조회하여 승인 대기 중인 출금 요청 목록 반환
   * - TSS는 승인되었지만 Manager 승인이 필요한 경우만 필터링
   * @param limit 조회할 최대 개수 (기본값: 50)
   * @returns 승인 대기 중인 출금 요청 목록
   */
  async getPendingWithdrawalRequests(limit: number = 50) {
    try {
      const smallTxThresholdWei = parseEther('0.01');
      const pendingRequests: Array<{
        txId: string;
        email: string | null;
        to: string;
        amount: string;
        amountEth: string;
        approvedTss: boolean;
        approvedManager: boolean;
        executed: boolean;
        requiresManagerApproval: boolean;
      }> = [];

      // 최근 Submitted 이벤트 조회 (최근 1000개 블록 범위)
      const currentBlock = await this.provider.getBlockNumber();
      const fromBlock = Math.max(0, currentBlock - 10000); // 최근 10000 블록 범위

      // Submitted 이벤트 필터 생성
      const submittedEventFilter = this.omnibusContract.filters.Submitted();
      const events = await this.omnibusContract.queryFilter(
        submittedEventFilter,
        fromBlock,
        currentBlock,
      );

      // 이벤트를 최신순으로 정렬하고 limit만큼만 처리
      const sortedEvents = events
        .sort((a, b) => (b.blockNumber || 0) - (a.blockNumber || 0))
        .slice(0, limit * 2); // 여유있게 가져온 후 필터링

      // 각 이벤트에 대해 출금 요청 상태 확인
      for (const event of sortedEvents) {
        if (pendingRequests.length >= limit) break;

        try {
          // EventLog 타입 확인
          if (!('args' in event)) {
            continue;
          }
          const txId = event.args.txId as string;
          const onchainTx = await this.omnibusContract.txs(txId);

          // 유효하지 않은 출금 요청이거나 이미 실행된 경우 스킵
          if (
            !onchainTx ||
            onchainTx.userKey === ethers.ZeroHash ||
            onchainTx.executed
          ) {
            continue;
          }

          const amountInWei = BigInt(onchainTx.amount.toString());
          const isSmallTx = amountInWei < smallTxThresholdWei;

          // Manager 승인이 필요한 경우만 포함 (TSS는 승인되었지만 Manager는 미승인)
          const requiresManagerApproval =
            !isSmallTx && onchainTx.approvedTss && !onchainTx.approvedManager;

          // TSS 승인은 되었지만 Manager 승인이 필요한 경우만 추가
          if (requiresManagerApproval || (!onchainTx.approvedTss && !isSmallTx)) {
            // userKey를 이메일로 변환 시도
            let email: string | null = null;
            try {
              // DB에서 userKey와 일치하는 사용자 찾기
              // userKey는 이메일을 hex로 변환한 값이므로 역변환은 어렵지만,
              // DB의 모든 사용자와 비교하여 찾을 수 있음
              const users = await this.prismaService.users.findMany({
                select: { email: true },
              });

              for (const user of users) {
                const userKey = stringToHex(user.email.trim().toLowerCase(), {
                  size: 32,
                });
                if (userKey === onchainTx.userKey) {
                  email = user.email;
                  break;
                }
              }
            } catch (error) {
              console.warn('이메일 변환 실패:', error);
            }

            pendingRequests.push({
              txId,
              email,
              to: (onchainTx.to as string).toLowerCase(),
              amount: amountInWei.toString(),
              amountEth: formatEther(amountInWei),
              approvedTss: onchainTx.approvedTss,
              approvedManager: onchainTx.approvedManager,
              executed: onchainTx.executed,
              requiresManagerApproval,
            });
          }
        } catch (error) {
          // 개별 이벤트 처리 실패 시 로그만 남기고 계속 진행
          console.warn('출금 요청 정보 조회 실패:', error);
          continue;
        }
      }

      return {
        total: pendingRequests.length,
        requests: pendingRequests,
      };
    } catch (error) {
      console.error('승인 대기 출금 요청 조회 실패:', error);
      throw new BadRequestException('승인 대기 출금 요청 조회에 실패했습니다.');
    }
  }

  /**
   * 특정 출금 요청 정보 조회 (관리자 전용)
   * @param txId 출금 요청 ID
   * @returns 출금 요청 상세 정보
   */
  async getWithdrawalRequestInfo(txId: string) {
    try {
      // txId 형식 검증
      if (!ethers.isHexString(txId, 32)) {
        throw new BadRequestException('유효하지 않은 txId 형식입니다.');
      }

      // 온체인에서 출금 요청 정보 조회
      const onchainTx = await this.omnibusContract.txs(txId);
      if (!onchainTx || onchainTx.userKey === ethers.ZeroHash) {
        throw new NotFoundException('존재하지 않는 출금 요청입니다.');
      }

      // userKey를 이메일로 변환
      let email: string | null = null;
      let userId: string | null = null;
      try {
        const users = await this.prismaService.users.findMany({
          select: { id: true, email: true },
        });

        for (const user of users) {
          const userKey = stringToHex(user.email.trim().toLowerCase(), {
            size: 32,
          });
          if (userKey === onchainTx.userKey) {
            email = user.email;
            userId = user.id;
            break;
          }
        }
      } catch (error) {
        console.warn('이메일 변환 실패:', error);
      }

      const amountInWei = BigInt(onchainTx.amount.toString());
      const smallTxThresholdWei = parseEther('0.01');
      const isSmallTx = amountInWei < smallTxThresholdWei;

      return {
        txId,
        email,
        userId,
        to: (onchainTx.to as string).toLowerCase(),
        amount: amountInWei.toString(),
        amountEth: formatEther(amountInWei),
        approvedTss: onchainTx.approvedTss,
        approvedManager: onchainTx.approvedManager,
        executed: onchainTx.executed,
        isSmallTx,
        requiresManagerApproval: !isSmallTx && onchainTx.approvedTss && !onchainTx.approvedManager,
      };
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      console.error('출금 요청 정보 조회 실패:', error);
      throw new BadRequestException('출금 요청 정보 조회에 실패했습니다.');
    }
  }

  /**
   * 출금 요청 Manager 승인 (관리자 전용)
   * - 0.01 ETH 이상 출금 요청에 대해 관리자가 수동으로 Manager 승인을 진행
   * @param txId 출금 요청 ID
   * @returns 승인 결과
   */
  async approveWithdrawalRequest(txId: string) {
    try {
      // txId 형식 검증
      if (!ethers.isHexString(txId, 32)) {
        throw new BadRequestException('유효하지 않은 txId 형식입니다.');
      }

      // 온체인에서 출금 요청 정보 조회
      const onchainTx = await this.omnibusContract.txs(txId);
      if (!onchainTx || onchainTx.userKey === ethers.ZeroHash) {
        throw new NotFoundException('존재하지 않는 출금 요청입니다.');
      }

      // 이미 실행된 경우
      if (onchainTx.executed) {
        throw new BadRequestException('이미 실행된 출금 요청입니다.');
      }

      // 이미 Manager 승인이 완료된 경우
      if (onchainTx.approvedManager) {
        throw new BadRequestException('이미 Manager 승인이 완료된 출금 요청입니다.');
      }

      // TSS 승인이 완료되지 않은 경우
      if (!onchainTx.approvedTss) {
        throw new BadRequestException('TSS 승인이 완료되지 않았습니다.');
      }

      // Manager 승인 실행
      const tx = await this.omnibusContract.approveTx(txId);
      const receipt = await tx.wait();

      // 승인 후 상태 확인
      const updatedTx = await this.omnibusContract.txs(txId);
      const amountInWei = BigInt(onchainTx.amount.toString());

      return {
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber?.toString(),
        txId,
        amount: amountInWei.toString(),
        amountEth: formatEther(amountInWei),
        approvedTss: updatedTx.approvedTss,
        approvedManager: updatedTx.approvedManager,
        executed: updatedTx.executed,
        status: 'manager_approved',
      };
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }

      console.error('출금 요청 Manager 승인 실패:', error);

      // 권한 에러 처리
      if (
        error.message?.includes('NotManager') ||
        error.message?.includes('NotManagerOrOwner')
      ) {
        throw new BadRequestException('Manager 권한이 없습니다.');
      }

      throw new BadRequestException('출금 요청 Manager 승인에 실패했습니다.');
    }
  }

  /**
   * 출금 실행 (관리자 전용)
   * - 관리자가 승인한 출금 요청을 실행하여 실제 출금 및 잔액 차감 수행
   * - txId로 사용자 정보를 찾아서 execute 실행
   * @param txId 출금 요청 ID
   * @returns 실행 결과
   */
  async executeWithdrawalRequest(txId: string) {
    try {
      // txId 형식 검증
      if (!ethers.isHexString(txId, 32)) {
        throw new BadRequestException('유효하지 않은 txId 형식입니다.');
      }

      // 온체인에서 출금 요청 정보 조회
      const onchainTx = await this.omnibusContract.txs(txId);
      if (!onchainTx || onchainTx.userKey === ethers.ZeroHash) {
        throw new NotFoundException('존재하지 않는 출금 요청입니다.');
      }

      // 이미 실행된 경우
      if (onchainTx.executed) {
        throw new BadRequestException('이미 실행된 출금 요청입니다.');
      }

      // 승인이 완료되지 않은 경우 확인
      const smallTxThresholdWei = parseEther('0.01');
      const amountInWei = BigInt(onchainTx.amount.toString());
      const isSmallTx = amountInWei < smallTxThresholdWei;

      // 승인 상태 확인
      if (!onchainTx.approvedTss) {
        throw new BadRequestException('TSS 승인이 완료되지 않았습니다.');
      }

      if (!isSmallTx && !onchainTx.approvedManager) {
        throw new BadRequestException('Manager 승인이 완료되지 않았습니다.');
      }

      // userKey를 이메일로 변환하여 사용자 정보 찾기
      let email: string | null = null;
      let userId: string | null = null;
      
      const users = await this.prismaService.users.findMany({
        select: { id: true, email: true, balance: true },
      });

      for (const user of users) {
        const userKey = stringToHex(user.email.trim().toLowerCase(), {
          size: 32,
        });
        if (userKey === onchainTx.userKey) {
          email = user.email;
          userId = user.id;
          break;
        }
      }

      if (!email || !userId) {
        throw new NotFoundException('출금 요청에 해당하는 사용자를 찾을 수 없습니다.');
      }

      // 사용자 잔액 확인
      const user = await this.prismaService.users.findUnique({
        where: { id: userId },
        select: { id: true, email: true, balance: true },
      });

      if (!user) {
        throw new NotFoundException('사용자를 찾을 수 없습니다.');
      }

      const userBalance = BigInt(user.balance.toString());
      if (userBalance < amountInWei) {
        throw new BadRequestException('사용자 잔액이 부족합니다.');
      }

      // 온체인 execute 실행
      const txResponse = await this.omnibusContract.execute(
        txId,
        smallTxThresholdWei,
      );
      const receipt = await txResponse.wait();

      // 블록 정보 가져오기
      const block = receipt.blockNumber
        ? await this.provider.getBlock(receipt.blockNumber)
        : null;
      const blockTimestamp = block
        ? new Date(block.timestamp * 1000)
        : new Date();
      const gasUsed = receipt.gasUsed ?? 0n;
      const effectiveGasPrice =
        receipt.gasPrice ?? receipt.effectiveGasPrice ?? 0n;
      const feePaid = gasUsed * effectiveGasPrice;

      // DB 업데이트 (사용자 balance 차감 + 트랜잭션 기록)
      const amountAsString = amountInWei.toString();
      const ownerContractAddress = (await this.omnibusContract.getAddress()).toLowerCase();
      const recipientAddress: string = (onchainTx.to as string)?.toLowerCase();

      const result = await this.prismaService.$transaction(async (prisma) => {
        // 사용자 잔액 차감
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

        // 트랜잭션 기록 저장
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
          data: withdrawTxData as any,
        });

        return { updatedUser, savedTx };
      });

      return {
        txHash: receipt.hash,
        status: 'success',
        amount: amountAsString,
        amountEth: formatEther(amountInWei),
        newBalance: result.updatedUser.balance.toString(),
        email,
        userId,
      };
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }

      console.error('출금 실행 실패:', error);

      // 컨트랙트 에러 처리
      if (error.message?.includes('NotExecutable')) {
        throw new BadRequestException('출금 요청을 실행할 수 없는 상태입니다.');
      }

      if (error.message?.includes('AlreadyExecuted')) {
        throw new BadRequestException('이미 실행된 출금 요청입니다.');
      }

      if (error.message?.includes('Insufficient')) {
        throw new BadRequestException('컨트랙트 잔액이 부족합니다.');
      }

      throw new BadRequestException('출금 실행에 실패했습니다.');
    }
  }
}

