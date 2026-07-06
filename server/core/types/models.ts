export interface Link {
  type: string;
  url: string;
  password: string;
}

export interface SearchResult {
  message_id: string;
  unique_id: string;
  channel: string;
  datetime: string; // ISO string
  title: string;
  content: string;
  links: Link[];
  tags?: string[];
  images?: string[];
}

export interface MergedLink {
  url: string;
  password: string;
  note: string;
  datetime: string; // ISO string
  source?: string; // e.g. "tg:channel" or "plugin:name"
  images?: string[];
}

export type MergedLinks = Record<string, MergedLink[]>;

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

export interface SearchRequest {
  kw: string;
  channels?: string[];
  conc?: number;
  refresh?: boolean;
  res?: "all" | "results" | "merge" | "merged_by_type";
  src?: "all" | "tg" | "plugin";
  plugins?: string[];
  ext?: Record<string, any>;
  cloud_types?: string[];
}
