import { DarkSwap, contractConfig } from "@thesingularitynetwork/darkswap-sdk"
import { Signer } from "ethers"
import { networkConfig } from "../config/networkConfig"
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
        //contractConfig[chainId]
        {
            priceOracle: networkConfig[chainId].priceOracle,
            ethAddress: networkConfig[chainId].ethAddress,
            nativeWrapper: networkConfig[chainId].nativeWrapper,
            merkleTreeOperator: networkConfig[chainId].merkleTreeOperator,
            darkSwapAssetManager: networkConfig[chainId].darkSwapAssetManager,
            darkSwapFeeAssetManager: networkConfig[chainId].darkSwapFeeAssetManager,
            drakSwapSubgraphUrl: networkConfig[chainId].drakSwapSubgraphUrl,
        }
    )

    return darkSwap
}