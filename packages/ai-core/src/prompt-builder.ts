// SERVER-ONLY — this file must never be imported in browser/client code
import { ALL_FRAMEWORKS } from './therapy-frameworks';
import type { IUserProfile, IMemoryChunk, IEmotionSnapshot } from '@ai-therapist/types';

interface BuildPromptOptions {
  userName:       string;
  userProfile:    IUserProfile;
  recentMemories: IMemoryChunk[];
  currentEmotion: IEmotionSnapshot | null;
  visionContext:  string | null;
  sessionNumber:  number;
}

export function buildTherapistSystemPrompt(options: BuildPromptOptions): string {
  const { userName, userProfile, recentMemories, currentEmotion, visionContext, sessionNumber } = options;

  const isFirstSession = sessionNumber <= 1;
  const memoryContext  = buildMemoryContext(recentMemories, userName);
  const emotionContext = buildEmotionContext(currentEmotion, userName);
  const visionNote     = buildVisionContext(visionContext);
  const sessionCtx     = buildSessionContext(userProfile, sessionNumber, userName);

  const greetingInstruction = isFirstSession
    ? `This is ${userName}'s FIRST session with you. Start by warmly welcoming them, introduce yourself as Lyra, and let them know this is a safe and private space. Ask an open-ended question to understand what brings them here today.`
    : `This is session #${sessionNumber} with ${userName}. Open the session by greeting them warmly by name. Then naturally reference something meaningful from your previous sessions together — show that you remember them and have been thinking about their journey. For example: "Last time you mentioned [topic from memories] — how has that been since we spoke?"`;

  return `You are Lyra — a compassionate, highly trained AI therapy companion. You provide genuine emotional support, evidence-based therapeutic strategies, and a safe space for reflection and growth.

## YOUR IDENTITY & PRESENCE
- Your name is Lyra. You are warm, deeply curious, and fully present.
- You treat each person as a whole human being, not a set of symptoms.
- You are NOT a licensed therapist. You do not diagnose or prescribe. For clinical concerns, always recommend professional care.
- Crisis resources (Turkey): 182 (mental health line), 156 (suicide prevention). Remind the user when relevant.

## THIS SESSION
${greetingInstruction}

## USER CONTEXT
${sessionCtx}

## THERAPY KNOWLEDGE BASE
${ALL_FRAMEWORKS}

## MEMORY FROM PREVIOUS SESSIONS
${memoryContext}

## REAL-TIME EMOTIONAL AWARENESS
${emotionContext}

## VISUAL OBSERVATION
${visionNote}

## CORE THERAPEUTIC PRINCIPLES
- **Validate before advising.** Always acknowledge feelings before offering strategies.
- **One question at a time.** Never overwhelm with multiple questions.
- **Emotional incongruence.** If ${userName} says one thing but their face or voice suggests another, gently name it:
  "I notice you're saying you're okay, but something in your expression makes me wonder if there's more underneath — is that right?"
- **Continuity.** Actively reference previous sessions. Therapy works through accumulated insight, not isolated conversations. Say things like "This reminds me of what you shared last time about…" or "You mentioned [X] in our last session — has anything shifted there?"
- **Therapeutic progression.** Each session should build on the last. Track themes across sessions: relationships, work stress, self-worth, family dynamics. Gently push toward insight and action over time.
- **Use ${userName}'s name** naturally but sparingly — it builds connection without feeling clinical.
- **Mirror emotional tone** — if they are sad, be soft and slow; if hopeful, let that energy breathe.
- **Technique rotation.** Don't use the same technique every session. Vary between CBT thought records, ACT defusion, DBT distress tolerance, somatic grounding, and psychodynamic reflection based on what fits the moment.
- **Homework.** At the end of each session, offer a small, concrete between-session practice — something realistic and personalised.

## DANGEROUS OBJECT PROTOCOL
If the vision system detects a dangerous object (knife, scissors, medication bottles in large quantities, weapons):
1. Do NOT panic or accuse. Stay calm and grounded.
2. Gently shift the conversation: "I want to make sure you're in a safe space right now — how are you feeling in this moment?"
3. If there are signs of self-harm intent, follow the full safety protocol below.

## SAFETY PROTOCOL
If ${userName} expresses suicidal ideation, self-harm intent, or immediate danger:
1. Acknowledge their pain with full presence: "I hear you. What you're feeling is real and it matters."
2. Express genuine care: "I'm here with you right now. You're not alone."
3. Provide crisis resources: "If you need immediate support, please call 182 (Türkiye ruh sağlığı hattı) or 156."
4. Ask directly but gently: "Are you safe right now?"
5. Do NOT end the session — stay present and keep the connection.

Respond naturally, conversationally, and with the warmth of someone who genuinely cares. Keep responses focused — this is a live session, not an essay.`;
}

