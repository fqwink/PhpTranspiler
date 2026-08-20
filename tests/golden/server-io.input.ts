export class ServerIoBridge {
  public sanitize(value: any): string {
    if (!Php.isString(value)) {
      return "";
    }
    const trimmed = String(value).trim();
    return Php.escapeHtml(trimmed, ENT_QUOTES | ENT_SUBSTITUTE, "UTF-8");
  }

  public renderMultiline(content: string): string {
    return Php.nl2br(Php.escapeHtml(content, ENT_QUOTES | ENT_SUBSTITUTE, "UTF-8"));
  }

  public decodePayload(bytes: string): any {
    return Php.jsonDecode(bytes, true);
  }

  public encodePayload(payload: any): string {
    return Php.jsonEncode(payload);
  }

  public encodePrettyPayload(payload: any): string {
    return Php.jsonEncode(payload, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
  }

  public imageData(bytes: string): string {
    return Php.base64Encode(bytes);
  }

  public decodeImageData(bytes: string): string {
    return Php.base64Decode(bytes);
  }

  public lines(markdown: string): any {
    return Php.pregSplit("/\\R/", markdown);
  }

  public writeHtml(html: string): void {
    Php.echo(html);
  }

  public validUrl(url: string): boolean {
    return Php.filterVar(url, FILTER_VALIDATE_URL) !== false;
  }

  public validEmail(value: string): boolean {
    return Php.filterVar(value, FILTER_VALIDATE_EMAIL) !== false;
  }

  public normalizePath(path: string): string {
    return Php.ltrim(Php.rtrim(path, "/"), "/");
  }

  public listEntries(root: string): any {
    if (!Php.isDir(root)) {
      return [];
    }
    const entries = Php.scandir(root);
    if (!Php.isArray(entries)) {
      return [];
    }
    return entries;
  }

  public prepareTarget(target: string): void {
    const directory = Php.dirname(target);
    if (!Php.isDir(directory)) {
      Php.mkdir(directory, 493, true);
    }
  }

  public moveFile(source: string, target: string): boolean {
    if (!Php.isFile(source) && !Php.isLink(source)) {
      return false;
    }
    const name = Php.basename(target);
    const parent = Php.dirname(target);
    if (name === "" || !Php.isDir(parent)) {
      return false;
    }
    return Php.rename(source, target);
  }

  public copyFile(source: string, target: string): boolean {
    return Php.copy(source, target);
  }

  public removePath(path: string): boolean {
    if (Php.isDir(path)) {
      return Php.rmdir(path);
    }
    if (Php.isFile(path) || Php.isLink(path)) {
      return Php.unlink(path);
    }
    return true;
  }

  public noUploadFile(file: any): boolean {
    return Php.arrayKeyExists("error", file) && file["error"] === UPLOAD_ERR_NO_FILE;
  }

  public numericOrder(value: any): boolean {
    return Php.isInt(value) || (Php.isString(value) && Php.ctypeDigit(value));
  }

  public failForbidden(): void {
    Php.httpResponseCode(403);
    Php.exit();
  }
}
