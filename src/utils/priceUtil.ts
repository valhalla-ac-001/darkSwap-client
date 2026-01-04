const PRECISION = 1e8;
const TOLERANCE = 1n;
const TOLERANCE_PRECISION = 100000n;

export function checkPrice(amountBase: bigint, amountQuote: bigint, decimalBase: number, decimalQuote: number, price: number, tolerance = TOLERANCE) {
    const priceWithDecimal = BigInt((price * PRECISION).toFixed(0));
    const amountQuoteNew = amountBase * priceWithDecimal * BigInt(10 ** decimalQuote) / BigInt(10 ** decimalBase) / BigInt(PRECISION);
    const deviationBps = _calculateDeviationBps(amountQuoteNew, amountQuote);
    return deviationBps <= tolerance;
}

function _calculateDeviationBps(actual: bigint, expected: bigint) {
    const diff = actual > expected ? actual - expected : expected - actual;
    return (diff * TOLERANCE_PRECISION) / expected;
}