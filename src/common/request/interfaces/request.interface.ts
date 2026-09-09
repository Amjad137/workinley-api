import { Request } from 'express';

/** Express Request augmented with the extracted URL version (set by AppUrlVersionMiddleware). */
export interface AppVersionRequest extends Request {
    _version?: string;
}
