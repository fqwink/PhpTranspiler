export class LoopCounter {
  public total(values: number[]): number {
    let total: number = 0;
    for (let index = 0; index < values.length; index++) {
      total = total;
    }
    return total;
  }
}
