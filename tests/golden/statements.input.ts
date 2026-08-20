function normalizeName(value: string): string {
  return value.trim();
}

export class StatementTarget {
  public touch(value: string): void {
    this.record(value);
  }

  private record(value: string): void {
    return;
  }
}

export class StatementUsage {
  public run(target: StatementTarget, value: string): string {
    target.touch(value);
    StatementUsage.report(value);
    normalizeName(value);
    try {
      target.touch("try");
    } catch (error) {
      target.touch("catch");
    } finally {
      target.touch("finally");
    }
    return value;
  }

  public static report(value: string): void {
    return;
  }
}
