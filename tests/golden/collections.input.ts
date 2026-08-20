export class CollectionPresenter {
  public summarize(values: string[], needle: string): string {
    const count = values.length;
    const found = values.includes(needle);
    const labels = values.join(", ");
    const tail = values.slice(1);
    let items: string[] = [];
    items.push(needle);
    return labels;
  }
}
