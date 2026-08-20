export class ServerWorkDataBridge {
  public constructor(private readonly workRoot: string) {
  }

  public cleanup(): void {
    try {
      for (const item of Php.filesystemIterator(this.workRoot)) {
        if (item.getFilename() === ".gitignore") {
          continue;
        }
        if (!this.deletePath(item.getPathname())) {
          throw new RuntimeException("作業データの削除に失敗しました。");
        }
      }
    } catch {
      throw new RuntimeException("作業データを確認できません。");
    }
  }

  private deletePath(path: string): boolean {
    if (Php.isFile(path) || Php.isLink(path)) {
      return Php.unlink(path);
    }
    if (Php.isDir(path)) {
      for (const child of Php.filesystemIterator(path)) {
        if (!this.deletePath(child.getPathname())) {
          return false;
        }
      }
      return Php.rmdir(path);
    }
    return true;
  }

  public moveUpload(source: string, target: string): boolean {
    return Php.moveUploadedFile(source, target);
  }

  public modifiedAt(path: string): number {
    if (!Php.fileExists(path)) {
      return 0;
    }
    return Number(Php.fileMTime(path));
  }

  public matches(pattern: string): any {
    const files = Php.glob(pattern);
    if (!Php.isArray(files)) {
      return [];
    }
    return files;
  }

  public jsonErrorMessage(): string {
    return Php.jsonLastErrorMsg();
  }

  public caughtMessage(error: any): string {
    return error.getMessage();
  }
}
