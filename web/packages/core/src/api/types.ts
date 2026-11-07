/** Shapes shared by every API resource (mirror libs/common in nest-microservice). */

/** A page of a list: GET /api/<resource>?page=&limit= */
export interface Paginated<T> {
  data: T[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}
