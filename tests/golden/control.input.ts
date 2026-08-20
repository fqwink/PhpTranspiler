export class ControlFlow {
  public normalize(label: string, fallback: string): string {
    const trimmed = label.trim();
    const lowered = trimmed.toLowerCase();
    if (lowered === "") {
      return fallback;
    }
    return lowered;
  }

  public fail(message: string): void {
    throw new Error(message);
  }
}
