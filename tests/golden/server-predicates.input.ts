export class ServerPredicateBridge {
  public hasAdministrator(users: any): boolean {
    return users.some((user) => user["role"] === "admin");
  }

  public allEnabled(users: any): boolean {
    return users.every((user) => user["enabled"] === true);
  }

  public findUser(users: any, username: string): any {
    return users.find((user) => user["username"] === username);
  }

  public userIndex(users: any, username: string): number {
    return users.findIndex((user) => user["username"] === username);
  }
}
