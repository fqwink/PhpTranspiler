// @php-declare strict_types=1
// @php-namespace PhpTranspilerFixture
// @php-use ServerSideLogicFoundationSystem\ServerSideLogicFoundationSystemInternal

export class AuthRuntime {
  public static readonly INITIAL_ADMIN_USERNAME: string = "admin";
  private static readonly PASSWORD_MIN_LENGTH: number = 12;

  public constructor(
    private readonly authFile: string,
    private readonly stateFile: string,
  ) {
    if (Php.sessionStatus() !== PHP_SESSION_ACTIVE) {
      Php.sessionName("phptranspiler_fixture");
      Php.sessionStart();
    }
  }

  public ensureInitialAdmin(): void {
    if (Php.isFile(this.authFile)) {
      return;
    }
    const passwordHash = Php.passwordHash(AuthRuntime.INITIAL_ADMIN_USERNAME, PASSWORD_DEFAULT);
    if (passwordHash === false) {
      throw new RuntimeException("初期管理者パスワードをハッシュ化できません。");
    }
    const createdAt = Php.gmdate(DATE_ATOM);
    const payloadData = {
      username: AuthRuntime.INITIAL_ADMIN_USERNAME,
      password_hash: passwordHash,
      created_at: createdAt,
    };
    const payload = JSON.stringify(payloadData);
    if (Php.filePutContents(this.authFile, payload, LOCK_EX) === false) {
      throw new RuntimeException("認証情報を書き込めません。");
    }
    Php.chmod(this.authFile, 384);
  }

  public passwordAllowed(password: string): boolean {
    if (password.length < AuthRuntime.PASSWORD_MIN_LENGTH) {
      return false;
    }
    return Php.pregMatch("/[A-Za-z]/", password) === 1 && Php.pregMatch("/[0-9]/", password) === 1;
  }

  public readState(): any {
    if (!Php.isFile(this.stateFile)) {
      return { failures: 0, locked_until: 0 };
    }
    const bytes = Php.fileGetContents(this.stateFile);
    if (bytes === false) {
      return { failures: 0, locked_until: 0 };
    }
    const data = JSON.parse(bytes);
    if (!Array.isArray(data["users"])) {
      return { failures: 0, locked_until: 0 };
    }
    return data;
  }
}

export class ExampleFacade {
  public constructor(private readonly auth: AuthRuntime) {
  }

  public boot(): void {
    this.auth.ensureInitialAdmin();
  }

  public passwordAllowed(password: string): boolean {
    return this.auth.passwordAllowed(password);
  }

  public apply(value: string): string {
    return (new ExampleWorker(value)).run();
  }
}

export class ExampleWorker {
  public constructor(private readonly value: string) {
  }

  public run(): string {
    return this.value.trim();
  }
}

// @php-run-unless-defined PHPT_FIXTURE_NO_RUN Bootstrap::run (__DIR__)
