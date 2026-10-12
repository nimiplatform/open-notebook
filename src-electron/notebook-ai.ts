import type { NimiElectronAppBusinessServices } from '@nimiplatform/kit/shell/electron/main';
import type { NimiLocalAppScenarioJobSpec, NimiLocalAppTextTurnInput } from '@nimiplatform/sdk/app';
import { createNimiLocalAppRuntimeScenarioJobClient } from '@nimiplatform/sdk/app';
import { observeRuntimeSpeechSynthesize, observeRuntimeSpeechTranscribe } from '@nimiplatform/kit/features/generation/runtime';
function continuityPayload(value: unknown): number[] {
  if (typeof value !== 'string' || !value) throw new Error('Invalid notebook continuity payload');
  const bytes = Buffer.from(value, 'base64');
  if (bytes.toString('base64') !== value) throw new Error('Invalid notebook continuity encoding');
  return Array.from(bytes);
}

// These are private callbacks of the supervised notebook worker. There is no
// network listener, arbitrary SDK method selector, credential or model override.
// @nimi-authority: rule.nimi.sdks.feature-clients.local-app-text-behaviors
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
    'research.complete': ['messages', 'maxTokens', 'temperature', 'responseFormat'],
    'sources.embed': ['texts', 'purpose'],
    'sources.transcribe': ['audio', 'language'],
    'podcast.speak': ['text', 'voice', 'language'],
  };
  const allowed = fields[operation];
  if (!allowed || Object.keys(data).some(key => !allowed.includes(key))) throw new Error('Invalid notebook callback fields');
  if (operation === 'research.complete') {
    if (!Array.isArray(data.messages) || data.messages.length > 500) throw new Error('Invalid research messages');
    const messages = (data.messages as NimiLocalAppTextTurnInput['messages']).map(message => ({ ...message,
      ...(message.turnItems ? { turnItems: message.turnItems.map(item => item.type === 'output' && item.output.type === 'reasoning-continuity'
        ? { ...item, output: { ...item.output, carrier: { ...item.output.carrier,
          payload: continuityPayload(item.output.carrier.payload) } } } : item) } : {}),
    }));
    const input: NimiLocalAppTextTurnInput = { messages,
      ...(data.maxTokens == null ? {} : { maxTokens: Number(data.maxTokens) }),
      ...(data.temperature == null ? {} : { temperature: Number(data.temperature) }),
      ...(data.responseFormat == null ? {} : { responseFormat: data.responseFormat as NimiLocalAppTextTurnInput['responseFormat'] }),
    };
    const result = await services.ai.scenario.execute({ type: 'text-generate', ...input }, { signal });
    signal.throwIfAborted();
    if (result.output.type !== 'text-generate' || result.output.finishReason !== 'stop') throw new Error('Research response did not complete');
    const outputItems = result.output.items;
    if (outputItems.some(item => item.type === 'tool-call')) throw new Error('Notebook research did not request model tools');
    const text = outputItems.filter(item => item.type === 'text').map(item => item.text).join('');
    if (!text.trim()) throw new Error('Research response has no completed text');
    // This workflow uses the formal synchronous model step. Report its final
    // text once; no invented incremental model deltas or mode retry occurs.
    delta(text);
    return { text, outputItems: outputItems.map(item => item.type === 'reasoning-continuity'
      ? { ...item, carrier: { ...item.carrier, payload: Buffer.from(item.carrier.payload).toString('base64') } } : item) };
  }
  if (operation === 'sources.embed') {
    if (!Array.isArray(data.texts) || data.texts.length > 16 || data.texts.some(t => typeof t !== 'string')) throw new Error('Invalid source embedding batch');
    if (data.purpose !== 'retrieval-document' && data.purpose !== 'retrieval-query') throw new Error('Invalid embedding retrieval purpose');
    const result = await services.ai.scenario.execute({ type: 'text-embed', inputs: data.texts, purpose: data.purpose }, { signal });
    signal.throwIfAborted();
    if (result.output.type !== 'text-embed' || !result.output.spaceId || result.output.vectors.length !== data.texts.length) throw new Error('Invalid embedding result');
    return { vectors: result.output.vectors, spaceId: result.output.spaceId };
  }
  let spec: NimiLocalAppScenarioJobSpec;
  if (operation === 'sources.transcribe') {
    if (typeof data.audio !== 'string' || data.audio.length > 44_800_000) throw new Error('Invalid transcription input');
    const bytes = Buffer.from(data.audio, 'base64');
    if (!bytes.length || bytes.length > 32 * 1024 * 1024) throw new Error('Transcription clip exceeds 32 MiB');
    spec = { type: 'speech-transcribe', mimeType: 'audio/wav', language: String(data.language || ''), prompt: '', responseFormat: '', audioSource: { type: 'bytes', bytes } };
  } else if (operation === 'podcast.speak') {
    if (typeof data.text !== 'string' || !data.text.trim() || data.text.length > 32_000) throw new Error('Invalid podcast dialogue');
    // Use the configured model's output format. Notebook decodes the returned
    // artifact and owns the final MP3 export after assembling all speakers.
    spec = { type: 'speech-synthesize', text: data.text, language: String(data.language || ''), audioFormat: '', emotion: '', voiceRef: data.voice ? { type: 'preset', id: String(data.voice) } : null, timingMode: 'none', voiceRenderHints: null };
  } else throw new Error('Unknown notebook business callback');
  const submitted = await services.ai.scenarioJobs.submit(spec);
  const jobId = submitted.job.jobId;
  const observation = {
    runtime: { ai: createNimiLocalAppRuntimeScenarioJobClient(services.ai) },
    jobId,
    signal,
    cancelSignal: signal,
    abortReason: 'Notebook work canceled',
  };
  if (operation === 'sources.transcribe') {
    const result = await observeRuntimeSpeechTranscribe(observation);
    if (!result.ok) throw result.error;
    signal.throwIfAborted();
    const transcript = result.output.transcription;
    return transcript ? { ...transcript } : { text: result.output.text, status: 'transcribed' };
  }
  const result = await observeRuntimeSpeechSynthesize(observation);
  if (!result.ok) throw result.error;
  signal.throwIfAborted();
  const artifact = result.output.artifacts.find(a => a.mimeType.startsWith('audio/'));
  if (!artifact?.artifactId) throw new Error('Podcast synthesis returned no audio');
  const audio = await services.ai.artifacts.read(artifact.artifactId);
  signal.throwIfAborted();
  return { audio: Buffer.from(audio.bytes).toString('base64'), mimeType: audio.mimeType };
}
