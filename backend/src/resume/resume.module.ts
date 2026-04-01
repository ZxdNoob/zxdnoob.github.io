import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ResumeEntity } from '../database/resume.entity';
import { ResumeController } from './resume.controller';
import { ResumeSeedService } from './resume-seed.service';
import { ResumeService } from './resume.service';

@Module({
  imports: [TypeOrmModule.forFeature([ResumeEntity])],
  controllers: [ResumeController],
  providers: [ResumeService, ResumeSeedService],
  exports: [ResumeService],
})
export class ResumeModule {}
