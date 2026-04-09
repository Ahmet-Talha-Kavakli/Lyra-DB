import { Module, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './shared/prisma/prisma.module';
import { AuditLogMiddleware } from './shared/middleware/audit-log.middleware';
import { SessionModule } from './modules/session/session.module';
import { AiTherapistModule } from './modules/ai-therapist/ai-therapist.module';
import { MemoryModule } from './modules/memory/memory.module';
import { UserModule } from './modules/user/user.module';
import { InngestModule } from './inngest/inngest.module';
import { JournalModule } from './modules/journal/journal.module';
import { MoodModule } from './modules/mood/mood.module';
import { AppController } from './app.controller';

@Module({
  controllers: [AppController],
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 3_600_000, limit: 5 }]),
    PrismaModule,
    SessionModule,
    AiTherapistModule,
    MemoryModule,
    UserModule,
    InngestModule,
    JournalModule,
    MoodModule,
  ],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(AuditLogMiddleware).forRoutes('*path');
  }
}
