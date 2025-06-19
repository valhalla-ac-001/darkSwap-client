import { Type } from '@nestjs/common';
import { applyDecorators } from '@nestjs/common';
import { ApiExtraModels, ApiOkResponse, ApiResponseProperty, getSchemaPath } from '@nestjs/swagger';

export class DarkSwapResponse<T> {
  @ApiResponseProperty()
  code: number;
  @ApiResponseProperty()
  message: string;
  @ApiResponseProperty()
  data: T;
  @ApiResponseProperty()
  error: string;
}

export class DarkSwapSimpleResponse {
  @ApiResponseProperty({
    type: Number,
    example: 200
  })
  code: number;
  @ApiResponseProperty({
    type: String,
    example: 'Success'
  })
  message: string;
  @ApiResponseProperty({
    type: String,
    example: 'Error message'
  })
  error: string;
}

export const ApiGenericResponse = <T extends Type<unknown>>(dataDto: T) =>
  applyDecorators(
    ApiExtraModels(DarkSwapResponse, dataDto),
    ApiOkResponse({
      schema: {
        allOf: [
          { $ref: getSchemaPath(DarkSwapResponse) },
          {
            properties: {
              data: {
                $ref: getSchemaPath(dataDto)
              },
            },
          },
        ],
      },
    }),
  )

export const ApiGenericArrayResponse = <T extends Type<unknown>>(dataDto: T) =>
  applyDecorators(
    ApiExtraModels(DarkSwapResponse, dataDto),
    ApiOkResponse({
      schema: {
        allOf: [
          { $ref: getSchemaPath(DarkSwapResponse) },
          {
            properties: {
              data: {
                type: 'array',
                items: { $ref: getSchemaPath(dataDto) },
              },
            },
          },
        ],
      },
    }),
  )