import { Helper } from "./Helper.ts";

export class App {
  public render(name: string): string {
    const helper = new Helper();
    return helper.format(name);
  }
}
