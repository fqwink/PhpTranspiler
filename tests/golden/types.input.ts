export class TypeCoverage {
  public readonly options: Array<string>;

  public constructor(options: Array<string>) {
    this.options = options;
  }

  public pick(value: string | null, fallback?: string): string | null {
    const values: Array<string> = [fallback ?? "default", "fixed"];
    return value ?? values.join(",");
  }
}
