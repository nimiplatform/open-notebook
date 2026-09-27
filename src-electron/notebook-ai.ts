import type { NimiElectronAppBusinessServices } from '@nimiplatform/kit/shell/electron/main';
import type { NimiLocalAppScenarioJobSpec, NimiLocalAppTextTurnInput } from '@nimiplatform/sdk/app';

// These are private callbacks of the supervised notebook worker. There is no
// network listener, arbitrary SDK method selector, credential or model override.
export async function notebookAI(
  services: NimiElectronAppBusinessServices,
  operation: string,
  value: unknown,
  signal: AbortSignal,
  delta: (text: string) => void,
): Promise<unknown> {
  signal.throwIfAborted();
  const data = value as Record<string, unknown>;
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('Invalid notebook callback');
  const fields: Record<string, readonly string[]> = {
    'research.complete': ['messages', 'maxTokens', 'temperature', 'json'],
    'sources.embed': ['texts'],
    'sources.transcribe': ['audio', 'language'],
    'podcast.speak': ['text', 'voice', 'language'],
  };
  const allowed = fields[operation];
  if (!allowed || Object.keys(data).some(key => !allowed.includes(key))) throw new Error('Invalid notebook callback fields');
  if (operation === 'research.complete') {
    if (!Array.isArray(data.messages) || data.messages.length > 500) throw new Error('Invalid research messages');
    const messages = data.messages as NimiLocalAppTextTurnInput['messages'];
    const input: NimiLocalAppTextTurnInput = {
      messages,
      ...(data.maxTokens == null ? {} : { maxTokens: Number(data.maxTokens) }),
      ...(data.temperature == null ? {} : { temperature: Number(data.temperature) }),
      ...(data.json === true ? { responseFormat: { type: 'json-object' as const } } : {}),
    };
    const stream = await services.ai.text.streamTurn(input);
    const cancel = () => { void stream.cancel().catch(() => {}); };
    signal.addEventListener('abort', cancel, { once: true });
    let text = '';
    const items = new Map<number, Record<string, unknown>>();
    let completed = false;
    try {
      signal.throwIfAborted();
      for await (const event of stream) {
        signal.throwIfAborted();
        if (event.type === 'delta') {
          text += event.text; delta(event.text);
          const previous = items.get(event.itemIndex);
          items.set(event.itemIndex, { type: 'text', text: String(previous?.text || '') + event.text });
        }
        if (event.type === 'reasoning-continuity') items.set(event.itemIndex, { type: 'reasoning-continuity', carrier: event.carrier });
        if (event.type === 'failed') throw new Error(`${event.reasonCode}: ${event.actionHint}`);
        if (event.type === 'tool-call') throw new Error('Notebook research did not request model tools');
        if (event.type === 'completed') {
          if (event.finishReason !== 'stop') throw new Error(`Research response unfinished: ${event.finishReason}`);
          completed = true;
        }
      }
      if (!completed || !text.trim()) throw new Error('Research response has no completed text');
      return { text, outputItems: [...items].sort(([a], [b]) => a - b).map(([, item]) => item) };
    } finally { signal.removeEventListener('abort', cancel); await stream.cancel().catch(() => {}); }
  }
  if (operation === 'sources.embed') {
    if (!Array.isArray(data.texts) || data.texts.length > 50 || data.texts.some(t => typeof t !== 'string')) throw new Error('Invalid source embedding batch');
    const result = await services.ai.scenario.execute({ type: 'text-embed', inputs: data.texts }, { signal });
    signal.throwIfAborted();
    if (result.output.type !== 'text-embed' || !result.output.spaceId || result.output.vectors.length !== data.texts.length) throw new Error('Invalid embedding result');
    return { vectors: result.output.vectors, spaceId: result.output.spaceId };
  }
  let spec: NimiLocalAppScenarioJobSpec;
  if (operation === 'sources.transcribe') {
    if (typeof data.audio !== 'string' || data.audio.length > 44_800_000) throw new Error('Invalid transcription input');
    const bytes = Buffer.from(data.audio, 'base64');
    if (!bytes.length || bytes.length > 32 * 1024 * 1024) throw new Error('Transcription clip exceeds 32 MiB');
    spec = { type: 'speech-transcribe', mimeType: 'audio/wav', language: String(data.language || ''), prompt: '', responseFormat: '', audioSource: { type: 'bytes', bytes: [...bytes] } };
  } else if (operation === 'podcast.speak') {
    if (typeof data.text !== 'string' || !data.text.trim() || data.text.length > 32_000) throw new Error('Invalid podcast dialogue');
    // Use the configured model's output format. Notebook decodes the returned
    // artifact and owns the final MP3 export after assembling all speakers.
    spec = { type: 'speech-synthesize', text: data.text, language: String(data.language || ''), audioFormat: '', emotion: '', voiceRef: data.voice ? { type: 'preset', id: String(data.voice) } : null, timingMode: 'none', voiceRenderHints: null };
  } else throw new Error('Unknown notebook business callback');
  const submitted = await services.ai.scenarioJobs.submit(spec);
  const jobId = submitted.job.jobId;
  const cancel = () => { void services.ai.scenarioJobs.cancel(jobId, 'Notebook work canceled').catch(() => {}); };
  signal.addEventListener('abort', cancel, { once: true });
  try {
    signal.throwIfAborted();
    const events = await services.ai.scenarioJobs.subscribe(jobId);
    try {
      for await (const event of events) {
        signal.throwIfAborted();
        if (['failed', 'canceled', 'timeout'].includes(event.job.status)) throw new Error(`Notebook audio failed: ${event.job.reasonCode}`);
        if (event.job.status === 'completed') {
          const result = await services.ai.scenarioJobs.get(jobId);
          signal.throwIfAborted();
          if (operation === 'sources.transcribe') {
            const transcript = result.job.transcription;
            if (transcript) return { text: transcript.text, status: transcript.status };
            // Text-only recognition routes also satisfy Notebook's extraction
            // workflow; word alignment is not required for a research source.
            if (result.job.transcriptionText.trim()) return { text: result.job.transcriptionText, status: 'transcribed' };
            throw new Error('No transcription result');
          }
          const artifact = result.job.artifacts.find(a => a.mimeType.startsWith('audio/'));
          if (!artifact) throw new Error('Podcast synthesis returned no audio');
          const audio = await services.ai.artifacts.read(artifact.artifactId);
          signal.throwIfAborted();
          return { audio: Buffer.from(audio.bytes).toString('base64'), mimeType: audio.mimeType };
        }
      }
      throw new Error('Audio job ended without a terminal result');
    } finally { await events.cancel().catch(() => {}); }
  } catch (error) { cancel(); throw error; }
  finally { signal.removeEventListener('abort', cancel); }
}
