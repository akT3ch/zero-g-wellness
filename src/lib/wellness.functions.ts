import { createServerFn } from '@tanstack/react-start';
import { setResponseHeader } from '@tanstack/react-start/server';
import { generateResponse, GatewayError } from '@lovable.dev/ai-gateway';
import { wellnessInputSchema, guidanceSchema, emergencyGuidance, wellnessInstructions, type Guidance } from './wellness';

type WellnessResult = { guidance: Guidance; error: null } | { guidance: null; error: string };

// Public, stateless request: only the data explicitly supplied by the caller is processed.
// Start's CSRF middleware protects same-origin calls; no saved user data is read or written.
export const getWellnessGuidance = createServerFn({ method: 'POST' })
  .inputValidator((input: unknown) => wellnessInputSchema.parse(input))
  .handler(async ({ data }): Promise<WellnessResult> => {
    setResponseHeader('Cache-Control', 'no-store');
    if (data.emergency) return { guidance: emergencyGuidance, error: null };
    try {
      const response = await generateResponse({
        model: 'openai/gpt-6-astra',
        instructions: wellnessInstructions,
        input: [{ role: 'user', content: 'Provide general wellness guidance for this user-supplied information. Return JSON.\n' + JSON.stringify({ symptoms: data.symptoms, mission: data.mission, readings: data.readings, today: new Date().toISOString().slice(0, 10) }) }],
        reasoning: { effort: 'low' },
        text: { format: { type: 'json_schema', name: 'wellness_guidance', strict: true, schema: {
          type: 'object', additionalProperties: false,
          properties: {
            urgency: { type: 'string', enum: ['emergency', 'prompt', 'routine'] },
            summary: { type: 'string' },
            wellness: { type: 'array', items: { type: 'string' } },
            seekCare: { type: 'array', items: { type: 'string' } },
            questions: { type: 'array', items: { type: 'string' } },
          }, required: ['urgency', 'summary', 'wellness', 'seekCare', 'questions'],
        } } },
      });
      const contents = response.output.flatMap(item => item.type === 'message' ? item.content : []);
      if (contents.some(content => content.type === 'refusal')) return { guidance: null, error: 'The AI could not provide guidance for this request. Contact a healthcare professional for help.' };
      if (response.status !== 'completed') return { guidance: null, error: 'Guidance was not completed. Your input is unchanged. Contact a healthcare professional if symptoms concern you.' };
      const text = contents.filter(content => content.type === 'output_text').map(content => content.text).join('');
      return { guidance: guidanceSchema.parse(JSON.parse(text)), error: null };
    } catch (error) {
      if (error instanceof GatewayError) {
        // Never log symptom text or readings. Correlation IDs are safe operational metadata.
        console.error('Wellness Gateway request failed', { code: error.code, ids: error.ids, outcome: error.outcome });
        const message = error.httpStatus === 402 ? 'AI guidance is unavailable because the app’s AI credits need replenishing.' :
          error.httpStatus === 429 ? 'AI guidance is busy. Please wait before requesting it again.' :
          error.httpStatus === 403 ? 'AI guidance is unavailable under the current workspace settings.' :
          'The guidance request could not be completed. It may have started; it will not be retried automatically.';
        return { guidance: null, error: message + ' Your input is unchanged. Seek professional care if symptoms concern you.' };
      }
      return { guidance: null, error: 'The AI response could not be read safely. Your input is unchanged. Seek professional care if symptoms concern you.' };
    }
  });