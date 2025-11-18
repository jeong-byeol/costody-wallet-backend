import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

// Prisma 클라이언트를 관리하는 서비스
@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  // 모듈 초기화 시 데이터베이스 연결
  async onModuleInit() {
    await this.$connect();
  }

  // 모듈 종료 시 데이터베이스 연결 해제
  async onModuleDestroy() {
    await this.$disconnect();
  }
}
