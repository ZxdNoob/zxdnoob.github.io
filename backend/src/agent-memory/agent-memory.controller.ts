import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  Put,
} from '@nestjs/common';
import { AgentMemoryService } from './agent-memory.service';

type MemoryResponse = {
  userId: string;
  messages: unknown[];
  updatedAt: string;
};

function parseUserId(raw: string | undefined): string {
  const v = (raw ?? '').trim();
  if (!v) throw new BadRequestException('Missing X-Agent-User header.');
  if (v.length > 64) throw new BadRequestException('X-Agent-User too long.');
  if (!/^[a-zA-Z0-9_-]+$/.test(v))
    throw new BadRequestException('X-Agent-User invalid.');
  return v;
}

function safeParseMessages(json: string): unknown[] {
  try {
    const v = JSON.parse(json) as unknown;
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

@Controller('agent/memory')
export class AgentMemoryController {
  constructor(private readonly service: AgentMemoryService) {}

  @Get()
  async get(
    @Headers('x-agent-user') userHeader?: string,
  ): Promise<MemoryResponse> {
    const userId = parseUserId(userHeader);
    const row = await this.service.getByUserId(userId);
    if (!row) {
      return { userId, messages: [], updatedAt: new Date(0).toISOString() };
    }
    return {
      userId,
      messages: safeParseMessages(row.messagesJson),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  @Put()
  async put(
    @Headers('x-agent-user') userHeader: string | undefined,
    @Body()
    body: {
      messages?: unknown[];
    },
  ): Promise<MemoryResponse> {
    const userId = parseUserId(userHeader);
    const messages = Array.isArray(body?.messages) ? body.messages : [];
    const messagesJson = JSON.stringify(messages);
    const row = await this.service.upsert(userId, messagesJson);
    return {
      userId,
      messages,
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}
