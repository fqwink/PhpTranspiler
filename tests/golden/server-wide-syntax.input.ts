export class ServerWideSyntaxBridge {
  public firstPair(values: any): string {
    const [first, second] = values;
    return first + second;
  }

  public userLabel(user: any): string {
    const { username, role: userRole } = user;
    return username + ":" + userRole;
  }

  public mergedValues(base: any, extra: string): any {
    return [...base, extra];
  }

  public mergedRecord(base: any, status: string): any {
    return { ...base, status: status };
  }

  public sumValues(values: number[]): number {
    return values.reduce((left, right) => left + right, 0);
  }

  public sortByOrder(items: any): any {
    items.sort((left, right) => left.order - right.order);
    return items;
  }

  public sortSimple(values: any): any {
    values.sort();
    return values;
  }

  public statusLabel(status: string): string {
    return Php.matchValue(status, { draft: "下書き", published: "公開", default: "不明" });
  }

  public present(record: any): boolean {
    return Php.isSet(record["title"]) && !Php.isEmpty(record["title"]);
  }

  public objectMethodValues(siteSettings: any, navigation: any, adSlots: any, sourcePath: string): any {
    const title = siteSettings.pageTitle(sourcePath);
    const nav = navigation.enabled();
    const slots = adSlots.enabled();
    return { title: title, nav: nav, slots: slots };
  }

  public indexedPush(report: any, item: any): any {
    report["items"].push(item);
    return report;
  }

  public replaceExtension(sourcePath: string): string {
    return sourcePath.replace(".md", ".html");
  }
}
