import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { ethers, parseEther, formatEther } from 'ethers';
import { stringToHex } from 'viem';
import policyGuardAbi from '../abi/policyGuard.json';

@Injectable()
export class SettingService {
  private readonly provider: ethers.JsonRpcProvider;
  private readonly contract: ethers.Contract;

  constructor(
    private readonly prismaService: PrismaService,
    private readonly configService: ConfigService,
  ) {
    const rpcUrl = this.configService.get<string>('RPC_URL');
    const contractAddress =
      this.configService.get<string>('GUARD_CONTRACT');
    const ownerPrivateKey = this.configService.get<string>('SIGNER_PRIVATE_KEY');

    if (!rpcUrl) {
      throw new Error('RPC_URL 환경변수가 설정되지 않았습니다.');
    }

    if (!contractAddress) {
      throw new Error(
        'GUARD_CONTRACT 환경변수가 설정되지 않았습니다.',
      );
    }

    if (!ownerPrivateKey) {
      throw new Error(
        'OWNER_PRIVATE_KEY 환경변수가 설정되지 않았습니다. (Omnibus 컨트랙트 소유자 키)',
      );
    }

    this.provider = new ethers.JsonRpcProvider(rpcUrl);
    const signer = new ethers.Wallet(ownerPrivateKey, this.provider);
    this.contract = new ethers.Contract(contractAddress, policyGuardAbi, signer);
  }

  /**
   * 사용자의 출금 화이트리스트 주소 등록 (컨트랙트 setUserWL 호출)
   * 컨트랙트 정책상 unsetUserWL 호출 후 DB에 최신 주소를 저장한다.
   */
  async registerWhitelistAddress(userId: string, email: string, to: string) {
    if (!email) {
      throw new BadRequestException('이메일 정보를 확인할 수 없습니다.');
    }

    const normalizedEmail = email.trim().toLowerCase();
    const userKey = stringToHex(normalizedEmail, { size: 32 });
    console.log('userKey', userKey);

    try {
      // 1. 온체인 컨트랙트 호출
      const tx = await this.contract.setUserWL(userKey, to);
      const receipt = await tx.wait();

      // 2. DB 업데이트 (최신 화이트리스트 주소 저장)
      const whitelist = await this.prismaService.withdrawal_whitelist.upsert({
        where: {
          user_id_to_address: {
            user_id: userId,
            to_address: to.toLowerCase(),
          },
        },
        create: {
          user_id: userId,
          to_address: to.toLowerCase(),
        },
        update: {},
      });

      return {
        txHash: receipt.hash,
        whitelist,
      };
    } catch (error) {
      console.error('화이트리스트 등록 실패:', error);
      throw error;
    }
  }

  async getWhitelistAddresses(userId: string) {
    return this.prismaService.withdrawal_whitelist.findMany({
      where: { user_id: userId },
      select: {
        id: true,
        to_address: true,
        created_at: true,
      },
      orderBy: {
        created_at: 'desc',
      },
    });
  }

  async removeWhitelistAddress(userId: string, email: string, to: string) {
    if (!email) {
      throw new BadRequestException('이메일 정보를 확인할 수 없습니다.');
    }

    const normalizedEmail = email.trim().toLowerCase();
    const userKey = stringToHex(normalizedEmail, { size: 32 });

    // 컨트랙트에서 화이트리스트 제거
    const tx = await this.contract.unsetUserWL(userKey, to);
    const receipt = await tx.wait();

    // DB에서도 제거
    await this.prismaService.withdrawal_whitelist.deleteMany({
      where: {
        user_id: userId,
        to_address: to.toLowerCase(),
      },
    });

    return {
      txHash: receipt.hash,
      removedAddress: to.toLowerCase(),
    };
  }

  /**
   * 사용자의 일일 출금 한도 설정 (컨트랙트 setUserDailyLimit 호출)
   * @param email 사용자 이메일
   * @param maxEth 일일 출금 한도 (ETH 단위, 0이면 무제한)
   */
  async setUserDailyLimit(email: string, maxEth: number) {
    if (!email) {
      throw new BadRequestException('이메일 정보를 확인할 수 없습니다.');
    }

    if (maxEth < 0) {
      throw new BadRequestException('일일 출금 한도는 0 이상이어야 합니다.');
    }

    const normalizedEmail = email.trim().toLowerCase();
    const userKey = stringToHex(normalizedEmail, { size: 32 });

    try {
      // ETH 단위를 Wei 단위로 변환 (0이면 무제한이므로 그대로 0 전달)
      const maxWei = maxEth === 0 ? 0n : parseEther(maxEth.toString());

      // 컨트랙트에 일일 한도 설정
      const tx = await this.contract.setUserDailyLimit(userKey, maxWei);
      const receipt = await tx.wait();

      return {
        txHash: receipt.hash,
        maxEth: maxEth.toString(),
        maxWei: maxWei.toString(),
        isUnlimited: maxEth === 0,
      };
    } catch (error) {
      console.error('일일 출금 한도 설정 실패:', error);
      throw error;
    }
  }

  /**
   * 사용자의 일일 출금 한도 조회 (컨트랙트 userDailyETH 호출)
   * @param email 사용자 이메일
   */
  async getUserDailyLimit(email: string) {
    if (!email) {
      throw new BadRequestException('이메일 정보를 확인할 수 없습니다.');
    }

    const normalizedEmail = email.trim().toLowerCase();
    const userKey = stringToHex(normalizedEmail, { size: 32 });

    try {
      // 컨트랙트에서 일일 한도 정보 조회
      const dailyLimit = await this.contract.userDailyETH(userKey);
      const maxWei = BigInt(dailyLimit.max.toString());
      const spentWei = BigInt(dailyLimit.spent.toString());
      const dayKey = Number(dailyLimit.dayKey);

      // Wei를 ETH로 변환
      const maxEth = maxWei === 0n ? '0' : formatEther(maxWei);
      const spentEth = formatEther(spentWei);

      // 오늘 날짜 계산 (UTC 기준)
      const todayKey = Math.floor(Date.now() / 1000 / 86400);

      // 오늘 사용 가능한 금액 계산
      const remainingWei =
        maxWei === 0n ? null : maxWei > spentWei ? maxWei - spentWei : 0n;
      const remainingEth =
        remainingWei === null ? null : formatEther(remainingWei);
      return {
        maxEth,
        maxWei: maxWei.toString(),
        spentEth,
        spentWei: spentWei.toString(),
        remainingEth: remainingEth === null ? null : remainingEth,
        remainingWei: remainingWei === null ? null : remainingWei.toString(),
        dayKey,
        todayKey,
        isUnlimited: maxWei === 0n,
        isNewDay: dayKey !== todayKey, // 새로운 날인지 여부
      };
    } catch (error) {
      console.error('일일 출금 한도 조회 실패:', error);
      throw error;
    }
  }
}
