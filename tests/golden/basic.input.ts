export class Greeter {
  public readonly name: string;

  public constructor(name: string) {
    this.name = name;
  }

  public message(): string {
    return `Hello ${this.name}`;
  }
}
