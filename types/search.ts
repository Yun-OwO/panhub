/**
 * Client/Server 共享的搜索类型
 * Client: composables/useSearch.ts, utils/*.ts
 * Server: server/core/types/models.ts 保留 server 专用类型
 */

export interface MergedLink {
  url: string;
  password: string;
  note: string;
  datetime: string;
  source?: string;
  images?: string[];
}

export type MergedLinks = Record<string, MergedLink[]>;

export interface SearchResult {
  message_id: string;
  unique_id: string;
  channel: string;
  datetime: string;
  title: string;
  content: string;
  links: Link[];
  tags?: string[];
  images?: string[];
}

export interface Link {
  type: string;
  url: string;
  password: string;
}

export interface SearchResponse {
  total: number;
  results?: SearchResult[];
  merged_by_type?: MergedLinks;
}

export interface GenericResponse<T> {
  code: number;
  message: string;
  data?: T;
}
