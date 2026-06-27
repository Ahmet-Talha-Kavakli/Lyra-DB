import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { BloomService } from './bloom.service';
import type { IBloomAiAccess, TCycleStage, TFlow } from '@ai-therapist/types';

interface ProfileBody {
  birthDate?: string | null;
  averageCycleDays?: number | null;
  lastPeriodStart?: string | null;
  stage?: TCycleStage;
  aiAccessLevel?: IBloomAiAccess;
}

interface LogBody {
  logDate: string;
  flow?: TFlow | null;
  isPeriodStart?: boolean;
  isPeriodEnd?: boolean;
  notes?: string | null;
  payload?: any;
}

@Controller('bloom')
export class BloomController {
  constructor(private readonly bloom: BloomService) {}

  @Get('profile')
  getProfile(@Headers('x-clerk-user-id') clerkId: string) {
    return this.bloom.getProfile(clerkId);
  }

  @Post('profile')
  createProfile(
    @Headers('x-clerk-user-id') clerkId: string,
    @Body() body: ProfileBody,
  ) {
    return this.bloom.upsertProfile(clerkId, body);
  }

  @Patch('profile')
  updateProfile(
    @Headers('x-clerk-user-id') clerkId: string,
    @Body() body: ProfileBody,
  ) {
    return this.bloom.upsertProfile(clerkId, body);
  }

  @Get('today')
  getToday(@Headers('x-clerk-user-id') clerkId: string) {
    return this.bloom.getToday(clerkId);
  }

  // ── PeriodLog ───────────────────────────────────────────────────────────

  @Post('log')
  upsertLog(
    @Headers('x-clerk-user-id') clerkId: string,
    @Body() body: LogBody,
  ) {
    return this.bloom.upsertLog(clerkId, body);
  }

  @Patch('log')
  patchLog(
    @Headers('x-clerk-user-id') clerkId: string,
    @Body() body: LogBody,
  ) {
    return this.bloom.upsertLog(clerkId, body);
  }

  @Get('log/:date')
  getLog(
    @Headers('x-clerk-user-id') clerkId: string,
    @Param('date') date: string,
  ) {
    return this.bloom.getLogByDate(clerkId, date);
  }

  @Delete('log/:date')
  deleteLog(
    @Headers('x-clerk-user-id') clerkId: string,
    @Param('date') date: string,
  ) {
    return this.bloom.deleteLog(clerkId, date);
  }

  @Post('log/:date/unmark-period-start')
  unmarkPeriodStart(
    @Headers('x-clerk-user-id') clerkId: string,
    @Param('date') date: string,
  ) {
    return this.bloom.unmarkPeriodStart(clerkId, date);
  }

  @Post('log/:date/unmark-period-end')
  unmarkPeriodEnd(
    @Headers('x-clerk-user-id') clerkId: string,
    @Param('date') date: string,
  ) {
    return this.bloom.unmarkPeriodEnd(clerkId, date);
  }

  @Get('calendar')
  getCalendar(
    @Headers('x-clerk-user-id') clerkId: string,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    return this.bloom.getCalendarRange(clerkId, from, to);
  }
}
