import { Token } from "@thesingularitynetwork/darkswap-sdk";
import { ChainId } from "../types";
import { hardhatTokens } from "./tokens/hardhat";
import { hardhatArbTokens } from "./tokens/hardhatArb";
import { sepoliaTokens } from "./tokens/sepolia";
import { horizenTestNetTokens } from "./tokens/horizenTestNet";

export const tokenConfig: { [key: string]: Token[] } = {
    [ChainId.HARDHAT]: hardhatTokens,
    [ChainId.HARDHAT_ARBITRUM]: hardhatArbTokens,
    [ChainId.SEPOLIA]: sepoliaTokens,
    [ChainId.HORIZEN_TESTNET]: horizenTestNetTokens,
    [ChainId.MAINNET]: [
        {
            name: 'ETH',
            symbol: 'ETH',
            decimals: 18,
            address: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
        },
        {
            name: 'Tether USD',
            symbol: 'USDT',
            decimals: 6,
            address: '0xdac17f958d2ee523a2206206994597c13d831ec7',
        },
        {
            name: 'USD Coin',
            symbol: 'USDC',
            decimals: 6,
            address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
        }, {
            address: '0x1Df4fAe6CC88A19825dA7dCF8Fcac8E44BA14D2C',
            decimals: 18,
            symbol: 'sgETH',
            name: 'sgETH',
        },
        {
            address: '0x91605474f1774f3C1401291A265fa8A995effeb2',
            decimals: 6,
            symbol: 'sgUSDT',
            name: 'sgUSDT',
        },
        {
            address: '0x0692623f022a622b9CB33ffBEe6c14c8abebf4cc',
            decimals: 6,
            symbol: 'sgUSDC',
            name: 'sgUSDC',
        },
    ],
    [ChainId.ARBITRUM_ONE]: [
        {
            name: 'ETH',
            symbol: 'ETH',
            decimals: 18,
            address: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
        },
        {
            address: '0xaf88d065e77c8cc2239327c5edb3a432268e5831',
            name: "USDC",
            symbol: "USDC",
            decimals: 6,
        },
        {
            address: '0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9',
            name: "Arbitrum Bridged USDT  Arbitrum ",
            symbol: "USDT",
            decimals: 6,
        },
        {
            address: '0xB2393C436a29edc40BA90b9944edB84466565E0c',
            decimals: 18,
            symbol: 'sgETH',
            name: 'sgETH',
        },
        {
            address: '0xAB5a3Ab2ef9a03de376CAce74c901a0fccD2A06d',
            decimals: 6,
            symbol: 'sgUSDT',
            name: 'sgUSDT',
        },
        {
            address: '0xFB6C93eF0B515d041b0DcDF427657E41DDDB8Da8',
            decimals: 6,
            symbol: 'sgUSDC',
            name: 'sgUSDC',
        },
    ],
    [ChainId.BASE]: [
        {
            name: 'ETH',
            symbol: 'ETH',
            decimals: 18,
            address: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
        },
        {
            address: '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913',
            name: 'USDC',
            symbol: 'USDC',
            decimals: 6,
        },
        {
            address: '0xC2Bf6bdc1868273d0dfbb163e9F82574D89a54f4',
            decimals: 18,
            symbol: 'sgETH',
            name: 'sgETH',
        },
        {
            address: '0x881e3e5416D1b6acecD9d5BA20895D06Ecc40a28',
            decimals: 6,
            symbol: 'sgUSDC',
            name: 'sgUSDC',
        },
    ]
}