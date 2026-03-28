import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChangelogReleaseEntity } from '../database/changelog-release.entity';
import { ChangelogController } from './changelog.controller';
import { ChangelogSeedService } from './changelog-seed.service';
import { ChangelogService } from './changelog.service';

@Module({
  imports: [TypeOrmModule.forFeature([ChangelogReleaseEntity])],
  controllers: [ChangelogController],
  providers: [ChangelogService, ChangelogSeedService],
  exports: [ChangelogService],
})
export class ChangelogModule {}
