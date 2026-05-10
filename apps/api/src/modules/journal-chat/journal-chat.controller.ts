import { Body, Controller, Headers, HttpCode, Post } from '@nestjs/common';
import { JournalChatService, type JournalChatContextPayload, type ConversationTurn } from './journal-chat.service';

interface SummarizeBody {
  conversationHistory: ConversationTurn[];
  context:             JournalChatContextPayload;
}

/**
 * POST /journal-chat/summarize
 * Fired client-side when the journal-chat modal closes. Persists a 1-2
 * sentence summary into SessionMemory so future therapy sessions can
 * reference it ("we talked about X in your journal last week").
 *
 * Returns 204 if nothing was stored (e.g. <2 turns) so the client can
 * fire-and-forget without branching on the body.
 */
@Controller('journal-chat')
export class JournalChatController {
  constructor(private readonly chat: JournalChatService) {}

  @Post('summarize')
  @HttpCode(200)
  async summarize(
    @Headers('x-clerk-user-id') clerkId: string,
    @Body() body: SummarizeBody,
  ) {
    if (!clerkId) return { stored: false };
    const result = await this.chat.summarizeAndStore(
      clerkId,
      body.conversationHistory ?? [],
      body.context ?? { mode: 'shelf' },
    );
    return result;
  }
}
