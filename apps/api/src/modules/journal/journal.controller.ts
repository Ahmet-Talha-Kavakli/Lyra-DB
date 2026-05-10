import { Controller, Get, Put, Body, Query, Headers } from '@nestjs/common';
import { JournalService } from './journal.service';

/**
 * Journal entries — her zaman bir notebook'a bağlı.
 *
 *   GET    /journal?notebookId=<uuid>            → listele
 *   GET    /journal/entry?notebookId=<uuid>&date=YYYY-MM-DD → tek entry
 *   PUT    /journal { notebookId, date, content } → upsert
 */
@Controller('journal')
export class JournalController {
  constructor(private readonly journal: JournalService) {}

  @Get()
  list(
    @Headers('x-clerk-user-id') clerkId: string,
    @Query('notebookId') notebookId: string,
  ) {
    return this.journal.list(clerkId, notebookId);
  }

  @Get('entry')
  getEntry(
    @Headers('x-clerk-user-id') clerkId: string,
    @Query('notebookId') notebookId: string,
    @Query('date') date: string,
  ) {
    return this.journal.getByDate(clerkId, notebookId, date);
  }

  @Put()
  upsert(
    @Headers('x-clerk-user-id') clerkId: string,
    @Body() body: { notebookId: string; date: string; content: string },
  ) {
    return this.journal.upsert(clerkId, body.notebookId, body.date, body.content);
  }
}
