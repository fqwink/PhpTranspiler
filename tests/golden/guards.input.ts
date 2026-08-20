export class GuardPayload {
  public readonly name: string;

  public constructor(name: string) {
    this.name = name;
  }
}

export class Guards {
  public valid(value: unknown, payload: unknown): boolean {
    if (typeof value === "string" && payload instanceof GuardPayload) {
      return true;
    }
    if (Array.isArray(value)) {
      return true;
    }
    return typeof value !== "undefined" && typeof payload["name"] === "string";
  }

  public numeric(value: unknown): boolean {
    return typeof value === "number";
  }
}
