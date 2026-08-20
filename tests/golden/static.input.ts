export class PathTool {
  public static join(left: string, right: string): string {
    return `${left}/${right}`;
  }
}

export class StaticUsage {
  public make(name: string): string {
    return PathTool.join("root", name);
  }
}

export class StaticCache {
  private static cache: any = {};

  public static remember(key: string, value: string): string {
    if (Php.arrayKeyExists(key, self.cache)) {
      return String(self.cache[key]);
    }
    self.cache[key] = value;
    return value;
  }

  public static clear(): void {
    StaticCache.cache = {};
  }
}
