export class LogicalAssignmentExample {
  public apply(record: any): void {
    record.title ??= "Untitled";
  }
}
