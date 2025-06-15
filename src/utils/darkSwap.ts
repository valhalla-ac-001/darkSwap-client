import { DarkSwap } from "@thesingularitynetwork/darkswap-sdk"
import { Signer } from "ethers"
import { networkConfig } from "../config/networkConfig"
import { relayerConfig } from "../config/relayerConfig"
import { stakingTokenConfig } from "../config/stakingConfig"
import { ConfigLoader } from "./configUtil"

export function getDarkSwap(chainId: number, signer: Signer) {
    if (!networkConfig[chainId]) {
        throw new Error(`ChainId ${chainId} not supported`)
    }

    const proofOptionConfig = ConfigLoader.getInstance().getConfig().proofOptions;
    let proofOptions = {}
    if (proofOptionConfig && proofOptionConfig.threads && proofOptionConfig.memory) {
        proofOptions = {
            threads: proofOptionConfig.threads,
            memory: proofOptionConfig.memory
        }
    }

    const darkSwap = new DarkSwap(
        signer,
        chainId,
        {
            dakSwapAssetManager: networkConfig[chainId].darkSwapAssetManager,
            darkSwapFeeAssetManager: networkConfig[chainId].darkSwapFeeAssetManager,
        }
    )

    return darkSwap
}