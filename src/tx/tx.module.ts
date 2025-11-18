import { Module } from '@nestjs/common';
import { TxController } from './tx.controller';
import { TxService } from './tx.service';
import { PrismaModule } from '../prisma/prisma.module';
import { JwtModule } from '@nestjs/jwt';

// 트랜잭션 관련 기능을 담당하는 모듈
@Module({
  imports: [
    PrismaModule, // 데이터베이스 접근을 위한 Prisma 모듈
    JwtModule, // AuthModule에서 export한 설정을 그대로 사용
  ],
  controllers: [TxController], // 트랜잭션 컨트롤러 등록
  providers: [TxService], // 트랜잭션 서비스 등록
  exports: [TxService], // 다른 모듈에서 사용할 수 있도록 export
})
export class TxModule {}

