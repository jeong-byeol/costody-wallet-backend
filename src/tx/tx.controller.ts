import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  Logger,
  Query,
  BadRequestException,
} from '@nestjs/common';
import { TxService } from './tx.service';
import { DepositDto } from './dto/deposit.dto';
import { WithdrawSubmitDto } from './dto/withdraw-submit.dto';
import { WithdrawTxDto } from './dto/withdraw-tx.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

// 트랜잭션 관련 API 엔드포인트를 처리하는 컨트롤러
@Controller('tx')
export class TxController {
  private readonly logger = new Logger(TxController.name);

  constructor(private readonly txService: TxService) {}

  // 입금 처리 엔드포인트
  // POST /tx/deposit
  // 헤더: Authorization: Bearer <JWT_TOKEN>
  // 바디: { "txHash": "0x..." }
  @Post('deposit')
  @UseGuards(JwtAuthGuard) // JWT 인증 필수 (헤더의 토큰 검증)
  @HttpCode(HttpStatus.OK) // 성공 시 200 OK 응답
  async deposit(@Request() req, @Body() depositDto: DepositDto) {
    // req.user는 JWT 토큰에서 추출된 사용자 정보
    // jwt.strategy.ts에서 설정한 payload.sub (userId)가 전달됨
    const userId = req.user.id;

    // 트랜잭션 해시를 이용해 입금 처리
    const result = await this.txService.deposit(userId, depositDto.txHash);

    return {
      message: '입금이 완료되었습니다.',
      data: result,
    };
  }

  /**
   * 출금 요청 생성 (TSS seat A)
   */
  @Post('withdraw/submit')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async withdrawSubmit(
    @Request() req,
    @Body() withdrawSubmitDto: WithdrawSubmitDto,
  ) {
    const email = req.user.email;

    this.logger.debug('withdraw/submit 요청 수신', {
      email,
      to: withdrawSubmitDto.to,
      amount: withdrawSubmitDto.amount,
    });

    const result = await this.txService.withdrawSubmit(
      email,
      withdrawSubmitDto.to,
      withdrawSubmitDto.amount,
      withdrawSubmitDto.password,
    );

    return {
      message: '출금 요청이 생성되었습니다.',
      data: result,
    };
  }

  /**
   * 출금 승인 
   */
  @Post('withdraw/approve')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async withdrawApprove(@Body() withdrawTxDto: WithdrawTxDto) {
    const result = await this.txService.withdrawApprove(withdrawTxDto.txId);

    this.logger.debug('withdraw/approve 요청 수신', {
      txId: withdrawTxDto.txId,
    });
    return {
      message: '출금 요청이 승인되었습니다.',
      data: result,
    };
  }

  /**
   * 출금 실행
   */
  @Post('withdraw/execute')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async withdrawExecute(@Request() req, @Body() withdrawTxDto: WithdrawTxDto) {
    const userId = req.user.id;
    const email = req.user.email;

    const result = await this.txService.withdrawExecute(
      withdrawTxDto.txId,
      userId,
      email,
    );

    this.logger.debug('withdraw/execute 요청 수신', {
      txId: withdrawTxDto.txId,
    });

    return {
      message: '출금이 실행되었습니다.',
      data: result,
    };
  }

  /**
   * 사용자 입출금 기록 조회
   */
  @Get('tx-history')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async getTransactionHistory(
    @Request() req,
    @Query('direction') direction?: string,
  ) {
    const normalizedDirection = direction?.toUpperCase();
    if (
      normalizedDirection &&
      normalizedDirection !== 'IN' &&
      normalizedDirection !== 'OUT'
    ) {
      throw new BadRequestException('direction 파라미터가 올바르지 않습니다.');
    }

    const result = await this.txService.getTransactionHistory(
      req.user.id,
      normalizedDirection as 'IN' | 'OUT' | undefined,
    );

    return {
      message: '트랜잭션 기록을 조회했습니다.',
      data: result,
    };
  }
}

