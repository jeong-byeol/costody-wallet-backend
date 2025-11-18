import {
  Injectable,
  BadRequestException,
  ConflictException,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ethers, parseEther } from 'ethers';
import * as bcrypt from 'bcrypt';
import { ConfigService } from '@nestjs/config';
import { stringToHex } from 'viem';
import omnibusAbi from '../abi/omnibusWallet.json';


// 트랜잭션 처리 비즈니스 로직을 담당하는 서비스
@Injectable()
export class TxService {
  private provider: ethers.JsonRpcProvider;
  private contract: ethers.Contract;
  private ownerContract: ethers.Contract;
  private readonly maxHistory = 100;
  private readonly smallTxThresholdWei = parseEther('0.01');
  
  constructor(
    private prismaService: PrismaService,
    private configService: ConfigService,
  ) {
    // Ethereum RPC 프로바이더 초기화 (환경변수에서 RPC URL 가져오기)
    const rpcUrl = this.configService.get<string>('RPC_URL');
    const contractAddress = this.configService.get<string>('OMNIBUS_CONTRACT');
    const TSSownerPrivateKey = this.configService.get<string>('TSS_PRIVATE_KEY');
    const ownerPrivateKey = this.configService.get<string>('SIGNER_PRIVATE_KEY');
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

    this.provider = new ethers.JsonRpcProvider(rpcUrl);
    const signer = new ethers.Wallet(TSSownerPrivateKey, this.provider);
    this.contract = new ethers.Contract(contractAddress, omnibusAbi, signer);

    const ownerSigner = new ethers.Wallet(ownerPrivateKey, this.provider);
    this.ownerContract = new ethers.Contract(contractAddress, omnibusAbi, ownerSigner);

  }
  

