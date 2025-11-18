# Custody Wallet Backend

암호화폐 입출금을 관리하는 커스터디 월렛 백엔드 시스템입니다.

## 📋 목차

- [주요 기능](#주요-기능)
- [기술 스택](#기술-스택)
- [프로젝트 구조](#프로젝트-구조)
- [환경 설정](#환경-설정)
- [실행 방법](#실행-방법)
- [API 엔드포인트](#api-엔드포인트)
- [데이터베이스 스키마](#데이터베이스-스키마)
- [배포 가이드](#배포-가이드)
- [문제 해결](#문제-해결)

## 주요 기능

### 1. 인증 (Auth)
- 회원가입 (이메일 인증 포함)
- 로그인 (JWT 토큰 기반)
- 이메일 인증
- 프로필 조회
- 일일 자산 추이 조회

### 2. 트랜잭션 (Transaction)
- 입금 처리
  - 블록체인에서 트랜잭션 정보 자동 조회
  - 트랜잭션 검증 (컨펌 여부, 성공/실패 확인)
  - 자동 잔액 업데이트
  - 중복 트랜잭션 방지
- 출금 처리
  - TSS 기반 출금 요청 생성
  - 출금 승인 및 실행
  - 출금 화이트리스트 검증
  - 일일 출금 한도 관리
- 입출금 기록 조회

### 3. 설정 (Setting)
- 출금 화이트리스트 관리 (등록/조회/삭제)
- 일일 출금 한도 설정 및 조회

### 4. 관리자 (Admin)
- Omnibus/Cold 지갑 잔액 조회
- 사용자 목록 조회 및 상태 관리 (동결/해제)
- Omnibus 지갑 동결/해제
- Cold Vault 입금 및 이동 (요청/승인/실행)
- 입출금 기록 조회
- 출금 요청 승인 및 실행

### 5. 이벤트 (Events)
- 블록체인 이벤트 실시간 리스닝
- 입출금 이벤트 자동 처리
- WebSocket을 통한 실시간 알림

## 기술 스택

- **Framework**: NestJS 11.x
- **Database**: PostgreSQL + Prisma ORM 6.x
- **Authentication**: JWT (Passport)
- **Blockchain**: Ethers.js 6.x, Viem 2.x
- **Email**: Nodemailer
- **Validation**: class-validator, class-transformer
- **WebSocket**: Socket.IO
- **Language**: TypeScript 5.x

## 프로젝트 구조

```
src/
├── auth/                 # 인증 모듈
│   ├── dto/             # 데이터 전송 객체
│   ├── auth.controller.ts
│   ├── auth.service.ts
│   ├── auth.module.ts
│   ├── jwt.strategy.ts   # JWT 검증 전략
│   ├── jwt-auth.guard.ts # JWT 가드
│   └── admin.guard.ts   # 관리자 권한 가드
├── tx/                   # 트랜잭션 모듈
│   ├── dto/
│   ├── tx.controller.ts
│   ├── tx.service.ts
│   └── tx.module.ts
├── setting/              # 설정 모듈
│   ├── dto/
│   ├── setting.controller.ts
│   ├── setting.service.ts
│   └── setting.module.ts
├── admin/                # 관리자 모듈
│   ├── dto/
│   ├── admin.controller.ts
│   ├── admin.service.ts
│   └── admin.module.ts
├── events/               # 이벤트 모듈
│   ├── events.gateway.ts # WebSocket 게이트웨이
│   ├── events.service.ts # 블록체인 이벤트 리스너
│   └── events.module.ts
├── email/                # 이메일 모듈
│   ├── email.service.ts
│   └── email.module.ts
├── prisma/               # Prisma ORM 설정
│   ├── prisma.service.ts
│   └── prisma.module.ts
├── abi/                  # 스마트 컨트랙트 ABI
│   ├── coldVault.json
│   ├── omnibusWallet.json
│   └── policyGuard.json
├── app.module.ts         # 루트 모듈
├── app.controller.ts
├── app.service.ts
└── main.ts               # 애플리케이션 진입점
```

## 환경 설정

### 1. 패키지 설치

```bash
npm install
```

### 2. 환경변수 설정

프로젝트 루트에 `.env` 파일을 생성하고 다음 내용을 추가하세요:

```env
# 서버 설정
PORT=3000
CORS_ORIGIN=http://localhost:3001

# 데이터베이스 연결 URL
DATABASE_URL="postgresql://user:password@localhost:5432/custody_wallet?schema=public"

# JWT 인증 설정
JWT_SECRET="your-secret-key-here-change-in-production"
JWT_EXPIRES_IN="9h"

# 이메일 설정 (SMTP)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"
APP_NAME="Custody Wallet"

# 프론트엔드/백엔드 URL (이메일 링크용)
FRONTEND_URL="http://localhost:3001"
BACKEND_URL="http://localhost:3000"

# 블록체인 설정
RPC_URL="https://mainnet.infura.io/v3/YOUR_PROJECT_ID"
OMNIBUS_CONTRACT="0x..."
COLD_VAULT_CONTRACT="0x..."
POLICY_GUARD_CONTRACT="0x..."
SIGNER_PRIVATE_KEY="0x..." # 서명자 개인키 (절대 공개하지 마세요!)
```

#### 환경변수 설명

| 변수명 | 설명 | 필수 |
|--------|------|------|
| `PORT` | 서버 포트 번호 | ✅ |
| `CORS_ORIGIN` | CORS 허용 도메인 | ✅ |
| `DATABASE_URL` | PostgreSQL 연결 URL | ✅ |
| `JWT_SECRET` | JWT 토큰 서명 키 | ✅ |
| `SMTP_HOST` | SMTP 서버 주소 | ✅ |
| `SMTP_PORT` | SMTP 포트 번호 | ✅ |
| `SMTP_USER` | SMTP 사용자 이메일 | ✅ |
| `SMTP_PASS` | SMTP 비밀번호 (앱 비밀번호) | ✅ |
| `APP_NAME` | 애플리케이션 이름 | ✅ |
| `FRONTEND_URL` | 프론트엔드 URL | ✅ |
| `BACKEND_URL` | 백엔드 URL | ✅ |
| `RPC_URL` | Ethereum RPC URL | ✅ |
| `OMNIBUS_CONTRACT` | Omnibus 지갑 컨트랙트 주소 | ✅ |
| `COLD_VAULT_CONTRACT` | Cold Vault 컨트랙트 주소 | ✅ |
| `POLICY_GUARD_CONTRACT` | Policy Guard 컨트랙트 주소 | ✅ |
| `SIGNER_PRIVATE_KEY` | 서명자 개인키 | ✅ |

### 3. 데이터베이스 마이그레이션

```bash
# Prisma 클라이언트 생성
npx prisma generate

# 데이터베이스 마이그레이션 실행
npx prisma migrate deploy

# 또는 개발 환경에서
npx prisma migrate dev
```

## 실행 방법

### 개발 모드

```bash
# 개발 모드 (watch mode - 파일 변경 시 자동 재시작)
npm run start:dev

# 디버그 모드
npm run start:debug
```

### 프로덕션 모드

```bash
# 프로덕션 빌드
npm run build

# 프로덕션 실행
npm run start:prod
```

서버가 정상적으로 시작되면 콘솔에 `서버가 포트 {PORT}에서 실행 중입니다.` 메시지가 표시됩니다.

## API 엔드포인트

### 인증 (Auth)

| Method | Endpoint | 인증 | 설명 |
|--------|----------|------|------|
| POST | `/auth/register` | ❌ | 회원가입 |
| GET | `/auth/verify-email?token=...` | ❌ | 이메일 인증 |
| POST | `/auth/resend-verification` | ❌ | 인증 이메일 재발송 |
| POST | `/auth/login` | ❌ | 로그인 |
| GET | `/auth/profile` | ✅ | 프로필 조회 |
| GET | `/auth/daily-balance-history?days=7` | ✅ | 일일 자산 추이 조회 |

### 트랜잭션 (Tx)

| Method | Endpoint | 인증 | 설명 |
|--------|----------|------|------|
| POST | `/tx/deposit` | ✅ | 입금 처리 |
| POST | `/tx/withdraw/submit` | ✅ | 출금 요청 생성 |
| POST | `/tx/withdraw/approve` | ✅ | 출금 승인 |
| POST | `/tx/withdraw/execute` | ✅ | 출금 실행 |
| GET | `/tx/tx-history?direction=IN\|OUT` | ✅ | 입출금 기록 조회 |

### 설정 (Setting)

| Method | Endpoint | 인증 | 설명 |
|--------|----------|------|------|
| POST | `/setting/withdraw-whitelist` | ✅ | 출금 화이트리스트 등록 |
| GET | `/setting/withdraw-whitelist` | ✅ | 출금 화이트리스트 조회 |
| DELETE | `/setting/withdraw-whitelist` | ✅ | 출금 화이트리스트 제거 |
| POST | `/setting/daily-limit` | ✅ | 일일 출금 한도 설정 |
| GET | `/setting/daily-limit` | ✅ | 일일 출금 한도 조회 |

### 관리자 (Admin) - 관리자 권한 필요

| Method | Endpoint | 인증 | 설명 |
|--------|----------|------|------|
| GET | `/admin/omnibus-balance` | ✅ | Omnibus 잔액 조회 |
| GET | `/admin/cold-balance` | ✅ | Cold 잔액 조회 |
| GET | `/admin/users` | ✅ | 모든 유저 목록 조회 |
| PATCH | `/admin/users/status` | ✅ | 유저 상태 업데이트 (동결/해제) |
| GET | `/admin/omnibus/paused` | ✅ | Omnibus 지갑 동결 상태 조회 |
| POST | `/admin/omnibus/pause` | ✅ | Omnibus 지갑 동결/해제 |
| POST | `/admin/cold/deposit` | ✅ | Cold Vault 입금 |
| POST | `/admin/cold/move/request` | ✅ | Cold Vault 이동 요청 |
| POST | `/admin/cold/move/approve` | ✅ | Cold Vault 이동 승인 |
| POST | `/admin/cold/move/execute` | ✅ | Cold Vault 이동 실행 |
| GET | `/admin/transactions?limit=50` | ✅ | 입출금 기록 조회 |
| GET | `/admin/withdrawals/pending?limit=50` | ✅ | 승인 대기 중인 출금 요청 목록 |
| GET | `/admin/withdrawals/:txId` | ✅ | 출금 요청 정보 조회 |
| POST | `/admin/withdrawals/approve` | ✅ | 출금 요청 승인 |
| POST | `/admin/withdrawals/execute` | ✅ | 출금 실행 |

### 기타

| Method | Endpoint | 인증 | 설명 |
|--------|----------|------|------|
| GET | `/` | ❌ | 헬스 체크 |

## API 사용 예시

### 1. 회원가입

```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123",
    "role": "user"
  }'
```

### 2. 로그인

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123"
  }'
```

응답 예시:
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "...",
    "email": "user@example.com",
    "role": "user",
    "status": "active"
  }
}
```

### 3. 입금 처리

```bash
curl -X POST http://localhost:3000/tx/deposit \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "txHash": "0x1234567890abcdef..."
  }'
```

### 4. 출금 요청 생성

```bash
curl -X POST http://localhost:3000/tx/withdraw/submit \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "to": "0x...",
    "amount": "1.5",
    "password": "user_password"
  }'
```

### 5. 프로필 조회

```bash
curl -X GET http://localhost:3000/auth/profile \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## 데이터베이스 스키마

### users 테이블
- `id`: UUID (Primary Key)
- `email`: 이메일 (Unique, Case-insensitive)
- `password`: 해시된 비밀번호
- `role`: 사용자 역할 (user, admin)
- `status`: 사용자 상태 (active, frozen)
- `balance`: 잔액 (Decimal 36,18)
- `email_verified`: 이메일 인증 여부
- `email_verification_token`: 이메일 인증 토큰
- `email_verification_expires`: 이메일 인증 만료 시간
- `created_at`: 생성일시

### transactions 테이블
- `txhash`: 트랜잭션 해시 (Primary Key)
- `user_id`: 사용자 ID (Foreign Key)
- `status`: 트랜잭션 상태 (pending, success, failed)
- `direction`: 트랜잭션 방향 (IN, OUT)
- `blocknumber`: 블록 번호
- `blockhash`: 블록 해시
- `blocktimestamp`: 블록 타임스탬프
- `from_address`: 송신 주소
- `to_address`: 수신 주소
- `amount`: 금액 (Decimal 38,18)
- `gasused`: 사용된 가스
- `effectivegasprice`: 유효 가스 가격
- `feepaid`: 지불된 수수료
- `createdat`: 생성일시

### withdrawal_whitelist 테이블
- `id`: UUID (Primary Key)
- `user_id`: 사용자 ID (Foreign Key)
- `to_address`: 화이트리스트 주소
- `created_at`: 생성일시
- `updated_at`: 수정일시

### deposit_withdraw_events 테이블
- `id`: UUID (Primary Key)
- `type`: 이벤트 타입 (DEPOSIT, WITHDRAW)
- `email`: 사용자 이메일
- `from_address`: 송신 주소 (입금만)
- `to_address`: 수신 주소 (출금만)
- `amount`: 금액 (Decimal 38,18)
- `timestamp`: 블록 타임스탬프 (초 단위)
- `transaction_hash`: 트랜잭션 해시 (Unique)
- `block_number`: 블록 번호
- `created_at`: 생성일시

## 배포 가이드

### 1. 프로덕션 환경변수 설정

프로덕션 환경에서는 반드시 다음 사항을 확인하세요:

- `JWT_SECRET`: 강력한 랜덤 문자열 사용
- `DATABASE_URL`: 프로덕션 데이터베이스 URL
- `SIGNER_PRIVATE_KEY`: 안전하게 관리 (환경변수 또는 시크릿 관리 서비스 사용)
- `CORS_ORIGIN`: 실제 프론트엔드 도메인으로 설정
- `RPC_URL`: 안정적인 RPC 프로바이더 사용 (Infura, Alchemy 등)

### 2. 빌드 및 배포

```bash
# 의존성 설치
npm ci

# Prisma 클라이언트 생성
npx prisma generate

# 데이터베이스 마이그레이션
npx prisma migrate deploy

# 프로덕션 빌드
npm run build

# 프로덕션 실행
npm run start:prod
```

### 3. PM2를 사용한 배포 (선택사항)

```bash
# PM2 설치
npm install -g pm2

# PM2로 애플리케이션 시작
pm2 start dist/main.js --name custody-wallet

# PM2 상태 확인
pm2 status

# PM2 로그 확인
pm2 logs custody-wallet

# PM2 재시작
pm2 restart custody-wallet
```

### 4. Docker를 사용한 배포 (선택사항)

```dockerfile
# Dockerfile 예시
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npx prisma generate
RUN npm run build

EXPOSE 3000

CMD ["npm", "run", "start:prod"]
```

## 문제 해결

### 1. Prisma 관련 오류

```bash
# Prisma 클라이언트 재생성
npx prisma generate

# 데이터베이스 마이그레이션 상태 확인
npx prisma migrate status

# 데이터베이스 초기화 (주의: 모든 데이터 삭제됨)
npx prisma migrate reset
```

### 2. 이메일 전송 오류

- Gmail 사용 시 "앱 비밀번호" 생성 필요
  - Google 계정 설정 > 보안 > 2단계 인증 > 앱 비밀번호
- SMTP 설정 확인:
  - `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` 확인
- 방화벽/네트워크 설정 확인

### 3. 블록체인 연결 오류

- `RPC_URL` 환경변수 확인
- RPC 프로바이더 (Infura/Alchemy) API 키 확인
- 네트워크 연결 확인
- Rate limit 확인 (너무 많은 요청 시 제한될 수 있음)

### 4. 포트 충돌

```bash
# 포트 사용 중인 프로세스 확인 (macOS/Linux)
lsof -i :3000

# 프로세스 종료
kill -9 <PID>
```

### 5. 환경변수 누락 오류

서버 시작 시 환경변수 관련 오류가 발생하면:
- `.env` 파일이 프로젝트 루트에 있는지 확인
- 필수 환경변수가 모두 설정되었는지 확인
- 환경변수 이름 오타 확인

## 개발 도구

```bash
# 린팅
npm run lint

# 포맷팅
npm run format

# 테스트
npm run test

# Prisma Studio (DB GUI)
npx prisma studio
```

## 보안 기능

- **비밀번호 암호화**: bcrypt를 사용한 단방향 해시 (salt rounds: 10)
- **JWT 인증**: 토큰 기반 인증으로 stateless 구현
- **이메일 인증**: 회원가입 시 이메일 인증 필수
- **중복 트랜잭션 방지**: 트랜잭션 해시를 Primary Key로 사용
- **데이터베이스 트랜잭션**: 원자성 보장으로 데이터 일관성 유지
- **출금 화이트리스트**: 출금 주소 검증
- **일일 출금 한도**: 출금 금액 제한
- **관리자 권한 분리**: AdminGuard를 통한 권한 관리

## 주요 기능 상세

### 입금 처리 흐름
1. 프론트엔드에서 JWT 토큰과 트랜잭션 해시 전송
2. JWT 토큰 검증 (사용자 인증)
3. 트랜잭션 해시 형식 검증
4. 중복 트랜잭션 확인
5. 블록체인에서 트랜잭션 정보 조회
6. 트랜잭션 컨펌 여부 확인
7. 트랜잭션 성공/실패 확인
8. 데이터베이스 트랜잭션으로 원자적 처리:
   - transactions 테이블에 트랜잭션 정보 저장
   - users 테이블의 balance 업데이트
9. 결과 반환

### 출금 처리 흐름
1. 사용자가 출금 요청 생성 (TSS seat A)
2. 화이트리스트 검증
3. 일일 출금 한도 확인
4. 출금 승인 (TSS seat B)
5. 관리자 승인 (Manager)
6. 출금 실행 및 잔액 차감

### 블록체인 이벤트 리스닝
- 실시간으로 블록체인 이벤트 감지
- 입출금 이벤트 자동 처리
- WebSocket을 통한 실시간 알림 전송

## 라이센스

MIT

## 개발자

Custody Wallet Team
