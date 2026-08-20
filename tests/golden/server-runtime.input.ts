export class ServerRuntimeBridge {
  public static readonly CSRF_KEY: string = "csrf";

  public requestMethod(): string {
    const raw = Php.server("REQUEST_METHOD", "GET");
    const method = String(raw);
    return method.toUpperCase();
  }

  public csrfToken(): string {
    if (!Php.hasSession(ServerRuntimeBridge.CSRF_KEY)) {
      const bytes = Php.randomBytes(32);
      const token = Php.hash("sha256", String(bytes));
      Php.setSession(ServerRuntimeBridge.CSRF_KEY, token);
    }
    return String(Php.session(ServerRuntimeBridge.CSRF_KEY, ""));
  }

  public requireCsrf(): void {
    const token = String(Php.post("csrf", ""));
    if (token === "" || !Php.hashEquals(this.csrfToken(), token)) {
      throw new RuntimeException("CSRF検証に失敗しました。");
    }
  }

  public bootSession(): void {
    if (Php.sessionStatus() !== PHP_SESSION_ACTIVE) {
      const secure = Php.server("HTTPS", "off") !== "off";
      const params = {
        lifetime: 1800,
        httponly: true,
        samesite: "Strict",
        secure: secure,
      };
      Php.iniSet("session.use_strict_mode", "1");
      Php.sessionName("adlaire_studio");
      Php.sessionSetCookieParams(params);
      Php.sessionStart();
    }
  }

  public login(username: string): void {
    Php.setSession("admin", username);
    Php.setSession("authenticated_at", Php.time());
  }

  public logout(): void {
    Php.unsetSession("admin");
    Php.unsetSession("authenticated_at");
    Php.sessionDestroy();
  }

  public redirect(to: string): void {
    Php.header(`Location: ${to}`);
  }

  public json(payload: any): void {
    Php.httpResponseCode(200);
    Php.header("Content-Type: application/json; charset=utf-8");
    Php.responseJson(payload);
  }
  public getAction(): string {
    return String(Php.get("action", "index"));
  }

  public boundedCount(value: any): number {
    return Php.max(0, Php.toInt(value));
  }

  public trimSlashes(value: string): string {
    return Php.trim(value, "/");
  }

}
