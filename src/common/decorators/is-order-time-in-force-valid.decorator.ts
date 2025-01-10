import { registerDecorator, ValidationOptions, ValidationArguments } from 'class-validator';       
    
export function IsOrderTimeInForceValid(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isOrderDirectionValid',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any) {
        //time_in_force in bitmap 
        // GTC: 0000
        // GTD: 0001
        // IOC: 0010
        // FOK: 0100
        // AON (GTC): 1000
        // AON (GTD): 1001
          if (typeof value !== 'number') return false;
            return [0, 1, 2, 4, 8, 9].includes(value);
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} must be a valid order type: 0 for GTC, 1 for GTD, 2 for IOC, 4 for FOK, 8 for AON (GTC), 9 for AON (GTD)`;
        },
      },
    });
  };
} 