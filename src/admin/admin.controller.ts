import {
  Controller,
  Get,
  Post,
  Patch,
  UseGuards,
  HttpCode,
  HttpStatus,
  Body,
  Query,
  Param,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminGuard } from '../auth/admin.guard';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';
import { GetTransactionsDto } from './dto/get-transactions.dto';
import { PauseOmnibusDto } from './dto/pause-omnibus.dto';
import { ColdDepositDto } from './dto/cold-deposit.dto';
import { ColdMoveRequestDto, ColdMoveActionDto } from './dto/cold-move.dto';
import { ApproveWithdrawalDto } from './dto/approve-withdrawal.dto';

@Controller('admin')
@UseGuards(JwtAuthGuard, AdminGuard) // 모든 엔드포인트에 JWT 인증 및 Admin 권한 체크 적용
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  /**
   * Omnibus 잔액 조회 (관리자 전용)
   */
  @Get('omnibus-balance')
  @HttpCode(HttpStatus.OK)
  async getOmnibusBalance() {
    const data = await this.adminService.getOmnibusBalance();

    return {
      message: 'Omnibus 잔액 조회가 완료되었습니다.',
      data,
    };
  }

  /**
   * Cold 잔액 조회 (관리자 전용)
   */
  @Get('cold-balance')
  @HttpCode(HttpStatus.OK)
  async getColdBalance() {
    const data = await this.adminService.getColdBalance();

    return {
      message: 'Cold 잔액 조회가 완료되었습니다.',
      data,
    };
  }

  /**
   * 모든 유저 목록 조회 (관리자 전용)
   */
  @Get('users')
  @HttpCode(HttpStatus.OK)
  async getAllUsers() {
    const data = await this.adminService.getAllUsers();

    return {
      message: '유저 목록 조회가 완료되었습니다.',
      data,
    };
  }

  /**
   * 유저 동결/해제 (관리자 전용)
   */
  @Patch('users/status')
  @HttpCode(HttpStatus.OK)
  async updateUserStatus(@Body() dto: UpdateUserStatusDto) {
    const data = await this.adminService.updateUserStatus(
      dto.userId,
      dto.status,
    );

    return {
      message: '유저 상태가 업데이트되었습니다.',
      data,
    };
  }

  /**
   * Omnibus 지갑 동결 상태 조회 (관리자 전용)
   */
  @Get('omnibus/paused')
  @HttpCode(HttpStatus.OK)
  async getOmnibusPausedStatus() {
    const data = await this.adminService.getOmnibusPausedStatus();

    return {
      message: 'Omnibus 지갑 상태 조회가 완료되었습니다.',
      data,
    };
  }

  /**
   * Omnibus 지갑 동결/해제 (관리자 전용)
   * true: 동결, false: 해제
   */
  @Post('omnibus/pause')
  @HttpCode(HttpStatus.OK)
  async pauseOmnibus(@Body() dto: PauseOmnibusDto) {
    const data = await this.adminService.pauseOmnibus(dto.paused);

    return {
      message: data.message,
      data,
    };
  }

  /**
   * Cold Vault 입금 (관리자 전용)
   */
  @Post('cold/deposit')
  @HttpCode(HttpStatus.OK)
  async coldDeposit(@Body() dto: ColdDepositDto) {
    const data = await this.adminService.coldDeposit(dto.amountEth);

    return {
      message: 'Cold Vault 입금이 완료되었습니다.',
      data,
    };
  }

  /**
   * Cold Vault 이동 요청 (관리자 전용)
   */
  @Post('cold/move/request')
  @HttpCode(HttpStatus.OK)
  async coldRequestMove(@Body() dto: ColdMoveRequestDto) {
    const data = await this.adminService.coldRequestMove(dto.amountEth);

    return {
      message: 'Cold Vault 이동 요청이 완료되었습니다.',
      data,
    };
  }

  /**
   * Cold Vault 이동 승인 (관리자 전용)
   */
  @Post('cold/move/approve')
  @HttpCode(HttpStatus.OK)
  async coldApproveMove(@Body() dto: ColdMoveActionDto) {
    const data = await this.adminService.coldApproveMove(dto.moveId);

    return {
      message: 'Cold Vault 이동 승인이 완료되었습니다.',
      data,
    };
  }

  /**
   * Cold Vault 이동 실행 (관리자 전용)
   */
  @Post('cold/move/execute')
  @HttpCode(HttpStatus.OK)
  async coldExecuteMove(@Body() dto: ColdMoveActionDto) {
    const data = await this.adminService.coldExecuteMove(dto.moveId);

    return {
      message: 'Cold Vault 이동 실행이 완료되었습니다.',
      data,
    };
  }

  /**
   * 입출금 기록 조회 (관리자 전용)
   * DB에 저장된 입출금 이벤트를 조회하여 반환
   */
  @Get('transactions')
  @HttpCode(HttpStatus.OK)
  async getDepositWithdrawTransactions(@Query() dto: GetTransactionsDto) {
    const data = await this.adminService.getDepositWithdrawTransactions(
      dto.limit,
    );

    return {
      message: '입출금 기록 조회가 완료되었습니다.',
      data,
    };
  }

  /**
   * 승인 대기 중인 출금 요청 목록 조회 (관리자 전용)
   * - 0.01 ETH 이상 출금 요청 중 TSS 승인은 완료되었지만 Manager 승인이 필요한 목록 반환
   */
  @Get('withdrawals/pending')
  @HttpCode(HttpStatus.OK)
  async getPendingWithdrawalRequests(@Query('limit') limit?: number) {
    const limitNumber = limit ? Number(limit) : 50;
    const data = await this.adminService.getPendingWithdrawalRequests(
      limitNumber,
    );

    return {
      message: '승인 대기 중인 출금 요청 목록 조회가 완료되었습니다.',
      data,
    };
  }

  /**
   * 특정 출금 요청 정보 조회 (관리자 전용)
   * - txId로 출금 요청 상세 정보 조회 (이메일, amount 등)
   */
  @Get('withdrawals/:txId')
  @HttpCode(HttpStatus.OK)
  async getWithdrawalRequestInfo(@Param('txId') txId: string) {
    const data = await this.adminService.getWithdrawalRequestInfo(txId);

    return {
      message: '출금 요청 정보 조회가 완료되었습니다.',
      data,
    };
  }

  /**
   * 출금 요청 Manager 승인 (관리자 전용)
   * - 관리자가 출금 요청을 확인하고 수동으로 Manager 승인을 진행
   */
  @Post('withdrawals/approve')
  @HttpCode(HttpStatus.OK)
  async approveWithdrawalRequest(@Body() dto: ApproveWithdrawalDto) {
    const data = await this.adminService.approveWithdrawalRequest(dto.txId);

    return {
      message: '출금 요청이 승인되었습니다.',
      data,
    };
  }

  /**
   * 출금 실행 (관리자 전용)
   * - 관리자가 승인한 출금 요청을 실행하여 실제 출금 및 잔액 차감 수행
   * - 프론트엔드에서 관리자 승인 후 자동으로 호출할 수 있음
   */
  @Post('withdrawals/execute')
  @HttpCode(HttpStatus.OK)
  async executeWithdrawalRequest(@Body() dto: ApproveWithdrawalDto) {
    const data = await this.adminService.executeWithdrawalRequest(dto.txId);

    return {
      message: '출금이 실행되었습니다.',
      data,
    };
  }
}

