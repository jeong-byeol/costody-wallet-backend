import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 필수 환경 변수 검증
  const port = process.env.PORT;
  if (!port) {
    throw new Error('PORT 환경변수가 설정되지 않았습니다.');
  }

  // CORS 설정 - 프론트엔드에서 API 호출 허용
  app.enableCors({
    origin: process.env.CORS_ORIGIN || '*', // 허용할 도메인 (환경변수 또는 기본값)
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS', // 허용할 HTTP 메서드
    credentials: true, // 쿠키/인증 헤더 전송 허용
    allowedHeaders: ['Content-Type', 'Authorization'], // 허용할 헤더
  });

  // 전역 ValidationPipe 설정 - DTO 유효성 검증 활성화
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // DTO에 정의되지 않은 속성 제거
      forbidNonWhitelisted: true, // DTO에 정의되지 않은 속성이 있으면 요청 거부
      transform: true, // 요청 데이터를 DTO 타입으로 자동 변환
    }),
  );

  const portNumber = parseInt(port, 10);
  await app.listen(portNumber);
  console.log(`서버가 포트 ${portNumber}에서 실행 중입니다.`);
}
bootstrap();
