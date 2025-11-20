import { Strategy } from 'passport-jwt';
import { PrismaService } from '../prisma/prisma.service';
declare const JwtStrategy_base: new (...args: [opt: import("passport-jwt").StrategyOptionsWithRequest] | [opt: import("passport-jwt").StrategyOptionsWithoutRequest]) => Strategy & {
    validate(...args: any[]): unknown;
};
export declare class JwtStrategy extends JwtStrategy_base {
    private prismaService;
    constructor(prismaService: PrismaService);
    validate(payload: any): Promise<{
        email: string;
        role: import("@prisma/client").$Enums.user_role;
        id: string;
        balance: import("@prisma/client/runtime/library").Decimal;
        created_at: Date;
        status: import("@prisma/client").$Enums.user_status;
    }>;
}
export {};
