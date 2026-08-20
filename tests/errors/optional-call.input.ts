export class OptionalCallExample {
  public apply(callback: any): void {
    callback?.();
  }
}
