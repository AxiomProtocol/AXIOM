// TypeScript type definitions for API responses

// Enum for confidence scores
export enum ConfidenceScore {
    LOW = 'low',
    MEDIUM = 'medium',
    HIGH = 'high'
}

// Type representing a successful API response
export interface ApiResponse<T> {
    data: T;
    meta: ApiMeta;
}

// Type representing metadata for API responses
export interface ApiMeta {
    totalCount: number;
    currentPage: number;
    totalPages: number;
}

// Type representing an API error response
export interface ApiError {
    error: string;
    message: string;
    code: string;
}

// Source type constants
export const SOURCE_TYPE_A = 'sourceTypeA';
export const SOURCE_TYPE_B = 'sourceTypeB';
export const SOURCE_TYPE_C = 'sourceTypeC';
