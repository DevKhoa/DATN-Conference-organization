export interface Response<T> {
  flag: boolean; // Two values: true means success, false means not success
  code: number; // Status code
  message: string; // Message
  data: T; // The response payload
}

export interface Meta {
  title: string;
}

export interface PaginatedResponse<T> {
  content: T[];
  page: {
    size: number;
    number: number;
    totalElements: number;
    totalPages: number;
  };
}

export interface DataTimestamp {
  createdAt: string;
  updatedAt: string;
}