  // 입금 처리 메서드
  async deposit(userId: string, txHash: string) {
    try {
      // 1. 트랜잭션 해시 검증 (유효한 형식인지)
      if (!ethers.isHexString(txHash, 32)) {
        throw new BadRequestException('유효하지 않은 트랜잭션 해시입니다.');
      }

      // 2. 이미 처리된 트랜잭션인지 확인 (중복 방지)
      const existingTx = await this.prismaService.transactions.findUnique({
        where: { txhash: txHash },
      });

      if (existingTx) {
        throw new ConflictException('이미 처리된 트랜잭션입니다.');
      }

      // 3. 블록체인에서 트랜잭션 정보 가져오기
      const tx = await this.provider.getTransaction(txHash);
      if (!tx) {
        throw new BadRequestException(
          '블록체인에서 트랜잭션을 찾을 수 없습니다.',
        );
      }

      // 4. 트랜잭션 영수증 가져오기 (컨펌 여부 확인)
      const receipt = await this.provider.getTransactionReceipt(txHash);
      if (!receipt) {
        throw new BadRequestException(
          '트랜잭션이 아직 컨펌되지 않았습니다. 잠시 후 다시 시도해주세요.',
        );
      }

      // 5. 트랜잭션 상태 확인 (성공/실패)
      const txStatus = receipt.status === 1 ? 'success' : 'failed';

      if (txStatus === 'failed') {
        throw new BadRequestException('실패한 트랜잭션입니다.');
      }

      // 6. 입금액 계산 (Wei를 Ether로 변환)
      const amountInWei = tx.value;

      // 7. 가스 비용 계산
      const gasUsed = receipt.gasUsed;
      const effectiveGasPrice = receipt.gasPrice || 0n;
      const feePaid = gasUsed * effectiveGasPrice;


      // 8. 블록 정보 가져오기
      const block = await this.provider.getBlock(receipt.blockNumber);
      const blockTimestamp = block
        ? new Date(block.timestamp * 1000)
        : new Date();

      // 9. 사용자 확인
      const user = await this.prismaService.users.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new BadRequestException('사용자를 찾을 수 없습니다.');
      }

      // 10. 데이터베이스 트랜잭션으로 원자적 업데이트 (모두 성공하거나 모두 실패)
      const result = await this.prismaService.$transaction(async (prisma) => {
        // 10-1. transactions 테이블에 트랜잭션 정보 저장
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
          // Prisma 클라이언트 타입을 재생성하기 전까지는 direction 필드가 없다고 판단하므로 any 캐스팅
          data: depositTxData as any,
        });

        // 10-2. users 테이블의 balance 업데이트 (입금액만큼 증가)
        const updatedUser = await prisma.users.update({
          where: { id: userId },
          data: {
            balance: {
              increment: amountInWei.toString(), // 기존 balance에 입금액 추가
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
    } catch (error) {
      // 예외 처리: NestJS의 HTTP 예외는 그대로 전달
      if (
        error instanceof BadRequestException ||
        error instanceof ConflictException
      ) {
        throw error;
      }

      // 그 외 예상치 못한 에러는 Internal Server Error로 처리
      console.error('입금 처리 중 오류 발생:', error);
      throw new InternalServerErrorException(
        '입금 처리 중 오류가 발생했습니다.',
      );
    }
  }
// ------------------------------------------------------------
// 출금 플로우 시작
  /**
   * 출금 요청 생성 (Seat A)
   * - 온체인 nonce 를 기반으로 txId 를 선계산한 뒤 응답에 포함
   * - txId 는 이후 approve / execute 단계에서 그대로 사용
   */
  async withdrawSubmit(
    email: string,
    to: string,
    amount: string,
    password: string,
  ) {
    const normalizedEmail = email.trim().toLowerCase();
    const userKey = stringToHex(normalizedEmail, { size: 32 });

    // 1. 사용자 조회
    const user = await this.prismaService.users.findUnique({
      where: { email: normalizedEmail },
      select: {
        id: true,
        password: true,
      },
    });

    if (!user) {
      throw new BadRequestException('사용자를 찾을 수 없습니다.');
    }

    // 2. 비밀번호 검증
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('비밀번호가 일치하지 않습니다.');
    }

    // 3. 컨트랙트 호출 (금액을 Wei 단위로 변환)
    const weiAmount = parseEther(amount);
    // 3-1. 현재 컨트랙트 nonce 조회 후 txId 선계산
    const currentNonce: bigint = await this.ownerContract.nonce();
    const txId: string = await this.ownerContract.computeTxId(
      to,
      weiAmount,
      userKey,
      currentNonce,
    );

    // 3-2. 실제 submit 트랜잭션 전송
    const txResponse = await this.ownerContract.submitTx(to, weiAmount, userKey);
    const receipt = await txResponse.wait();

    return {
      txId,
      txHash: receipt.hash,
      amount,
      status: 'submitted',
    };
  }

  /**
   * 출금 승인 (Seat B 혹은 Seat A 재승인)
   * - txId로 온체인에서 amount 조회
   * - amount < smallTxThresholdWei: TSS만 서명 (contract) - 자동 승인
   * - amount >= smallTxThresholdWei: TSS만 서명 (contract) - Manager 승인은 관리자가 수동으로 진행해야 함
   */
  async withdrawApprove(txId: string) {
    this.validateTxId(txId);

    // 1. 온체인에서 txId로 출금 정보 조회 (amount 추출)
    const onchainTx = await this.ownerContract.txs(txId);
    if (!onchainTx || onchainTx.userKey === ethers.ZeroHash) {
      throw new BadRequestException('존재하지 않는 출금 요청입니다.');
    }

    // 2. amount 추출 및 금액 비교
    const amountInWei = BigInt(onchainTx.amount.toString());
    const isSmallTx = amountInWei < this.smallTxThresholdWei;

    // 3. TSS 승인 (항상 필요)
    const tssTxResponse = await this.contract.approveTx(txId);
    const tssReceipt = await tssTxResponse.wait();

    // 4. 고액인 경우(0.01 ETH 이상) Manager 승인은 관리자가 수동으로 진행해야 함
    // 자동 승인을 제거하여 관리자 대시보드에서 수동 승인하도록 변경

    return {
      txHash: tssReceipt.hash,
      managerTxHash: null, // Manager 승인은 관리자가 수동으로 진행
      status: isSmallTx ? 'approved' : 'tss_approved', // 고액인 경우 TSS만 승인된 상태
      isSmallTx,
      amount: amountInWei.toString(),
      requiresManagerApproval: !isSmallTx, // Manager 승인이 필요한지 여부
    };
  }

  async withdrawExecute(txId: string, userId: string, email: string) {
    this.validateTxId(txId);

    const normalizedEmail = email.trim().toLowerCase();

    // 1. 온체인에 저장된 출금 정보 (수취인, 금액, userKey) 조회
    const onchainTx = await this.ownerContract.txs(txId);
    if (!onchainTx || onchainTx.userKey === ethers.ZeroHash) {
      throw new BadRequestException('존재하지 않는 출금 요청입니다.');
    }

    const expectedUserKey = stringToHex(normalizedEmail, { size: 32 });
    if (expectedUserKey !== onchainTx.userKey) {
      throw new UnauthorizedException(
        '출금 요청 정보와 사용자 정보가 일치하지 않습니다.',
      );
    }

    // 2. 사용자 정보 및 잔액 확인
    const user = await this.prismaService.users.findUnique({
      where: { id: userId },
      select: { id: true, email: true, balance: true },
    });

    if (!user) {
      throw new BadRequestException('출금 대상 사용자를 찾을 수 없습니다.');
    }

    if (user.email.toLowerCase() !== normalizedEmail) {
      throw new UnauthorizedException('사용자 정보가 일치하지 않습니다.');
    }

    const amountInWei = BigInt(onchainTx.amount.toString());
    const userBalance = BigInt(user.balance.toString());
    if (userBalance < amountInWei) {
      throw new BadRequestException('사용자 잔액이 부족합니다.');
    }

    const recipientAddress: string = (onchainTx.to as string)?.toLowerCase();
    if (!recipientAddress) {
      throw new BadRequestException('출금 목적지 정보를 찾을 수 없습니다.');
    }

    // 3. 온체인 execute 실행

    const txResponse = await this.ownerContract.execute(
      txId,
      this.smallTxThresholdWei,
    );
    const receipt = await txResponse.wait();

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

    // 4. DB 업데이트 (사용자 balance 차감 + 트랜잭션 기록)
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
        data: withdrawTxData as any,
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

  /**
   * 사용자 별 입출금 기록 조회
   */
  async getTransactionHistory(
    userId: string,
    direction?: 'IN' | 'OUT',
  ): Promise<
    Array<{
      txHash: string;
      direction: 'IN' | 'OUT';
      status: string;
      amount: string;
      createdAt: string | null;
      from: string;
      to: string;
      blockNumber: string | null;
    }>
  > {
    // Prisma where 조건 객체 생성 (타입은 Prisma가 자동 추론)
    const where: any = {
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
      direction: ((tx as any).direction || 'IN') as 'IN' | 'OUT',
      status: tx.status,
      amount: tx.amount.toString(),
      createdAt: tx.createdat ? tx.createdat.toISOString() : null,
      from: tx.from_address,
      to: tx.to_address,
      blockNumber: tx.blocknumber ? tx.blocknumber.toString() : null,
    }));
  }

  /**
   * txId 기본 검증 유틸
   */
  private validateTxId(txId: string) {
    if (!ethers.isHexString(txId, 32)) {
      throw new BadRequestException('유효하지 않은 txId 형식입니다.');
    }
  }

}
