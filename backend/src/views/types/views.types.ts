export interface ViewCountDto {
  slug: string;
  views: number;
}

export interface RecordViewResult {
  slug: string;
  views: number;
  /** true = 本次是一次新的有效浏览（指纹去重后首次） */
  isNew: boolean;
}

export interface TotalViewsDto {
  totalViews: number;
}

export interface SiteTotalViewsDto {
  siteTotalViews: number;
}
