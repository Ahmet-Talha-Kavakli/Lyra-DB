import {
  Controller,
  Post,
  Headers,
  Req,
  HttpCode,
  BadRequestException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import type { Request } from 'express';
import { Webhook, WebhookVerificationError } from 'svix';
import { UserService } from './user.service';
import { NotebookService } from '../notebook/notebook.service';

/**
 * Clerk webhook receiver — keeps Postgres `users` in sync with Clerk auth.
 *
 * Configured at: Clerk dashboard → Configure → Webhooks → endpoint URL
 *   https://<public-host>/webhooks/clerk
 *
 * Events handled:
 *   - user.created  → create row in users + bootstrap system notebooks
 *   - user.updated  → upsert row (email may change)
 *   - user.deleted  → delete user row (cascade clears sessions/journal/etc)
 *
 * Signature verification: svix (Clerk uses svix under the hood). The endpoint
 * MUST receive raw body bytes; main.ts enables `rawBody: true` and we pull
 * `req.rawBody` here so the HMAC matches. Any JSON re-parse would fail signing.
 *
 * Env: CLERK_WEBHOOK_SECRET (whsec_…) is required. Without it, every request
 * is rejected with 500 — fail-closed by design.
 */
@Controller('webhooks/clerk')
export class ClerkWebhookController {
  private readonly logger = new Logger(ClerkWebhookController.name);

  constructor(
    private readonly users:     UserService,
    private readonly notebooks: NotebookService,
  ) {}

  @Post()
  @HttpCode(200)
  async handle(
    @Req() req: Request,
    @Headers('svix-id')        svixId:        string | undefined,
    @Headers('svix-timestamp') svixTimestamp: string | undefined,
    @Headers('svix-signature') svixSignature: string | undefined,
  ) {
    const secret = process.env['CLERK_WEBHOOK_SECRET'];
    if (!secret) {
      this.logger.error('CLERK_WEBHOOK_SECRET is not set — rejecting webhook');
      throw new UnauthorizedException('webhook-secret-not-configured');
    }
    if (!svixId || !svixTimestamp || !svixSignature) {
      throw new BadRequestException('missing svix headers');
    }

    // rawBody is a Buffer when main.ts has `rawBody: true`
    // and the route is hit before any JSON parse.
    const raw = (req as Request & { rawBody?: Buffer }).rawBody;
    if (!raw) {
      throw new BadRequestException('missing raw body');
    }

    let event: ClerkWebhookEvent;
    try {
      const wh = new Webhook(secret);
      event = wh.verify(raw.toString('utf8'), {
        'svix-id':        svixId,
        'svix-timestamp': svixTimestamp,
        'svix-signature': svixSignature,
      }) as ClerkWebhookEvent;
    } catch (e) {
      if (e instanceof WebhookVerificationError) {
        this.logger.warn(`Invalid signature: ${e.message}`);
        throw new UnauthorizedException('invalid-signature');
      }
      throw e;
    }

    this.logger.log(`Received Clerk event: ${event.type}`);

    switch (event.type) {
      case 'user.created':
      case 'user.updated': {
        const data = event.data as ClerkUserData;
        const clerkId = data.id;
        const email   = primaryEmail(data);
        const user    = await this.users.ensureUserExists(clerkId, email);
        // On create, bootstrap Journal + Secret system notebooks immediately
        // so the user has them ready before first /notebooks request.
        // Idempotent — safe to call on update too.
        await this.notebooks.bootstrapSystemNotebooks(user.id);
        return { ok: true };
      }
      case 'user.deleted': {
        const data = event.data as { id?: string };
        if (data.id) await this.users.deleteByClerkId(data.id);
        return { ok: true };
      }
      default:
        // Unsubscribed event types — just ack so Clerk doesn't retry.
        this.logger.log(`Ignoring event type: ${event.type}`);
        return { ok: true };
    }
  }
}

// ─── Clerk event payload shapes (only fields we read) ───────────────────────
//
// Clerk sends snake_case JSON. We only type the bits we need; svix's verify()
// returns the raw payload as `unknown`, so the casts in switch arms are the
// only places we trust the shape.

interface ClerkUserData {
  id: string;
  email_addresses?: Array<{
    id:           string;
    email_address: string;
  }>;
  primary_email_address_id?: string | null;
}

interface ClerkWebhookEvent {
  type: string;
  data: unknown;
}

function primaryEmail(data: ClerkUserData): string | undefined {
  const list = data.email_addresses ?? [];
  if (list.length === 0) return undefined;
  const primaryId = data.primary_email_address_id;
  const primary = primaryId ? list.find((e) => e.id === primaryId) : undefined;
  return (primary ?? list[0]).email_address;
}
