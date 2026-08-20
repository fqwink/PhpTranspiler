type Payload = {
  title: string;
  enabled: boolean;
};

export class ObjectUtilities {
  public keys(payload: Array<string>, fallback: string = "none"): string[] {
    const keys: string[] = Object.keys(payload);
    if (keys.length === 0) {
      return [fallback];
    }
    return keys;
  }

  public values(payload: Array<string>): string[] {
    const values: string[] = Object.values(payload);
    return values;
  }
}
