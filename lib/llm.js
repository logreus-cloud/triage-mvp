import { playback, genericResponse } from './fixtures.js';

export const DEMO_MODE = process.env.DEMO_MODE !== '0';

const SYSTEM = [
  'Ты — медицинский ассистент, который оформляет обращение пациента для врача.',
  'Тебе дают ответы пациента на анкету. Верни СТРОГО один JSON-объект без markdown-обёртки:',
  '{"complaints": "<краткая формулировка жалоб>", "draft": "<черновик записи в свободной форме, 3-5 предложений, сухим медицинским языком>"}',
  'Не ставь диагноз и не назначай лечение. Не выдумывай симптомы, которых пациент не называл.',
].join('\n');

function extractJson(text) {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end <= start) throw new Error('в ответе модели нет JSON');
  return JSON.parse(text.slice(start, end + 1));
}

// Возвращает { complaints, draft, source }.
export async function summarize(answers) {
  if (DEMO_MODE) {
    return { ...playback(answers), source: 'demo' };
  }

  const { default: Anthropic } = await import('@anthropic-ai/sdk');
  const client = new Anthropic();

  const response = await client.messages.create({
    model: 'claude-opus-5',
    max_tokens: 2048,
    thinking: { type: 'adaptive' },
    output_config: { effort: 'low' },
    system: SYSTEM,
    messages: [
      {
        role: 'user',
        content: Object.entries(answers)
          .map(([key, value]) => `${key}: ${value}`)
          .join('\n'),
      },
    ],
  });

  if (response.stop_reason === 'refusal') {
    return { ...genericResponse(answers), source: 'fallback:refusal' };
  }

  const text = response.content
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('');

  try {
    const parsed = extractJson(text);
    return {
      complaints: String(parsed.complaints || answers.complaint || ''),
      draft: String(parsed.draft || ''),
      source: 'api',
    };
  } catch {
    return { ...genericResponse(answers), source: 'fallback:parse' };
  }
}
