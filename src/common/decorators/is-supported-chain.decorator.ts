import { registerDecorator, ValidationOptions, ValidationArguments } from 'class-validator';

export enum SupportedChainId {
  ETHEREUM = 1,
  ARBITRUM = 42161,
  BASE = 8453,
  HARDHAT = 31337,
  HARDHAT_ARBITRUM = 31338,
} 

export function IsSupportedChain(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isSupportedChain',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any) {
          if (typeof value !== 'number') return false;
          return Object.values(SupportedChainId).includes(value);
        },
        defaultMessage(args: ValidationArguments) {
          const chains = Object.values(SupportedChainId)
            .filter(value => typeof value === 'number')
            .join(', ');
          return `${args.property} must be one of the supported chain IDs: ${chains}`;
        },
      },
    });
  };
} 