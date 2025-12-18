import * as fs from 'fs';
import * as yaml from 'js-yaml';
import { z } from 'zod';

import { ConfigSchema, Config } from './configValidator';
import { ethers } from "ethers";

export class ConfigLoader {
    private config: Config;
    private static instance: ConfigLoader;

    constructor() {
        this.loadConfig();
    }

    private parseCommandLineArgs(): string | null {
        const args = process.argv.slice(2);
        for (let i = 0; i < args.length; i++) {
            const [key, value] = args[i].split('=');
            if (key === 'config') {
                return value;
            }
        }
        return null;
    }

    private loadConfig() {
        try {
            const cliConfigPath = this.parseCommandLineArgs();
            if (!cliConfigPath) {
                throw new Error("Config file path not specified, please use --config parameter to specify the config file path");
            }
            
            const configPath = cliConfigPath;

            const fileContent = fs.readFileSync(configPath, 'utf8');
            this.config = yaml.load(fileContent);

            const parsedConfig = ConfigSchema.parse(this.config);

            if (parsedConfig.userSwapRelayerPrivateKey) {
                if (!parsedConfig.userSwapRelayerAddress || !ethers.isAddress(parsedConfig.userSwapRelayerAddress)) {
                    throw new Error("User swap relayer address and privatekey is not valid");
                }

                const wallet = new ethers.Wallet(parsedConfig.userSwapRelayerPrivateKey);
                if (wallet.address.toLowerCase() != parsedConfig.userSwapRelayerAddress.toLowerCase()) {
                    throw new Error("User swap relayer address is not aligned with privatekey");
                }
            }

            this.config = parsedConfig;

        } catch (error) {
            if (error instanceof z.ZodError) {
                console.error('❌ Failed to validate configuration:');
                console.error(JSON.stringify(error.errors, null, 2));
            } else {
                console.error('❌ Failed to load configuration:');
                console.error(error);
            }
            process.exit(1);
        }
    }

    public static getInstance(): ConfigLoader {
        if (!ConfigLoader.instance) {
            ConfigLoader.instance = new ConfigLoader();
        }
        return ConfigLoader.instance;
    }

    public getConfig() {
        return this.config;
    }

    public getWallets() {
        return this.config.wallets || [];
    }
}