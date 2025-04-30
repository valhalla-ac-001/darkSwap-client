import { networkConfig } from "../config/networkConfig";

export class SubgraphService {
    private static instance: SubgraphService;

    public static getInstance(): SubgraphService {
        if (!SubgraphService.instance) {
            SubgraphService.instance = new SubgraphService();
        }
        return SubgraphService.instance;
    }


    async getSwapTxByNullifiers(chainId: number, makerNullifier: string, takerNullifier: string): Promise<{ txHash: string, makerInNote: string }> {
        const query = `
            query findSwapByNullifiers{
                darkPoolSwaps(where: {aliceOutNullifierIn: "${makerNullifier}", botOutnullifierIn: "${takerNullifier}"}) {
                    aliceOutNullifierIn
                    botOutnullifierIn
                    bobInNote
                    aliceInNote
                    transactionHash
                }
            }
        `;

        const response = await fetch(networkConfig[chainId].drakpoolSubgraphUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ query }),
        });

        const data = await response.json();

        if (!data || !data.data || !data.data.darkPoolSwaps || data.data.darkPoolSwaps.length === 0) {
            return null;
        }

        return {
            txHash: data.data.darkPoolSwaps[0].transactionHash,
            makerInNote: data.data.darkPoolSwaps[0].aliceInNote,
        };
    }
}