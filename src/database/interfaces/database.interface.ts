export enum ENTITY_SORT {
    ASC = 'asc',
    DESC = 'desc',
}

export enum SORT_BY {
    DATE = 'createdAt',
}

export interface IPaginationMeta {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
}

export interface IPaginationResult<T> {
    data: T[];
    pagination: IPaginationMeta;
}

export interface IPaginationQuery {
    page?: number;
    limit?: number;
    search?: string;
    sortBy?: string;
    sortOrder?: ENTITY_SORT;
    createdFrom?: string | Date;
    createdTo?: string | Date;
    status?: string;
}
