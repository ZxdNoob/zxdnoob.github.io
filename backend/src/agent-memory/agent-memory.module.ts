import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AgentMemoryController } from './agent-memory.controller';
import { AgentMemoryService } from './agent-memory.service';
import { AgentMemoryEntity } from '../database/agent-memory.entity';

@Module({
  imports: [TypeOrmModule.forFeature([AgentMemoryEntity])],
  controllers: [AgentMemoryController],
  providers: [AgentMemoryService],
})
export class AgentMemoryModule {}
