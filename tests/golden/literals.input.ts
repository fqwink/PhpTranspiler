export class LiteralBuilder {
  public build(name: string, count: number): mixed {
    const names = [name, "fixed"];
    const payload = { name: name, count: count, enabled: true };
    return payload;
  }

  public dottedPath(root: string): string {
    return root + "/auth.json";
  }
}
