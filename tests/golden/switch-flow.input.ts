export class SwitchFlow {
  public resolve(values: string[], mode: string, fallback: string): string {
    let selected: string = fallback;
    for (const value of values) {
      if (value === "") {
        continue;
      }
      switch (mode) {
        case "first":
          selected = value;
          break;
        case fallback:
          selected = fallback;
          break;
        default:
          selected = value.trim();
          break;
      }
      break;
    }
    return selected;
  }
}
