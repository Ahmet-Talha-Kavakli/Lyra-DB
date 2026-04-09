import { Controller, Get, Put, Body, Query, Headers } from '@nestjs/common';
import { JournalService } from './journal.service';

@Controller('journal')
export class JournalController {
  constructor(private readonly journal: JournalService) {}

  @Get()
  list(@Headers('x-clerk-user-id') clerkId: string) {
    return this.journal.list(clerkId);
  }

  @Get('entry')
  getEntry(
    @Headers('x-clerk-user-id') clerkId: string,
    @Query('date') date: string,
  ) {
    return this.journal.getByDate(clerkId, date);
  }

  @Put()
  upsert(
    @Headers('x-clerk-user-id') clerkId: string,
    @Body() body: { date: string; content: string },
  ) {
    return this.journal.upsert(clerkId, body.date, body.content);
  }
}
