export class RuntimeHelpers {
  public encode(value: string, amount: number): string {
    const rounded = Math.round(amount);
    const payload = JSON.stringify(value);
    const parts = value.split("-");
    const first = value.slice(0, 1);
    const renamed = value.replace("a", "b");
    return payload;
  }
}
