import { Module } from '@nestjs/common';
import { PrismaModule } from '../../shared/prisma/prisma.module';
import { MemoryModule } from '../memory/memory.module';
import { JournalModule } from '../journal/journal.module';
import { AiTherapistModule } from '../ai-therapist/ai-therapist.module';
import { JournalChatService } from './journal-chat.service';
import { JournalChatGateway } from './journal-chat.gateway';
import { JournalChatController } from './journal-chat.controller';

@Module({
  imports:     [PrismaModule, MemoryModule, JournalModule, AiTherapistModule],
  controllers: [JournalChatController],
  providers:   [JournalChatService, JournalChatGateway],
})
export class JournalChatModule {}
