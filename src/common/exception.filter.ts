import { ArgumentsHost, Catch, ExceptionFilter } from '@nestjs/common';
import { DarkSwapException } from '../exception/darkSwap.exception';
import { DarkSwapResponse, DarkSwapSimpleResponse } from './response.interface';

@Catch(DarkSwapException)
export class DarkSwapExceptionFilter implements ExceptionFilter {
  catch(exception: DarkSwapException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const status = exception.getStatus();

    const responseBody: DarkSwapSimpleResponse = {
      code: status,
      message: exception.message || 'Unknown error',
      error: exception.message || 'Unknown error',
    };

    response.status(status).json(responseBody);
  }
}