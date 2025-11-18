import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

// Global 데코레이터를 사용하여 애플리케이션 전역에서 PrismaService 사용 가능
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
