import { registerDecorator, ValidationOptions, ValidationArguments } from 'class-validator';       
    
export function IsOrderTypeValid(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isOrderDirectionValid',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any) {
          if (typeof value !== 'number') return false;
            return value === 0 || value === 1 || value === 2 || value === 3 || value === 4 || value === 5 || value === 6;
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} must be a valid order type: 0 for market, 1 for limit, 2 for stop loss, 3 for stop loss limit, 4 for take profit, 5 for take profit limit, 6 for limit maker`;
        },
      },
    });
  };
} 