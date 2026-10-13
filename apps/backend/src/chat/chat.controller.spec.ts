import { Test, TestingModule } from "@nestjs/testing";
import { ChatController } from "./chat.controller";

import { ChatService } from "./chat.service";
import { UsersService } from "../users/users.service";
import { FalService } from "./fal.service";
import { PricingService } from "./pricing.service";
import { ConfigService } from "@nestjs/config";

describe("ChatController", () => {
  let controller: ChatController;
  const updateVideoUrl = jest.fn().mockResolvedValue(undefined);

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ChatController],
      providers: [
        { provide: ChatService, useValue: { updateVideoUrl } },
        { provide: UsersService, useValue: {} },
        { provide: FalService, useValue: {} },
        { provide: PricingService, useValue: {} },
        { provide: ConfigService, useValue: { get: () => "fixture-secret" } },
      ],
    }).compile();

    controller = module.get<ChatController>(ChatController);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  it("accepts the secret returned in the configured FAL callback URL", async () => {
    await controller.handleFalWebhook(
      {
        request_id: "fixture",
        status: "COMPLETED",
        payload: { video: { url: "https://example.test/video.mp4" } },
      },
      undefined,
      "fixture-secret",
    );
    expect(updateVideoUrl).toHaveBeenCalledWith(
      "fixture",
      "https://example.test/video.mp4",
    );
  });

  it.each([undefined, "incorrect", ["fixture-secret"], "éééééééééééééé"])(
    "rejects an invalid callback secret without updating a message",
    async (secret) => {
      updateVideoUrl.mockClear();
      await expect(
        controller.handleFalWebhook({ status: "COMPLETED" }, undefined, secret),
      ).rejects.toThrow("Invalid webhook secret");
      expect(updateVideoUrl).not.toHaveBeenCalled();
    },
  );

  it("does not let the query override an invalid explicit header", async () => {
    await expect(
      controller.handleFalWebhook({}, "incorrect", "fixture-secret"),
    ).rejects.toThrow("Invalid webhook secret");
  });
});
