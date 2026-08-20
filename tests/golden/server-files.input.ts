export class ServerFileBridge {
  public ensureMarker(path: string): boolean {
    if (!Php.fileExists(path)) {
      return Php.touch(path);
    }
    Php.clearStatCache(true, path);
    return Php.isFile(path) && Php.isReadable(path) && Php.isWritable(path);
  }

  public byteSize(path: string): number {
    if (!Php.isFile(path)) {
      return 0;
    }
    return Number(Php.filesize(path));
  }

  public collect(runtime: any): any {
    const values = [];
    for (const item of runtime.files()) {
      values.push(item);
    }
    for (const key in runtime.map()) {
      values.push(key);
    }
    return values;
  }
}
