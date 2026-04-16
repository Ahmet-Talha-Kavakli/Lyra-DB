import { Controller, Get, Post, Patch, Body, Headers, UseGuards, BadRequestException, NotFoundException } from '@nestjs/common';
import { UserService } from './user.service';
import { ClerkAuthGuard } from '../../shared/guards/clerk-auth.guard';

interface ConsentItem {
  consentType: string;
  granted:     boolean;
  version:     string;
}

interface OnboardingBody {
  intake: {
    primaryGoals:                string[];
    currentChallenges:           string;
    previousTherapyExperience:   string;
    currentMedications?:         string;
    emergencyContactName?:       string;
    emergencyContactPhone?:      string;
    preferredSessionLength:      string;
    preferredCommunicationStyle: string;
  };
  consents:             ConsentItem[];
  disclaimerAcceptedAt: string;
}

@Controller('user')
@UseGuards(ClerkAuthGuard)
export class UserController {
  constructor(private readonly userService: UserService) {}

  /**
   * GET /user/profile
   * Used by the dashboard onboarding check.
   * Returns 200 + profile if onboarding complete, 404 if not.
   */
  @Get('profile')
  async profile(@Headers('x-clerk-user-id') clerkId: string) {
    if (!clerkId) throw new BadRequestException('Missing user ID');

    const profile = await this.userService.getProfile(clerkId);
    if (!profile) throw new NotFoundException('Profile not found');

    return profile;
  }

  /**
   * PATCH /user/profile
   * Updates editable therapy preferences (goals, communication style, session length).
   */
  @Patch('profile')
  async updateProfile(
    @Headers('x-clerk-user-id') clerkId: string,
    @Body() body: {
      goals?:              string[];
      communicationStyle?: string;
      sessionLength?:      number;
      emergencyContact?:   { name: string; phone?: string } | null;
    },
  ) {
    if (!clerkId) throw new BadRequestException('Missing user ID');
    await this.userService.updateProfile(clerkId, body);
    return { success: true };
  }

  /** POST /user/onboarding — saves intake form + consents. */
  @Post('onboarding')
  async onboarding(
    @Headers('x-clerk-user-id') clerkId: string,
    @Body() body: OnboardingBody,
  ) {
    if (!clerkId) throw new BadRequestException('Missing user ID');
    await this.userService.saveOnboarding(clerkId, body);
    return { success: true };
  }

  /**
   * POST /user/ensure
   * Called by the Clerk webhook (user.created / user.updated).
   * Creates or updates the user row — no auth guard needed on this
   * path because it's protected by SVIX signature verification upstream.
   */
  @Post('ensure')
  async ensure(
    @Headers('x-clerk-user-id') clerkId: string,
    @Body() body: { email?: string },
  ) {
    if (!clerkId) throw new BadRequestException('Missing user ID');
    await this.userService.ensureUserExists(clerkId, body.email);
    return { success: true };
  }
}
