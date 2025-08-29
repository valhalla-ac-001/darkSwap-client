import { HexData, NetworkConfig } from '../types'
import { ChainId } from '../types'
import { hardhatContracts } from './contracts/hardhat'
import { hardhatArbContracts } from './contracts/hardhatArb'

const confirmationsConfig: { [chainId: number]: number } = {
  [ChainId.MAINNET]: 12,
  [ChainId.ARBITRUM_ONE]: 12,
  [ChainId.BASE]: 12,
  [ChainId.SEPOLIA]: 3,
  [ChainId.HARDHAT]: 3,
  [ChainId.HARDHAT_ARBITRUM]: 3,
}

const DEFAULT_CONFIRMATIONS = 6;

export function getConfirmations(chainId: number): number {
  return confirmationsConfig[chainId] || DEFAULT_CONFIRMATIONS;
}

export const networkConfig: { [chainId: number]: NetworkConfig } = {
  [ChainId.MAINNET]: {
    priceOracle: '0x0AdDd25a91563696D8567Df78D5A01C9a991F9B8',
    ethAddress: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
    nativeWrapper: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
    merkleTreeOperator: '0x0', //FIXME
    darkSwapAssetManager: '0x0', //FIXME
    darkSwapFeeAssetManager: '0x0', //FIXME
    drakSwapSubgraphUrl:
      'https://subgraph.satsuma-prod.com/1c6a44a9ed6e/pgs-team--611591/singularity-subgraph/api',
    explorerUrl: {
      tx: 'https://etherscan.io/tx/',
      address: 'https://etherscan.io/address/',
      block: 'https://etherscan.io/block/',
    },
  },
  [ChainId.ARBITRUM_ONE]: {
    priceOracle: '0x0AdDd25a91563696D8567Df78D5A01C9a991F9B8',
    ethAddress: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
    nativeWrapper: '0x82af49447d8a07e3bd95bd0d56f35241523fbab1',
    merkleTreeOperator: '0x0', //FIXME
    darkSwapAssetManager: '0x0', //FIXME
    darkSwapFeeAssetManager: '0x0', //FIXME
    drakSwapSubgraphUrl:
      'https://subgraph.satsuma-prod.com/1c6a44a9ed6e/pgs-team--611591/singularity-arb-subgraph/api',
    explorerUrl: {
      tx: 'https://arbiscan.io/tx/',
      address: 'https://arbiscan.io/address/',
      block: 'https://arbiscan.io/block/',
    },
  },
  [ChainId.BASE]: {
    priceOracle: '0xf224a25453D76A41c4427DD1C05369BC9f498444',
    ethAddress: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
    nativeWrapper: '0x4200000000000000000000000000000000000006',
    merkleTreeOperator: '0x0', //FIXME
    darkSwapAssetManager: '0x0', //FIXME
    darkSwapFeeAssetManager: '0x0', //FIXME

    drakSwapSubgraphUrl: 'https://subgraph.satsuma-prod.com/1c6a44a9ed6e/pgs-team--611591/singularity-base-subgraph/api',
    explorerUrl: {
      tx: 'https://basescan.org/tx/',
      address: 'https://basescan.org/address/',
      block: 'https://basescan.org/block/',
    },
  },
  [ChainId.SEPOLIA]: {
    priceOracle: '0xd9EF5ef50e746B01f471542B1123a23C2Df3168B',
    ethAddress: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
    nativeWrapper: '0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14',

    merkleTreeOperator: '0xa0577A04AabF1982b0A00b55D07cb2789cA6DBE1',
    darkSwapAssetManager: '0x3d6dc90F4840c595d58739C38E88fcC23FCe374a',
    darkSwapFeeAssetManager: '0x7744103e5a28C4c2c420DB1462de21f1dc53e11A',
    drakSwapSubgraphUrl: 'https://subgraph.satsuma-prod.com/1c6a44a9ed6e/pgs-team--611591/singularity-sepolia-subgraph/api',
    explorerUrl: {
      tx: 'https://sepolia.etherscan.io/tx/',
      address: 'https://sepolia.etherscan.io/address/',
      block: 'https://sepolia.etherscan.io/block/',
    },
  },
  [ChainId.HORIZEN_TESTNET]: {
    priceOracle: '0x54c375f28ce4B0c2B986D6256E4Bc75d242A8793',
    ethAddress: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
    nativeWrapper: '0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14',

    merkleTreeOperator: '0x8Cd4061C8b3743810B811E1F4A0B597D79225f4E',
    darkSwapAssetManager: '0xEBeD6c7C2189bf8ad6687D3A4cf4b83fB4D1a3D2',
    darkSwapFeeAssetManager: '0x8CF86856Bd7dE95b4ba33DCae4cd5Ec02542Bf5b',
    drakSwapSubgraphUrl: 'https://subgraph.satsuma-prod.com/1c6a44a9ed6e/pgs-team--611591/singularity-sepolia-subgraph/api',
    explorerUrl: {
      tx: 'https://sepolia.etherscan.io/tx/',
      address: 'https://sepolia.etherscan.io/address/',
      block: 'https://sepolia.etherscan.io/block/',
    },
  },
  [ChainId.HARDHAT]: {
    priceOracle: '0x0AdDd25a91563696D8567Df78D5A01C9a991F9B8',
    ethAddress: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
    nativeWrapper: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
    merkleTreeOperator: hardhatContracts.merkleTreeOperator as HexData,
    darkSwapAssetManager: hardhatContracts.darkSwapAssetManager as HexData,
    darkSwapFeeAssetManager: hardhatContracts.darkSwapFeeAssetManager as HexData,

    drakSwapSubgraphUrl:
      'https://app.dev.portalgate.me:8080/subgraphs/name/singularity/',
    explorerUrl: {
      tx: 'https://sepolia.etherscan.io/tx/',
      address: 'https://sepolia.etherscan.io/address/',
      block: 'https://sepolia.etherscan.io/block/',
    },
  },
  [ChainId.HARDHAT_ARBITRUM]: {
    priceOracle: '0x0AdDd25a91563696D8567Df78D5A01C9a991F9B8',
    ethAddress: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
    nativeWrapper: '0x82af49447d8a07e3bd95bd0d56f35241523fbab1',
    merkleTreeOperator: hardhatArbContracts.merkleTreeOperator as HexData,
    darkSwapAssetManager: hardhatArbContracts.darkSwapAssetManager as HexData,
    darkSwapFeeAssetManager: hardhatArbContracts.darkSwapFeeAssetManager as HexData,

    drakSwapSubgraphUrl:
      'https://app.dev.portalgate.me:48080/subgraphs/name/singularityArb/',
    explorerUrl: {
      tx: 'https://arbiscan.io/tx/',
      address: 'https://arbiscan.io/address/',
      block: 'https://arbiscan.io/block/',
    },
  }
}
