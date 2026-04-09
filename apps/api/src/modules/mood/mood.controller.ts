import { Controller, Post, Get, Body, Query, Headers } from '@nestjs/common';
import { MoodService } from './mood.service';

@Controller('mood')
export class MoodController {
  constructor(private readonly mood: MoodService) {}

  @Post()
  log(
    @Headers('x-clerk-user-id') clerkId: string,
    @Body() body: { score: number },
  ) {
    return this.mood.log(clerkId, body.score);
  }

  @Get('history')
  history(
    @Headers('x-clerk-user-id') clerkId: string,
    @Query('days') days = '7',
  ) {
    return this.mood.history(clerkId, parseInt(days, 10));
  }
}
