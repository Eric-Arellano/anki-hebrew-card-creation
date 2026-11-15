import type Anthropic from '@anthropic-ai/sdk';
import { vi } from 'vitest';
import type { ClaudeMessages } from '#lib/server/ai/client.ts';

/** A `ClaudeMessages` that answers every call with `message`, and records each call. */
export function fakeClaude(message: unknown) {
  return {
    create: vi.fn<ClaudeMessages['create']>(async () => message as Anthropic.Beta.BetaMessage),
  };
}

/** A `ClaudeMessages` whose every call throws `error`, as the SDK does when a request fails. */
export function failingClaude(error: unknown): ClaudeMessages {
  return {
    create: vi.fn(async () => {
      throw error;
    }),
  };
}

/** The parts of a reply that our code reads. */
export function claudeMessage(
  stopReason: Anthropic.Beta.BetaStopReason,
  content: Anthropic.Beta.BetaContentBlock[],
): Anthropic.Beta.BetaMessage {
  return { stop_reason: stopReason, content } as Anthropic.Beta.BetaMessage;
}

export function textBlock(text: string): Anthropic.Beta.BetaContentBlock {
  return { type: 'text', text, citations: null };
}
