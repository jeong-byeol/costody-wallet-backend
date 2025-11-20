import { OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { EventsGateway } from './events.gateway';
export declare class EventsService implements OnModuleInit {
    private readonly prismaService;
    private readonly configService;
    private readonly eventsGateway;
    private provider;
    private omnibusContract;
    private userKeyToEmailMap;
    private readonly logger;
    private isListening;
    private reconnectTimer?;
    constructor(prismaService: PrismaService, configService: ConfigService, eventsGateway: EventsGateway);
    onModuleInit(): Promise<void>;
    updateUserKeyMap(): Promise<void>;
    startEventListeners(): Promise<void>;
    private handleDepositEvent;
    private handleSubmittedEvent;
    private restartEventListeners;
    stopEventListeners(): Promise<void>;
}
