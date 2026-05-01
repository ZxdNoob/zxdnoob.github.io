import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AgentSessionEntity } from '../database/agent-session.entity';
import { AgentSessionsController } from './agent-sessions.controller';
import { AgentSessionsService } from './agent-sessions.service';

@Module({
  imports: [TypeOrmModule.forFeature([AgentSessionEntity])],
  controllers: [AgentSessionsController],
  providers: [AgentSessionsService],
})
export class AgentSessionsModule {}
