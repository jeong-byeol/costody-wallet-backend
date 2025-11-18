import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { SettingService } from './setting.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UpdateWhitelistDto } from './dto/update-whitelist.dto';
import { SetDailyLimitDto } from './dto/set-daily-limit.dto';

@Controller('setting')
export class SettingController {
  constructor(private readonly settingService: SettingService) {}

  /**
   * 사용자의 출금 화이트리스트 주소 등록 API
   */
  @Post('withdraw-whitelist')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async registerWhitelist(@Request() req, @Body() dto: UpdateWhitelistDto) {
    const userId = req.user.id;
    const email = req.user.email;

    const result = await this.settingService.registerWhitelistAddress(
      userId,
      email,
      dto.to,
    );

    return {
      message: '출금 화이트리스트 등록이 완료되었습니다.',
      data: result,
    };
  }

  /**
   * 사용자의 출금 화이트리스트 주소 목록 조회 API
   */
  @Get('withdraw-whitelist')
  @UseGuards(JwtAuthGuard)
  async getWhitelist(@Request() req) {
    const userId = req.user.id;
    const list = await this.settingService.getWhitelistAddresses(userId);

    return {
      message: '출금 화이트리스트 목록을 조회했습니다.',
      data: list,
    };
  }

  /**
   * 사용자의 출금 화이트리스트 주소 제거 API
   */
  @Delete('withdraw-whitelist')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async removeWhitelist(@Request() req, @Body() dto: UpdateWhitelistDto) {
    const userId = req.user.id;
    const email = req.user.email;

    const result = await this.settingService.removeWhitelistAddress(
      userId,
      email,
      dto.to,
    );

    return {
      message: '출금 화이트리스트에서 주소가 제거되었습니다.',
      data: result,
    };
  }

  /**
   * 사용자의 일일 출금 한도 설정 API
   */
  @Post('daily-limit')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async setDailyLimit(@Request() req, @Body() dto: SetDailyLimitDto) {
    const email = req.user.email;

    const result = await this.settingService.setUserDailyLimit(
      email,
      dto.maxEth,
    );

    return {
      message: '일일 출금 한도가 설정되었습니다.',
      data: result,
    };
  }

  /**
   * 사용자의 일일 출금 한도 조회 API
   */
  @Get('daily-limit')
  @UseGuards(JwtAuthGuard)
  async getDailyLimit(@Request() req) {
    const email = req.user.email;

    const result = await this.settingService.getUserDailyLimit(email);

    return {
      message: '일일 출금 한도 정보를 조회했습니다.',
      data: result,
    };
  }
}
