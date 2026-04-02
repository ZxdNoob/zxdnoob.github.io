import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChangelogReleaseEntity } from '../database/changelog-release.entity';
import { ChangelogController } from './changelog.controller';
import { ChangelogSeedService } from './changelog-seed.service';
import { ChangelogService } from './changelog.service';

/**
 * 版本历史模块：REST 只读列表、启动时种子/去重同步（见 `ChangelogSeedService`）。
 */
@Module({
  imports: [TypeOrmModule.forFeature([ChangelogReleaseEntity])],
  controllers: [ChangelogController],
  providers: [ChangelogService, ChangelogSeedService],
  exports: [ChangelogService],
})
export class ChangelogModule {}
