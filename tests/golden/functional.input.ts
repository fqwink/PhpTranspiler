export class FunctionalCollections {
  public clean(values: string[]): string[] {
    const trimmed = values.map((value) => value.trim());
    const present = trimmed.filter((value) => value !== "");
    let output: string[] = [];
    present.forEach((value) => output.push(value));
    return output;
  }
}
