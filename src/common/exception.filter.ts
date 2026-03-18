import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus } from '@nestjs/common';
import { DarkSwapError, DarkSwapProofError } from '@thesingularitynetwork/darkswap-sdk';
import { DarkSwapException } from '../exception/darkSwap.exception';
import { DarkSwapSimpleResponse } from './response.interface';

@Catch(DarkSwapException, DarkSwapError, DarkSwapProofError)
export class DarkSwapExceptionFilter implements ExceptionFilter {
  catch(exception: DarkSwapException | DarkSwapError | DarkSwapProofError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const status = HttpStatus.BAD_REQUEST;

    const responseBody: DarkSwapSimpleResponse = {
      code: status,
      message: exception.message || 'Unknown error',
      error: exception.message || 'Unknown error',
    };

    response.status(status).json(responseBody);
  }
}