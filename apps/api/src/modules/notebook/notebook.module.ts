import { Module } from '@nestjs/common';
import { NotebookService } from './notebook.service';
import { NotebookController } from './notebook.controller';
import { PrismaModule } from '../../shared/prisma/prisma.module';

@Module({
  imports:     [PrismaModule],
  controllers: [NotebookController],
  providers:   [NotebookService],
  exports:     [NotebookService],
})
export class NotebookModule {}
