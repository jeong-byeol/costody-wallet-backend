import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { TxModule } from './tx/tx.module';
import { SettingModule } from './setting/setting.module';
import { AdminModule } from './admin/admin.module';
import { EventsModule } from './events/events.module';

@Module({
  imports: [
    // 환경변수 관리 모듈 (전역으로 사용 가능하도록 설정)
    ConfigModule.forRoot({
      isGlobal: true, // 모든 모듈에서 환경변수 사용 가능
      envFilePath: '.env', // .env 파일 경로
    }),
    PrismaModule, // Prisma 데이터베이스 연결 모듈
    AuthModule, // 인증 모듈 (회원가입, 로그인)
    TxModule, // 트랜잭션 모듈 (입금, 출금 등)
    SettingModule, // 사용자 환경설정 (출금 화이트리스트 등)
    AdminModule, // 관리자 모듈 (관리자 전용 기능)
    EventsModule, // 이벤트 모듈 (블록체인 이벤트 리스너 및 WebSocket)
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
