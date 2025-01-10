import { registerDecorator, ValidationOptions, ValidationArguments } from 'class-validator';       
    
export function IsOrderDirectionValid(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isOrderDirectionValid',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any) {
          if (typeof value !== 'number') return false;
            return value === 0 || value === 1;
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} must be a valid order direction: 0 for buy, 1 for sell`;
        },
      },
    });
  };
} 