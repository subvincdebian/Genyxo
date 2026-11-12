import * as bcrypt from "bcrypt";
import { Repository } from "typeorm";
import { ProfileService } from "./profile.service";
import { User } from "../users/user.entity";
import { Transaction } from "../transactions/transaction.entity";
import { UsersService } from "../users/users.service";
import { NotificationsGateway } from "../notifications/notifications.gateway";

describe("account password changes", () => {
  async function fixture(password = "existing-password") {
    const account = { id: 7, password: await bcrypt.hash(password, 4) };
    const manager = {
      findOne: jest.fn(async () => account),
      update: jest.fn(async (_entity, _id, patch) => {
        account.password = patch.password;
      }),
      increment: jest.fn(async () => undefined),
    };
    const users = {
      manager: { transaction: async (callback) => callback(manager) },
    };
    const cache = { invalidateUserCache: jest.fn(async () => undefined) };
    const notifications = { revokeSessions: jest.fn() };
    return {
      account,
      manager,
      cache,
      notifications,
      service: new ProfileService(
        users as unknown as Repository<User>,
        {} as Repository<Transaction>,
        cache as unknown as UsersService,
        notifications as unknown as NotificationsGateway,
      ),
    };
  }
  it("rejects a wrong password without changing credentials or sessions", async () => {
    const { service, manager, notifications } = await fixture();
    await expect(
      service.changePassword(7, "wrong-password", "replacement-password"),
    ).rejects.toThrow("Current password is incorrect");
    expect(manager.update).not.toHaveBeenCalled();
    expect(manager.increment).not.toHaveBeenCalled();
    expect(notifications.revokeSessions).not.toHaveBeenCalled();
  });
  it("rejects an effectively identical password at bcrypt's byte boundary", async () => {
    const { service, manager } = await fixture("a".repeat(73));
    await expect(
      service.changePassword(7, "a".repeat(73), "a".repeat(72)),
    ).rejects.toThrow("Choose a different password");
    expect(manager.update).not.toHaveBeenCalled();
  });
  it("hashes the new password, clears recovery credentials and revokes every session", async () => {
    const { service, account, manager, cache, notifications } = await fixture();
    await service.changePassword(
      7,
      "existing-password",
      "replacement-password",
    );
    expect(await bcrypt.compare("replacement-password", account.password)).toBe(
      true,
    );
    expect(await bcrypt.compare("existing-password", account.password)).toBe(
      false,
    );
    expect(manager.update).toHaveBeenCalledWith(
      User,
      7,
      expect.objectContaining({
        resetPasswordToken: null,
        resetPasswordExpires: null,
      }),
    );
    expect(manager.increment).toHaveBeenCalledWith(
      User,
      { id: 7 },
      "sessionVersion",
      1,
    );
    expect(cache.invalidateUserCache).toHaveBeenCalledWith(7);
    expect(notifications.revokeSessions).toHaveBeenCalledWith(7);
  });
  it("rejects a new password exceeding the bcrypt byte limit", async () => {
    const { service, manager } = await fixture();
    await expect(
      service.changePassword(7, "existing-password", "я".repeat(37)),
    ).rejects.toThrow("72 UTF-8 bytes");
    expect(manager.findOne).not.toHaveBeenCalled();
  });
});
