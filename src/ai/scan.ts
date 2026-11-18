/**
 * Photo → macros with Claude vision, called straight from the browser with the
 * user's own key (there is no backend). Loaded on demand so the SDK and zod only
 * download the first time someone scans.
 */
import Anthropic from '@anthropic-ai/sdk';
import { betaStandardSchemaOutputFormat } from '@anthropic-ai/sdk/helpers/beta/standard-schema';
import { z } from 'zod';

const ScanItem = z.object({
  name: z.string(),
  serving: z.string(),
  calories: z.number(),
  protein_g: z.number(),
  carbs_g: z.number(),
  fat_g: z.number(),
});

const ScanResultSchema = z.object({
  kind: z.enum(['nutrition_label', 'food_photo', 'not_food']),
  items: z.array(ScanItem),
  servings_per_container: z.number().nullable(),
  confidence: z.enum(['high', 'medium', 'low']),
  note: z.string(),
});

export type ScanResult = z.infer<typeof ScanResultSchema>;
export type ScanItem = z.infer<typeof ScanItem>;

const SYSTEM = `You read food photos for a calorie and macro tracking app used by someone bulking (building muscle).

Decide which kind of photo this is:
- nutrition_label: a printed Nutrition Facts (or similar) panel. Return exactly one item: the product's name (from the packaging if visible, otherwise a short description such as "Protein bar"), the label's serving size as printed, and the per-serving calories, protein, total carbohydrate and total fat exactly as printed. Set servings_per_container from the label, or null if it isn't shown.
- food_photo: a meal, plate, snack or drink. Return one item per distinct food you can see, each with a realistic portion estimate in the serving field (e.g. "≈ 6 oz", "1 cup", "2 slices") and estimated calories and macros for that portion. Set servings_per_container to null.
- not_food: anything else. Return an empty items list and say what you see in note.

Numbers are grams for macros and kcal for calories. Use 0, not null, when a value is truly zero. Keep names short and title-free (e.g. "Grilled chicken breast", not "A delicious grilled chicken breast").
confidence: high for a clearly readable label, medium for an identifiable meal, low when the photo is blurry, cropped or the portion is hard to judge.
note: one short sentence for the user, such as an assumption you made about portion size, or why the photo couldn't be read. Empty string if there's nothing worth saying.`;

export class ScanError extends Error {
  constructor(
    message: string,
    readonly kind: 'no_key' | 'bad_key' | 'offline' | 'rate_limit' | 'refused' | 'unreadable' | 'other',
  ) {
    super(message);
  }
}

export async function scanFood(jpegBase64: string, apiKey: string, signal?: AbortSignal): Promise<ScanResult> {
  if (!apiKey) throw new ScanError('Add your Anthropic API key in Settings to scan food.', 'no_key');
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    throw new ScanError('You’re offline. Scanning needs an internet connection — you can still add food by hand.', 'offline');
  }

  // Direct browser use is intentional: the key is the user's own and never leaves this device
  // except to api.anthropic.com.
  const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true, timeout: 90_000, maxRetries: 1 });

  try {
    const response = await client.beta.messages.parse(
      {
        model: 'claude-opus-5-5',
        max_tokens: 4000,
        betas: ['server-side-fallback-2026-07-01'],
        fallbacks: 'default',
        output_config: { effort: 'medium', format: betaStandardSchemaOutputFormat(ScanResultSchema) },
        system: SYSTEM,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: jpegBase64 } },
              { type: 'text', text: 'Read this photo and return the foods and macros.' },
            ],
          },
        ],
      },
      { signal },
    );

    if (response.stop_reason === 'refusal') {
      throw new ScanError('Claude couldn’t analyze this photo. Try another picture, or add the food by hand.', 'refused');
    }
    const result = response.parsed_output;
    if (!result) {
      throw new ScanError(
        response.stop_reason === 'max_tokens' ? 'The answer was cut off. Try a photo with fewer foods in it.' : 'Couldn’t read the result. Please try again.',
        'unreadable',
      );
    }
    return result;
  } catch (e) {
    if (e instanceof ScanError) throw e;
    if (e instanceof Anthropic.AuthenticationError || e instanceof Anthropic.PermissionDeniedError) {
      throw new ScanError('Your API key was rejected. Check it in Settings.', 'bad_key');
    }
    if (e instanceof Anthropic.RateLimitError) {
      throw new ScanError('Too many scans right now (or your API credit ran out). Wait a moment and try again.', 'rate_limit');
    }
    if (e instanceof Anthropic.APIUserAbortError) throw e;
    if (e instanceof Anthropic.APIConnectionError) {
      throw new ScanError('Couldn’t reach Claude. Check your connection and try again.', 'offline');
    }
    if (e instanceof Anthropic.BadRequestError) {
      throw new ScanError(`Claude couldn’t use that photo: ${e.message}`, 'other');
    }
    if (e instanceof Anthropic.APIError) {
      throw new ScanError(`Scanning failed (${e.status ?? 'network'}). Please try again.`, 'other');
    }
    throw new ScanError(e instanceof Error ? e.message : 'Scanning failed. Please try again.', 'other');
  }
}

/** Free call used by the Settings "Test key" button (listing models costs nothing). */
export async function testApiKey(apiKey: string): Promise<{ ok: true } | { ok: false; message: string }> {
  const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true, timeout: 20_000, maxRetries: 0 });
  try {
    await client.models.retrieve('claude-opus-5-5');
    return { ok: true };
  } catch (e) {
    if (e instanceof Anthropic.AuthenticationError) return { ok: false, message: 'That key was rejected.' };
    if (e instanceof Anthropic.PermissionDeniedError) return { ok: false, message: 'This key doesn’t have access to the model.' };
    if (e instanceof Anthropic.APIConnectionError) return { ok: false, message: 'Couldn’t reach Anthropic. Check your connection.' };
    if (e instanceof Anthropic.APIError) return { ok: false, message: `Check failed (${e.status}).` };
    return { ok: false, message: 'Check failed.' };
  }
}
