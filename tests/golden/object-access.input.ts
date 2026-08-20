export class ObjectAccess {
  public constructor(private readonly runtime: any) {
  }

  public normalize(payload: Array<string>, fallback: string): string {
    if (payload["kind"] === "draft" && payload["title"] !== "") {
      payload["title"] = payload["title"].trim();
    }
    const label: string = payload["title"] !== "" ? payload["title"] : fallback;
    return payload["enabled"] === "true" ? label : fallback;
  }

  public nestedMethod(): string {
    return this.runtime.serverSideClient.requestMethod();
  }

  public nestedProperty(): string {
    return this.runtime.config.updateRepository;
  }

  public localRuntime(runtime: any): string {
    runtime.serverSideClient.ensureUnlocked();
    return runtime.configRoot + "/site.json";
  }

  public localFacade(serverSideClient: any, serverSide: any, path: string): void {
    serverSideClient.assertContentPath(path);
    serverSide.validateContent(path, "");
  }
}
