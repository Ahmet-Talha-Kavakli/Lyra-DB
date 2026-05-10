import { Module } from '@nestjs/common';
import { AiTherapistModule } from '../ai-therapist/ai-therapist.module';
import { MemoryModule } from '../memory/memory.module';
import { JournalModule } from '../journal/journal.module';
import { SessionService } from './session.service';
import { SessionGateway } from './session.gateway';
import { SessionController } from './session.controller';
import { PostSessionService } from './post-session.service';
import { CheckInService } from './check-in.service';

@Module({
  imports:     [AiTherapistModule, MemoryModule, JournalModule],
  controllers: [SessionController],
  providers:   [SessionService, SessionGateway, PostSessionService, CheckInService],
  exports:     [SessionService, PostSessionService, CheckInService],
})
export class SessionModule {}
