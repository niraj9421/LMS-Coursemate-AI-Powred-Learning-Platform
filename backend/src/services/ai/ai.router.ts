import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';
import { env } from '../../config/env';
import { logger } from '../../utils/logger';
import { ApiError } from '../../utils/apiError';

// ─── Clients ──────────────────────────────────────────────────────────────────
const gemini = new GoogleGenerativeAI(env.GEMINI_API_KEY);
const openai = env.OPENAI_API_KEY ? new OpenAI({ apiKey: env.OPENAI_API_KEY }) : null;

export interface AIGenerateOptions {
  maxTokens?: number;
  temperature?: number;
  jsonMode?: boolean;
}

/**
 * Task 12.1 — Unified AI router with Gemini primary, OpenAI fallback.
 * Returns 503 with Retry-After header when both providers fail.
 */
export const AIRouter = {
  async generate(prompt: string, options: AIGenerateOptions = {}): Promise<string> {
    const { maxTokens = 2048, temperature = 0.7 } = options;

    // ── Try Gemini first — try multiple models in case one hits quota/503 ────
    const geminiModels = [
      'gemini-2.5-flash',         // primary
      'gemini-flash-lite-latest', // fast fallback
      'gemini-3.1-flash-lite',    // fallback
      'gemini-flash-latest',      // fallback
      'gemini-3.5-flash',         // fallback
      'gemini-2.0-flash',         // sometimes 429
    ];
    for (const modelName of geminiModels) {
      try {
        const model = gemini.getGenerativeModel({
          model: modelName,
          generationConfig: {
            maxOutputTokens: maxTokens,
            temperature,
            ...(options.jsonMode ? { responseMimeType: 'application/json' } : {}),
          },
        });
        const result = await model.generateContent(prompt);
        const text = result.response.text();
        logger.info(`[ai] Gemini (${modelName}) responded successfully.`);
        return text;
      } catch (geminiErr: unknown) {
        const errMsg = geminiErr instanceof Error ? geminiErr.message : String(geminiErr);
        const is429 = errMsg.includes('429') || errMsg.includes('quota');
        const is503 = errMsg.includes('503') || errMsg.includes('Service Unavailable') || errMsg.includes('high demand');
        const is404 = errMsg.includes('404') || errMsg.includes('not found');
        if (is429 || is503 || is404) {
          logger.warn(`[ai] ${modelName}: ${is429 ? 'quota exceeded' : is503 ? 'service unavailable' : 'not found'}, trying next model`);
          continue; // try next model
        }
        logger.warn(`[ai] Gemini (${modelName}) failed: ${errMsg.substring(0, 150)}`);
        break;
      }
    }

    // ── Try OpenAI fallback ───────────────────────────────────────────────────
    if (openai) {
      try {
        const completion = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: maxTokens,
          temperature,
          ...(options.jsonMode ? { response_format: { type: 'json_object' } } : {}),
        });
        const text = completion.choices[0]?.message?.content ?? '';
        logger.info('[ai] OpenAI fallback responded successfully.');
        return text;
      } catch (openaiErr) {
        logger.error('[ai] OpenAI fallback also failed:', openaiErr);
      }
    }

    // ── Both providers failed ─────────────────────────────────────────────────
    const error = new ApiError(503, 'AI service temporarily unavailable. Please try again later.');
    (error as ApiError & { retryAfter?: number }).retryAfter = 60;
    throw error;
  },
};
