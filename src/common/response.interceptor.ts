import {
    Injectable,
    NestInterceptor,
    ExecutionContext,
    CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { DarkSwapResponse } from './response.interface';

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, DarkSwapResponse<T>> {
    intercept(context: ExecutionContext, next: CallHandler<T>): Observable<any> {
        return next.handle().pipe(
            map((data) => ({
                code: 200,
                message: 'Success',
                ...(data !== undefined ? { data: data } : {}),
                error: null,
            })),
        );
    }
}
