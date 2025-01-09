import { z } from 'zod';

const WalletSchema = z.object({
  name: z.string(),
  address: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  privateKey: z.string().regex(/^0x[a-fA-F0-9]{64}$/)
});

const RelayerSchema = z.object({
  relayerName: z.string(),
  relayerAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  hostUrl: z.string().url(),
  chainId: z.number()
});

const ChainRpcSchema = z.object({
  chainId: z.number(),
  rpcUrl: z.string().url()
});


const dbFilePathScema = z.string().nonempty();
const bookNodeSocketUrlScema = z.string().url();
const bookNodeApiUrlSchema = z.string().url();
const bookNodeApiKeySchema = z.string().nonempty();

export const ConfigSchema = z.object({
  wallets: z.array(WalletSchema),
  relayers: z.array(RelayerSchema),
  chainRpcs: z.array(ChainRpcSchema),
  dbFilePath: dbFilePathScema,
  bookNodeSocketUrl: bookNodeSocketUrlScema,
  bookNodeApiUrl: bookNodeApiUrlSchema,
  bookNodeApiKey: bookNodeApiKeySchema
});

export function validateConfig(config: unknown) {
  try {
    const validatedConfig = ConfigSchema.parse(config);
    return {
      isValid: true,
      config: validatedConfig,
      errors: null
    };
  } catch (error) {
    return {
      isValid: false,
      config: null,
      errors: error
    };
  }
}

export type WalletConfig = z.infer<typeof WalletSchema>;
export type RelayerConfig = z.infer<typeof RelayerSchema>;
export type ChainRpcConfig = z.infer<typeof ChainRpcSchema>;
export type DbFilePathConfig = z.infer<typeof dbFilePathScema>;
export type BookNodeSocketUrlConfig = z.infer<typeof bookNodeSocketUrlScema>;
export type BookNodeApiUrlConfig = z.infer<typeof bookNodeApiUrlSchema>;
export type BookNodeApiKeyConfig = z.infer<typeof bookNodeApiKeySchema>;
export type Config = z.infer<typeof ConfigSchema>;