import {
  Controller,
  Get,
  Query,
  Headers,
  BadRequestException,
  UseGuards,
} from '@nestjs/common';
import { SessionService } from './session.service';
import { CheckInService } from './check-in.service';
import { ClerkAuthGuard } from '../../shared/guards/clerk-auth.guard';

@Controller('session')
@UseGuards(ClerkAuthGuard)
export class SessionController {
  constructor(
    private readonly sessions: SessionService,
    private readonly checkIn:  CheckInService,
  ) {}

  /**
   * GET /session/history?page=1&perPage=20
   * Returns paginated list of completed sessions + SOAP notes for the caller.
   */
  @Get('history')
  async history(
    @Headers('x-clerk-user-id') clerkId: string,
    @Query('page')    page    = '1',
    @Query('perPage') perPage = '20',
  ) {
    if (!clerkId) throw new BadRequestException('Missing user ID');
    return this.sessions.getHistory(
      clerkId,
      Math.max(1, parseInt(page,    10) || 1),
      Math.min(50, parseInt(perPage, 10) || 20),
    );
  }

  /** GET /session/homework — pending homework items from the most recent session. */
  @Get('homework')
  async homework(@Headers('x-clerk-user-id') clerkId: string) {
    if (!clerkId) throw new BadRequestException('Missing user ID');
    return { homework: await this.sessions.getLastHomework(clerkId) };
  }

  /** GET /session/check-in?name=X — contextual Lyra message for dashboard. */
  @Get('check-in')
  async checkInMessage(
    @Headers('x-clerk-user-id') clerkId: string,
    @Query('name') name = 'there',
  ) {
    if (!clerkId) throw new BadRequestException('Missing user ID');
    const message = await this.checkIn.getCheckIn(clerkId, name);
    return { message };
  }
}
