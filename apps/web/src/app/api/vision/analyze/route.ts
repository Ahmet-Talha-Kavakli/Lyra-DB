import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

const SYSTEM_PROMPT =
  'You are a clinical observer for a therapy session. Analyze this webcam image and respond in 2-3 short sentences covering ALL of the following in order of priority:\n\n' +
  '1. HANDS & OBJECTS FIRST: Describe exactly what the person is holding or touching. Be specific — e.g. "holding a white ceramic mug", "touching their face", "hands on keyboard", "holding a phone". If hands are not visible, say so.\n' +
  '2. ENVIRONMENT: One-sentence description of the visible setting (room type, lighting, background).\n' +
  '3. EMOTIONAL STATE: Visible emotional cues — facial expression, posture, eye contact.\n' +
  '4. SAFETY FLAG: If you see any of these, write "DANGEROUS OBJECT DETECTED: [exact description]" — knives, scissors, blades, medications/pill bottles, weapons, alcohol bottles, or any item that could be used for self-harm.\n\n' +
  'Be specific and factual. Do not infer or diagnose. If image is too dark/blurry or no person is visible, respond with "No clear visual context available."';

interface OpenAIResponse {
  choices: Array<{ message: { content: string | null } }>;
}

/**
 * POST /api/vision/analyze
 *
 * Body: { imageDataUrl: string }  — base64 data URL from webcam canvas snapshot
 * Returns: { visionContext: string | null }
 *
 * Called every 30 s from useVisionCapture. The result is injected into the
 * next session:message payload as visionContext.
 */
export async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let imageDataUrl: string;
  try {
    const body = await request.json() as { imageDataUrl?: unknown };
    if (typeof body.imageDataUrl !== 'string' || !body.imageDataUrl.startsWith('data:image/')) {
      return NextResponse.json({ error: 'Invalid imageDataUrl' }, { status: 400 });
    }
    imageDataUrl = body.imageDataUrl;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const apiKey = process.env['OPENAI_API_KEY'];
  if (!apiKey) {
    return NextResponse.json({ visionContext: null });
  }

  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        max_tokens: 200,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          {
            role: 'user',
            content: [
              {
                type: 'image_url',
                image_url: { url: imageDataUrl, detail: 'auto' },
              },
            ],
          },
        ],
      }),
    });

    if (!res.ok) {
      console.error('[vision/analyze] OpenAI HTTP', res.status);
      return NextResponse.json({ visionContext: null });
    }

    const data = await res.json() as OpenAIResponse;
    const visionContext = data.choices[0]?.message?.content?.trim()
      ?? 'No clear visual context available.';

    return NextResponse.json({ visionContext });
  } catch (err) {
    console.error('[vision/analyze] error', err);
    return NextResponse.json({ visionContext: null });
  }
}
