export class ServerCollectionsBridge {
  public visibleEntries(entries: any): any {
    const values = Php.arrayValues(entries);
    const ignored = [".", ".."];
    return Php.arrayValues(Php.arrayDiff(values, ignored));
  }

  public mergePayload(base: any, extra: any): any {
    return Php.arrayMerge(base, extra);
  }

  public query(params: any): string {
    return Php.httpBuildQuery(params);
  }

  public checksumHead(bytes: string): string {
    const token = Php.strtok(bytes, " \t");
    return String(token);
  }

  public runtimeVersion(): string {
    return Php.phpVersion();
  }

  public compareVersions(left: string, right: string): number {
    return Php.versionCompare(left, right);
  }

  public sortReleases(items: any): any {
    Php.usortVersionDesc(items, "version");
    return items;
  }
}
