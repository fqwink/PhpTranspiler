export class DynamicCallExample {
  public apply(handlers: any, name: string): void {
    handlers[name]();
  }
}
