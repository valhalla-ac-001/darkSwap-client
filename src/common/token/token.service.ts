import { Token } from "@thesingularitynetwork/darkswap-sdk";
import { Contract } from "ethers";
import { tokenConfig } from "../../config/tokenConfig";
import RpcManager from "../../utils/rpcManager";


export class TokenService {
  static async getTokenByChainId(chainId: number, tokenAddress: string): Promise<Token> {
    const token = tokenConfig[chainId].find((token) => token.address.toLowerCase() === tokenAddress.toLowerCase());

    if (token)
        return token;

    return await TokenService.getTokenOnChain(chainId, tokenAddress);
  }

  static async getTokenOnChain(chainId: number, tokenAddress: string): Promise<Token> {
    const provider = RpcManager.getInstance().getProvider(chainId);
  
    try {
        const tokenContract = new Contract(
            tokenAddress,
            [
                "function symbol() view returns (string)",
                "function decimals() view returns (uint8)",
                "function name() view returns (string)"
            ],
            provider
        );
  
        const [symbol, decimals, name] = await Promise.all([
            tokenContract.symbol(),
            tokenContract.decimals(),
            tokenContract.name()
        ]);
  
        return {
            symbol,
            decimals,
            name,
            address: tokenAddress,
        }
    } catch (e: any) {
        console.error(`Failed to fetch token ${tokenAddress} on chain ${chainId}:`, e.message || e);
        throw new Error(`Error fetching token ${tokenAddress} on chain ${chainId}: ${e.message || 'RPC connection failed'}`);
    }
  }
}

