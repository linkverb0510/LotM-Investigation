export function shuffle<T>(items: T[]): T[] {
  const clone = [...items];

  for (let index = clone.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [clone[index], clone[swapIndex]] = [clone[swapIndex], clone[index]];
  }

  return clone;
}

export function groupBy<T, K extends keyof T>(
  items: T[],
  key: K
): Record<string, T[]> {
  return items.reduce<Record<string, T[]>>((accumulator, item) => {
    const groupKey = String(item[key]);
    accumulator[groupKey] ??= [];
    accumulator[groupKey].push(item);
    return accumulator;
  }, {});
}
