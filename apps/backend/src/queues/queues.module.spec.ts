import { Test } from "@nestjs/testing";
import { getQueueToken } from "@nestjs/bullmq";
import { QUEUE_NAMES } from "./queue.constants";
import { QueuesModule } from "./queues.module";

describe("QueuesModule shutdown", () => {
  it("closes this instance without globally pausing the shared queue", async () => {
    const queue = {
      close: jest.fn().mockResolvedValue(undefined),
      pause: jest.fn().mockResolvedValue(undefined),
    };
    const module = await Test.createTestingModule({
      providers: [
        QueuesModule,
        { provide: getQueueToken(QUEUE_NAMES.EMAIL), useValue: queue },
      ],
    }).compile();

    await module.get(QueuesModule).onApplicationShutdown("SIGTERM");

    expect(queue.close).toHaveBeenCalledTimes(1);
    expect(queue.pause).not.toHaveBeenCalled();
  });

  it("allows shutdown when the optional queue is unavailable", async () => {
    const module = await Test.createTestingModule({
      providers: [QueuesModule],
    }).compile();

    await expect(
      module.get(QueuesModule).onApplicationShutdown("SIGTERM"),
    ).resolves.toBeUndefined();
  });
});
