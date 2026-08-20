export function normalizeName(value: string): string {
  return value.trim().toLowerCase();
}

export interface Writer {
  configured(): boolean;
  saveContent(path: string, bytes: string, message: string): void;
  fail(message: string): never;
}

export class UserRecord {
  public readonly name: string;

  public constructor(name: string) {
    this.name = name;
  }
}

export class FunctionUsage {
  public make(value: string, enabled: boolean): UserRecord {
    if (!enabled) {
      return new UserRecord("disabled");
    }
    const normalized: string = normalizeName(value);
    return new UserRecord(normalized);
  }
}

export class NullWriter implements Writer {
  public configured(): boolean {
    return false;
  }

  public saveContent(path: string, bytes: string, message: string): void {
    Php.throwRuntime("Gitプロバイダーが未設定です。");
  }

  public fail(message: string): never {
    Php.throwRuntime(message);
  }
}
