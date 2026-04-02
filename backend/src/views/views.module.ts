import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PageViewCountEntity } from '../database/page-view-count.entity';
import { PageViewEntity } from '../database/page-view.entity';
import { SiteViewCountEntity } from '../database/site-view-count.entity';
import { ViewsController } from './views.controller';
import { ViewsService } from './views.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PageViewEntity,
      PageViewCountEntity,
      SiteViewCountEntity,
    ]),
  ],
  controllers: [ViewsController],
  providers: [ViewsService],
  exports: [ViewsService],
})
export class ViewsModule {}
