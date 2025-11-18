import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

// WebSocket 게이트웨이 - 클라이언트와 실시간 통신
@WebSocketGateway({
  cors: {
    origin: '*', // 프로덕션에서는 특정 도메인으로 제한
  },
})
export class EventsGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private logger: Logger = new Logger('EventsGateway');

  // 게이트웨이 초기화
  afterInit(server: Server) {
    this.logger.log('WebSocket Gateway 초기화 완료');
  }

  // 클라이언트 연결
  handleConnection(client: Socket) {
    this.logger.log(`클라이언트 연결: ${client.id}`);
  }

  // 클라이언트 연결 해제
  handleDisconnect(client: Socket) {
    this.logger.log(`클라이언트 연결 해제: ${client.id}`);
  }

  // 입출금 이벤트 브로드캐스트
  broadcastDepositWithdrawEvent(event: {
    type: 'DEPOSIT' | 'WITHDRAW';
    email: string | null;
    from?: string;
    to?: string;
    amount: string;
    timestamp: number;
  }) {
    this.server.emit('deposit_withdraw_event', event);
    this.logger.log(`입출금 이벤트 브로드캐스트: ${event.type}`);
  }
}

