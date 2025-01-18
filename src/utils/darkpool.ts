import { DarkPool } from "@thesingularitynetwork/singularity-sdk"
import { Signer } from "ethers"
import { networkConfig } from "src/config/networkConfig"
import { relayerConfig } from "src/config/relayerConfig"
import { stakingTokenConfig } from "src/config/stakingConfig"

export function getDarkPool(chainId: number, signer: Signer) {
    if (!networkConfig[chainId]) {
        throw new Error(`ChainId ${chainId} not supported`)
    }

    const darkPool = new DarkPool(
        signer,
        chainId,
        relayerConfig[chainId],
        {
            darkpoolAssetManager: networkConfig[chainId].darkpoolAssetManager,
            stakingAssetManager: networkConfig[chainId].stakingAssetManager,
            complianceManager: networkConfig[chainId].complianceManager,
            merkleTreeOperator: networkConfig[chainId].merkleTreeOperator,
            stakingOperator: networkConfig[chainId].stakingOperator,
            otcSwapAssetManager: networkConfig[chainId].oTCSwapAssetManager,
            priceOracle: networkConfig[chainId].priceOracle,
            ethAddress: networkConfig[chainId].ethAddress,
            nativeWrapper: networkConfig[chainId].nativeWrapper,
            drakpoolSubgraphUrl: networkConfig[chainId].drakpoolSubgraphUrl,
            batchJoinSplitAssetManager: networkConfig[chainId].batchJoinSplitAssetManager,
            darkpoolSwapAssetManager: networkConfig[chainId].darkPoolSwapAssetManager,
        },
        stakingTokenConfig[chainId]
    )

    return darkPool
}