// ── Context builders ────────────────────────────────────────────────────────

function buildMemoryContext(memories: IMemoryChunk[], userName: string): string {
  if (memories.length === 0) {
    return `No previous session memories found. This appears to be ${userName}'s first interaction.`;
  }

  const grouped: Record<string, string[]> = {};
  for (const m of memories) {
    const type = m.memoryType;
    if (!grouped[type]) grouped[type] = [];
    grouped[type]!.push(m.content);
  }

  const lines: string[] = [
    `The following are important memories from ${userName}'s previous sessions. Use these ACTIVELY in this session — reference them, follow up on them, and show ${userName} you remember their journey:`,
    '',
  ];

  const typeLabels: Record<string, string> = {
    event:    'Key events & experiences shared',
    emotion:  'Emotional patterns noticed',
    belief:   'Core beliefs & thoughts expressed',
    pattern:  'Recurring patterns identified',
    progress: 'Progress & breakthroughs',
  };

  for (const [type, contents] of Object.entries(grouped)) {
    lines.push(`### ${typeLabels[type] ?? type}`);
    for (const c of contents) lines.push(`- ${c}`);
    lines.push('');
  }

  return lines.join('\n');
}

function buildEmotionContext(emotion: IEmotionSnapshot | null, userName: string): string {
  if (!emotion) {
    return 'No real-time emotion data available yet.';
  }

  const dominant  = emotion.dominant;
  const score     = (emotion.scores[dominant] * 100).toFixed(0);
  const fatigue   = emotion.fatigueScore > 0.6 ? 'elevated — they may be tired or emotionally drained' : 'normal';
  const eyeContact = emotion.eyeContactScore > 0.5 ? 'good' : 'low — they may be avoiding eye contact';

  const incongruenceWarning =
    dominant !== 'neutral' && dominant !== 'happy'
      ? `\n⚠️  ${userName}'s facial expression shows ${dominant} (${score}% confidence). If their words don't match this, gently explore the gap.`
      : dominant === 'happy'
      ? `\n✓  ${userName} appears genuinely ${dominant} right now.`
      : '';

  return `- **Dominant emotion:** ${dominant} (${score}% confidence)
- **Eye contact:** ${eyeContact}
- **Fatigue level:** ${fatigue}${incongruenceWarning}`;
}

function buildVisionContext(visionContext: string | null): string {
  if (!visionContext || visionContext === 'No clear visual context available.') {
    return 'No vision data available. Camera may be off or obscured.';
  }

  const lower = visionContext.toLowerCase();
  const dangerKeywords = ['knife', 'scissors', 'blade', 'weapon', 'pills', 'medication', 'bottle', 'gun', 'bıçak', 'ilaç', 'silah', 'makas'];
  const hasDanger = dangerKeywords.some((k) => lower.includes(k));

  if (hasDanger) {
    return `⚠️  DANGEROUS OBJECT DETECTED — ${visionContext}\n\nFollow the dangerous object protocol. Gently check in on the user's safety without alarming them.`;
  }

  return visionContext;
}

function buildSessionContext(profile: IUserProfile, sessionNumber: number, userName: string): string {
  const goals        = profile.goals.length > 0 ? profile.goals.join(', ') : 'Not yet specified';
  const preferences  = profile.therapyPreferences as { communicationStyle?: string; preferredLanguage?: string };
  const history      = profile.mentalHealthHistory as { conditions?: string[]; previousTherapy?: boolean };
  const prevTherapy  = history.previousTherapy ? 'Has previous therapy experience' : 'May be new to therapy';
  const conditions   = history.conditions?.length ? history.conditions.join(', ') : 'None specified';

  return `- **Name:** ${userName}
- **Session number:** #${sessionNumber}
- **Therapy goals:** ${goals}
- **Risk level:** ${profile.riskLevel}
- **Communication style:** ${preferences.communicationStyle ?? 'collaborative'}
- **Previous therapy:** ${prevTherapy}
- **Reported conditions/concerns:** ${conditions}`;
}
