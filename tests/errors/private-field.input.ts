export class PrivateFieldExample {
  #secret: string = "no";

  public value(): string {
    return this.#secret;
  }
}
