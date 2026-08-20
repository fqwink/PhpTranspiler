export class TypeAssertionExample {
  public apply(value: unknown): string {
    return value as string;
  }
}
