import { DarkPool } from "@thesingularitynetwork/singularity-sdk"
import { Signer } from "ethers"
import { getDarkPool } from "src/utils/darkpool"
import RpcManager from "src/utils/rpcManager"

export class DarkpoolContext {
    chainId: number
    signer: Signer
    walletAddress: string
    publicKey: string
    darkPool: DarkPool
    signature: string

    private constructor(chain: number, wallet: string, signer: Signer, pubKey: string ,darkPool: DarkPool, signature: string) {
        this.chainId = chain
        this.walletAddress = wallet
        this.signer = signer
        this.publicKey = pubKey
        this.darkPool = darkPool
        this.signature = signature
    }

    static async createDarkpoolContext(chain: number, wallet: string) {
        const [signer, pubKey] = RpcManager.getInstance().getSignerAndPublicKey(wallet, chain)
        const darkPool = getDarkPool(chain, signer)

        const domain = {
            name: "SingularityDarkpoolClientServer",
            version: "1",
        };

        const types = {
            Message: [
                { name: "wallet", type: "string" },
                { name: "content", type: "string" },
            ],
        };

        const value = {
            wallet: wallet,
            content: "Please sign this message to create your own Zero Knowledge proof key-pair. This doesn't cost you anything and is free of any gas fees.",
        };

        const signature = await signer.signTypedData(domain, types, value);
        return new DarkpoolContext(chain, wallet, signer, pubKey, darkPool, signature)
    }
} 