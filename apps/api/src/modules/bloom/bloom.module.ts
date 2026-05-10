import { Module } from '@nestjs/common';
import { PrismaModule } from '../../shared/prisma/prisma.module';
import { BloomService } from './bloom.service';
import { BloomController } from './bloom.controller';

@Module({
  imports:     [PrismaModule],
  controllers: [BloomController],
  providers:   [BloomService],
  exports:     [BloomService],
})
export class BloomModule {}
