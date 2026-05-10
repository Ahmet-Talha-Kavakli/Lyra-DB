import { Module } from '@nestjs/common';
import { JournalService } from './journal.service';
import { JournalController } from './journal.controller';
import { PrismaModule } from '../../shared/prisma/prisma.module';
import { NotebookModule } from '../notebook/notebook.module';

@Module({
  imports:     [PrismaModule, NotebookModule],
  controllers: [JournalController],
  providers:   [JournalService],
  exports:     [JournalService],
})
export class JournalModule {}
