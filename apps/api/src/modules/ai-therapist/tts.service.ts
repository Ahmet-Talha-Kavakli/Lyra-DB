import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

/**
 * Converts AI text responses to speech using OpenAI TTS (tts-1).
 *
 * Returns a base64-encoded MP3 data URI that the frontend can pass directly
 * to an <audio> element (or Web Audio API). For MVP we skip R2 upload and
 * send the audio inline — saves a round-trip and avoids R2 config overhead.
 *
 * When you're ready to switch to R2:
 *   1. Add @aws-sdk/client-s3 + @aws-sdk/s3-request-presigner
 *   2. Upload buffer to R2 with PutObjectCommand
 *   3. Return a presigned GetObject URL instead of data URI
 */
@Injectable()
export class TtsService {
  private readonly logger = new Logger(TtsService.name);
  private readonly openai: OpenAI;

  constructor(private readonly config: ConfigService) {
    this.openai = new OpenAI({
      apiKey: this.config.getOrThrow<string>('OPENAI_API_KEY'),
    });
  }

  /**
   * Synthesises speech for `text` and returns a base64 data URI.
   *
   * @param text — the AI response to speak (stripped of markdown symbols)
   * @returns `data:audio/mpeg;base64,<...>` or null on failure
   */
  async synthesise(text: string): Promise<string | null> {
    const cleaned = text
      .replace(/[*_~`#>]/g, '')   // strip markdown
      .replace(/\n+/g, ' ')
      .trim();

    if (!cleaned) return null;

    // Truncate to TTS character limit — split at sentence boundary if needed
    const input = cleaned.length > 4096 ? cleaned.slice(0, 4096) : cleaned;

    try {
      const response = await this.openai.audio.speech.create({
        model: 'tts-1-hd',
        voice: 'shimmer',   // natural female voice, handles Turkish well
        input,
        response_format: 'mp3',
      });

      const arrayBuffer = await response.arrayBuffer();
      const base64 = Buffer.from(arrayBuffer).toString('base64');
      return `data:audio/mpeg;base64,${base64}`;
    } catch (err) {
      this.logger.error('TTS synthesis failed', err);
      return null;
    }
  }
}
