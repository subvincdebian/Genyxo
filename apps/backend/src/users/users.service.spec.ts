import { Test, TestingModule } from "@nestjs/testing";
import { UsersService } from "./users.service";

import { getRepositoryToken } from "@nestjs/typeorm";
import { User } from "./user.entity";
import { Transaction } from "../transactions/transaction.entity";
import { RedisCacheService } from "../common/redis-cache.service";
import { Role } from "./role.enum";

describe("UsersService", () => {
  let service: UsersService;
  let otherReplica: UsersService;
  const repository = { findOne: jest.fn(), save: jest.fn() };
  const sharedCache = new Map<string, unknown>();
  const redisCache = {
    get: jest.fn((key: string) =>
      Promise.resolve(sharedCache.get(key) ?? null),
    ),
    set: jest.fn((key: string, value: unknown) => {
      sharedCache.set(key, value);
      return Promise.resolve();
    }),
    del: jest.fn((...keys: string[]) => {
      keys.forEach((key) => sharedCache.delete(key));
      return Promise.resolve();
    }),
    invalidate: jest.fn((id: number) => {
      sharedCache.delete(`user_auth:${id}`);
      return Promise.resolve();
    }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    sharedCache.clear();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: getRepositoryToken(User), useValue: repository },
        { provide: getRepositoryToken(Transaction), useValue: {} },
        { provide: RedisCacheService, useValue: redisCache },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    const replicaModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: getRepositoryToken(User), useValue: repository },
        { provide: getRepositoryToken(Transaction), useValue: {} },
        { provide: RedisCacheService, useValue: redisCache },
      ],
    }).compile();
    otherReplica = replicaModule.get(UsersService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  it("observes role revocation invalidated by another replica immediately", async () => {
    const user = { id: 7, email: "user@example.com", role: Role.ADMIN };
    repository.findOne.mockResolvedValueOnce(user);
    expect(await service.findAuthUserById(7)).toEqual(user);
    expect(await service.findAuthUserById(7)).toEqual(user);
    expect(repository.findOne).toHaveBeenCalledTimes(1);

    await otherReplica.invalidateUserCache(7);
    const updated = { ...user, role: Role.USER };
    repository.findOne.mockResolvedValueOnce(updated);
    expect(await service.findAuthUserById(7)).toEqual(updated);
    expect(repository.findOne).toHaveBeenCalledTimes(2);
    expect(redisCache.get).toHaveBeenCalledTimes(3);
  });

  it("invalidates shared authorization data when another replica saves a user", async () => {
    const user = Object.assign(new User(), {
      id: 7,
      email: "user@example.com",
      role: Role.ADMIN,
    });
    repository.findOne.mockResolvedValueOnce(user);
    await service.findAuthUserById(7);
    user.role = Role.USER;
    repository.save.mockResolvedValueOnce(user);
    await otherReplica.save(user);
    repository.findOne.mockResolvedValueOnce(user);

    expect((await service.findAuthUserById(7))?.role).toBe(Role.USER);
    expect(repository.findOne).toHaveBeenCalledTimes(2);
    expect(redisCache.del).toHaveBeenCalledWith(
      "user_profile:7",
      "user_auth:7",
    );
  });

  it("returns null after a cached user is deleted on another replica", async () => {
    repository.findOne.mockResolvedValueOnce({
      id: 7,
      email: "user@example.com",
      role: Role.USER,
    });
    await service.findAuthUserById(7);
    await otherReplica.invalidateUserCache(7);
    repository.findOne.mockResolvedValueOnce(null);

    expect(await service.findAuthUserById(7)).toBeNull();
    expect(repository.findOne).toHaveBeenLastCalledWith({
      where: { id: 7 },
      select: ["id", "email", "role"],
    });
  });
});
