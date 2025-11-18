import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule], // PrismaService 사용을 위해 PrismaModule import
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}

