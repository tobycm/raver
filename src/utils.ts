export function sigmoid(value: number, steepness: number = 1, midpoint: number = 0.5): number {
  return 1 / (1 + Math.exp(-steepness * (value - midpoint)));
}

export function normalizeLog2(log2Value: number, minLog2: number, maxLog2: number): number {
  return (log2Value - minLog2) / (maxLog2 - minLog2);
}

export function normalizeLog10(log10Value: number, minLog10: number, maxLog10: number): number {
  return (log10Value - minLog10) / (maxLog10 - minLog10);
}

export function randomString(length: number): string {
  const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}
