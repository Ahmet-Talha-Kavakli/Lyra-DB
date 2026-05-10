import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';

interface ConsentItem {
  consentType: string;
  granted:     boolean;
  version:     string;
}

interface OnboardingData {
  intake: {
    primaryGoals:               string[];
    currentChallenges:          string;
    previousTherapyExperience:  string;
    currentMedications?:        string;
    emergencyContactName?:      string;
    emergencyContactPhone?:     string;
    preferredSessionLength:     string;
    preferredCommunicationStyle:string;
  };
  consents:            ConsentItem[];
  disclaimerAcceptedAt:string;
}

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  /** Upsert user row — called on Clerk webhook (user.created / user.updated). */
  async ensureUserExists(clerkId: string, email?: string) {
    return this.prisma.user.upsert({
      where:  { clerkId },
      create: { clerkId, email },
      update: { email },
    });
  }

  /**
   * Called from Clerk webhook on `user.deleted` event.
   * Cascade deletes are configured in Prisma schema (sessions, journal,
   * notebooks, mood, etc), so a single user delete cleans up everything.
   */
  async deleteByClerkId(clerkId: string) {
    const user = await this.prisma.user.findUnique({
      where:  { clerkId },
      select: { id: true },
    });
    if (!user) return; // already gone
    await this.prisma.user.delete({ where: { id: user.id } });
  }

  /**
   * Returns the user's profile if onboarding has been completed,
   * or null if the profile doesn't exist yet.
   * Used by the dashboard onboarding-check.
   */
  async getProfile(clerkId: string) {
    const user = await this.prisma.user.findUnique({
      where:  { clerkId },
      select: { id: true },
    });
    if (!user) return null;

    return this.prisma.userProfile.findUnique({
      where:  { userId: user.id },
      select: {
        id:        true,
        goals:     true,
        riskLevel: true,
        updatedAt: true,
      },
    });
  }

  /** Updates therapy preferences from the profile settings page. */
  async updateProfile(clerkId: string, data: {
    goals?:              string[];
    communicationStyle?: string;
    sessionLength?:      number;
    emergencyContact?:   { name: string; phone?: string } | null;
  }) {
    const user = await this.prisma.user.findUnique({ where: { clerkId }, select: { id: true } });
    if (!user) return;

    const existing = await this.prisma.userProfile.findUnique({
      where:  { userId: user.id },
      select: { therapyPreferences: true },
    });

    const prevPrefs = (existing?.therapyPreferences as Record<string, unknown>) ?? {};

    await this.prisma.userProfile.update({
      where: { userId: user.id },
      data: {
        ...(data.goals !== undefined && { goals: data.goals }),
        therapyPreferences: {
          ...prevPrefs,
          ...(data.communicationStyle !== undefined && { communicationStyle: data.communicationStyle }),
          ...(data.sessionLength       !== undefined && { sessionLength: data.sessionLength }),
          ...(data.emergencyContact    !== undefined && { emergencyContact: data.emergencyContact }),
        },
      },
    });
  }

  async saveOnboarding(clerkId: string, data: OnboardingData) {
    const user = await this.ensureUserExists(clerkId);

    await this.prisma.$transaction([
      this.prisma.userProfile.upsert({
        where:  { userId: user.id },
        create: {
          userId: user.id,
          goals:  data.intake.primaryGoals,
          mentalHealthHistory: {
            currentChallenges:          data.intake.currentChallenges,
            previousTherapyExperience:  data.intake.previousTherapyExperience,
            currentMedications:         data.intake.currentMedications ?? null,
          },
          therapyPreferences: {
            communicationStyle: data.intake.preferredCommunicationStyle,
            sessionLength:      parseInt(data.intake.preferredSessionLength, 10),
            emergencyContact:   data.intake.emergencyContactName
              ? { name: data.intake.emergencyContactName, phone: data.intake.emergencyContactPhone }
              : null,
          },
          disclaimerAcceptedAt: new Date(data.disclaimerAcceptedAt),
        },
        update: {
          goals: data.intake.primaryGoals,
          mentalHealthHistory: {
            currentChallenges:          data.intake.currentChallenges,
            previousTherapyExperience:  data.intake.previousTherapyExperience,
            currentMedications:         data.intake.currentMedications ?? null,
          },
          therapyPreferences: {
            communicationStyle: data.intake.preferredCommunicationStyle,
            sessionLength:      parseInt(data.intake.preferredSessionLength, 10),
          },
          disclaimerAcceptedAt: new Date(data.disclaimerAcceptedAt),
        },
      }),
      this.prisma.userConsent.deleteMany({ where: { userId: user.id } }),
    ]);

    await this.prisma.userConsent.createMany({
      data: data.consents.map((c) => ({
        userId:      user.id,
        consentType: c.consentType,
        granted:     c.granted,
        grantedAt:   c.granted ? new Date() : null,
        version:     c.version,
      })),
    });
  }
}
