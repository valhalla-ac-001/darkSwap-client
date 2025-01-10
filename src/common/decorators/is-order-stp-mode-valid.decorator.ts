import { registerDecorator, ValidationOptions, ValidationArguments } from 'class-validator';       
    
export function IsOrderStpModeValid(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isOrderDirectionValid',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any) {
        //stp in bitmap
        // none: 00
        // expire_maker: 01
        // expire_taker: 10
        // both: 11
        if (typeof value !== 'number') return false;
            return [0,1,2,3].includes(value);
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} must be a valid order stp mode: 0 for none, 1 for expire_maker, 2 for expire_taker, 3 for both`;
        },
      },
    });
  };
} 