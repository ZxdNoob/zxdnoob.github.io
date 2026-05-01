import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  NotFoundException,
  Param,
  Post,
  Put,
} from '@nestjs/common';
import { AgentSessionsService } from './agent-sessions.service';

function parseUserId(raw: string | undefined): string {
  const v = (raw ?? '').trim();
  if (!v) throw new BadRequestException('Missing X-Agent-User header.');
  if (v.length > 64) throw new BadRequestException('X-Agent-User too long.');
  if (!/^[a-zA-Z0-9_-]+$/.test(v))
    throw new BadRequestException('X-Agent-User invalid.');
  return v;
}

function safeMessages(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function safeTitle(value: unknown): string {
  const t = typeof value === 'string' ? value.trim() : '';
  return t.length > 0 ? t.slice(0, 191) : '新会话';
}

@Controller('agent/sessions')
export class AgentSessionsController {
  constructor(private readonly service: AgentSessionsService) {}

  @Get()
  async list(@Headers('x-agent-user') userHeader?: string) {
    const userId = parseUserId(userHeader);
    const sessions = await this.service.listByUserId(userId);
    return {
      userId,
      sessions: sessions.map((s) => ({
        id: s.id,
        title: s.title,
        createdAt: s.createdAt.toISOString(),
        updatedAt: s.updatedAt.toISOString(),
      })),
    };
  }

  @Post()
  async create(
    @Headers('x-agent-user') userHeader?: string,
    @Body()
    body?: {
      title?: string;
      messages?: unknown[];
    },
  ) {
    const userId = parseUserId(userHeader);
    const title = safeTitle(body?.title);
    const messages = safeMessages(body?.messages);
    const created = await this.service.create({
      userId,
      title,
      messagesJson: JSON.stringify(messages),
    });
    return {
      userId,
      id: created.id,
      title: created.title,
      messages,
      createdAt: created.createdAt.toISOString(),
      updatedAt: created.updatedAt.toISOString(),
    };
  }

  @Get(':id')
  async get(
    @Headers('x-agent-user') userHeader?: string,
    @Param('id') id?: string,
  ) {
    const userId = parseUserId(userHeader);
    const sid = (id ?? '').trim();
    if (!sid) throw new BadRequestException('Missing session id.');
    const session = await this.service.getById(userId, sid);
    if (!session) throw new NotFoundException('Session not found.');
    return {
      userId,
      id: session.id,
      title: session.title,
      messages: safeMessages(
        (() => {
          try {
            return JSON.parse(session.messagesJson) as unknown;
          } catch {
            return [];
          }
        })(),
      ),
      createdAt: session.createdAt.toISOString(),
      updatedAt: session.updatedAt.toISOString(),
    };
  }

  @Put(':id')
  async update(
    @Headers('x-agent-user') userHeader?: string,
    @Param('id') id?: string,
    @Body()
    body?: {
      title?: string;
      messages?: unknown[];
    },
  ) {
    const userId = parseUserId(userHeader);
    const sid = (id ?? '').trim();
    if (!sid) throw new BadRequestException('Missing session id.');
    const patch: { title?: string; messagesJson?: string } = {};
    if (body && typeof body.title === 'string')
      patch.title = safeTitle(body.title);
    if (body && 'messages' in body)
      patch.messagesJson = JSON.stringify(safeMessages(body.messages));
    const next = await this.service.update(userId, sid, patch);
    if (!next) throw new NotFoundException('Session not found.');
    return {
      userId,
      id: next.id,
      title: next.title,
      messages: safeMessages(body?.messages),
      createdAt: next.createdAt.toISOString(),
      updatedAt: next.updatedAt.toISOString(),
    };
  }

  @Delete(':id')
  async remove(
    @Headers('x-agent-user') userHeader?: string,
    @Param('id') id?: string,
  ) {
    const userId = parseUserId(userHeader);
    const sid = (id ?? '').trim();
    if (!sid) throw new BadRequestException('Missing session id.');
    const ok = await this.service.delete(userId, sid);
    if (!ok) throw new NotFoundException('Session not found.');
    return { userId, id: sid, ok: true };
  }
}
