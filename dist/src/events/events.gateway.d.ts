import { OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
export declare class EventsGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
    server: Server;
    private logger;
    afterInit(server: Server): void;
    handleConnection(client: Socket): void;
    handleDisconnect(client: Socket): void;
    broadcastDepositWithdrawEvent(event: {
        type: 'DEPOSIT' | 'WITHDRAW';
        email: string | null;
        from?: string;
        to?: string;
        amount: string;
        timestamp: number;
    }): void;
}
