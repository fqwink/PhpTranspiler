export class Indexing {
  public add(values: number[], index: number): number {
    let total: number = values[index];
    total += values[0];
    values[index] = total;
    values[index] += 1;
    return values[index];
  }

  public pick(payload: Array<string>, key: string): string {
    return payload[key] ?? payload["fallback"];
  }
}
