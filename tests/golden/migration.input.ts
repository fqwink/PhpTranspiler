export class MigrationRecordTool {
  public readonly prefix: string;

  public constructor(prefix: string) {
    this.prefix = prefix;
  }

  public normalize(input: unknown, record: any): string {
    const raw = String(input);
    const id = parseInt(record["id"]);
    const amount = Number(record["amount"]);
    const enabled = Boolean(record["enabled"]);
    const score = parseFloat(record["score"]);
    if (raw.startsWith("ad") && this.prefix.endsWith("-")) {
      record["slug"] = raw.trim().toLowerCase();
    }
    if (Number.isInteger(id) && Number.isFinite(amount)) {
      record["enabled"] = enabled;
      record["score"] = score;
    }
    delete record["temp"];
    delete record["draft"];
    return this.prefix.trim();
  }

  public countEntries(record: any): number {
    const entries = Object.entries(record);
    return entries.length;
  }
}
