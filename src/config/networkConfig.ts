import { HexData, NetworkConfig } from '../types'
import { ChainId } from '../types'
import { hardhatContracts } from './contracts/hardhat'

const confirmationsConfig: { [chainId: number]: number } = {
  [ChainId.MAINNET]: 12,
  [ChainId.ARBITRUM_ONE]: 12,
  [ChainId.BASE]: 6,
  [ChainId.SEPOLIA]: 3,
  [ChainId.HARDHAT]: 3,
  [ChainId.HARDHAT_ARBITRUM]: 3,
}

const DEFAULT_CONFIRMATIONS = 6;

export function getConfirmations(chainId: number): number {
  return confirmationsConfig[chainId] || DEFAULT_CONFIRMATIONS;
}

export const networkConfig: { [chainId: number]: NetworkConfig } = {
  [ChainId.BASE]: {
    priceOracle: '0xf224a25453D76A41c4427DD1C05369BC9f498444',
    ethAddress: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
    nativeWrapper: '0x4200000000000000000000000000000000000006',
    merkleTreeOperator: '0x918B4F76CAE5F67A3818D8eD3d0e11D9888684E9',
    darkSwapAssetManager: '0x6fbA1F1aAb8449b7ba576E41F4617d918391b7cF',
    darkSwapFeeAssetManager: '0xfde341e63EB2f25A32D353d58C2DAd7f91c8Bd57',
    darkSwapSubgraphUrl: 'https://subgraph.thesingularity.network/darkswapBase'
  },
  [ChainId.SEPOLIA]: {
    priceOracle: '0xd9EF5ef50e746B01f471542B1123a23C2Df3168B',
    ethAddress: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
    nativeWrapper: '0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14',

    merkleTreeOperator: '0x8bA03aeD844102aC14Bd01fe1aE1A8E109321D8B',
    darkSwapAssetManager: '0x25EbDE3a81D237D614239D87a17d5c819cc04052',
    darkSwapFeeAssetManager: '0x52630F3F540787fF4184d3CaaCA5d2F6698dB232',
    darkSwapSubgraphUrl: 'https://api.goldsky.com/api/public/project_cmgzjxdql005h5np27j8qhmdj/subgraphs/darkswapSepolia/0.0.1/gn'
  },
  [ChainId.HORIZEN_TESTNET]: {
    priceOracle: '0x54c375f28ce4B0c2B986D6256E4Bc75d242A8793',
    ethAddress: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
    nativeWrapper: '0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14',

    merkleTreeOperator: '0xd184b7561CB36Ae269Bf27742343266798106213',
    darkSwapAssetManager: '0xFB6C93eF0B515d041b0DcDF427657E41DDDB8Da8',
    darkSwapFeeAssetManager: '0xF4f1D4F28Be82D81135c13D255452B8325B585B0',
    darkSwapSubgraphUrl: 'https://bb.subgraph.thesingularity.network/subgraphs/name/singularity/'
  },
  [ChainId.HARDHAT]: {
    priceOracle: '0x0AdDd25a91563696D8567Df78D5A01C9a991F9B8',
    ethAddress: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
    nativeWrapper: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
    merkleTreeOperator: hardhatContracts.merkleTreeOperator as HexData,
    darkSwapAssetManager: hardhatContracts.darkSwapAssetManager as HexData,
    darkSwapFeeAssetManager: hardhatContracts.darkSwapFeeAssetManager as HexData,
    darkSwapSubgraphUrl:
      'https://app.dev.portalgate.me:8080/subgraphs/name/singularity/'
  }
}