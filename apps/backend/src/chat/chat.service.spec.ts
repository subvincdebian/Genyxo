import { Test, TestingModule } from "@nestjs/testing";
import { ChatService } from "./chat.service";

import { ConfigService } from "@nestjs/config";
import { FalService } from "./fal.service";
import { PricingService } from "./pricing.service";
import { UsersService } from "../users/users.service";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Message } from "./message.entity";
import { Conversation } from "./conversation.entity";
import { CircuitBreakerService } from "../common/resilience/circuit-breaker.service";

describe("ChatService", () => {
  let service: ChatService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatService,
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue("mock-api-key") },
        },
        { provide: FalService, useValue: {} },
        { provide: PricingService, useValue: {} },
        { provide: UsersService, useValue: {} },
        { provide: getRepositoryToken(Message), useValue: {} },
        { provide: getRepositoryToken(Conversation), useValue: {} },
      ],
    }).compile();

    service = module.get<ChatService>(ChatService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  it("lists generating chats per user and stops only the asked one", () => {
    const streams = (service as unknown as { activeStreams: Set<unknown> })
      .activeStreams;
    const mine = {
      userId: 7,
      conversationId: 41,
      controller: new AbortController(),
    };
    const first = {
      userId: 7,
      clientRequestId: "req-12345678",
      controller: new AbortController(),
    };
    const theirs = {
      userId: 8,
      conversationId: 41,
      controller: new AbortController(),
    };
    streams.add(mine);
    streams.add(first);
    streams.add(theirs);

    expect(service.generatingConversations(7)).toEqual([41]);
    expect(service.stopGeneration(7, { conversationId: 41 })).toEqual({
      stopped: 1,
    });
    expect(mine.controller.signal.aborted).toBe(true);
    expect(theirs.controller.signal.aborted).toBe(false);
    expect(
      service.stopGeneration(7, { clientRequestId: "req-12345678" }),
    ).toEqual({ stopped: 1 });
    expect(first.controller.signal.aborted).toBe(true);
  });

  it("should use circuit breaker when provided", async () => {
    const mockCircuitBreaker = {
      execute: jest.fn().mockResolvedValue({
        choices: [{ message: { content: "Protected AI response" } }],
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatService,
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue("mock-api-key") },
        },
        { provide: FalService, useValue: {} },
        { provide: PricingService, useValue: {} },
        { provide: UsersService, useValue: {} },
        { provide: getRepositoryToken(Message), useValue: {} },
        { provide: getRepositoryToken(Conversation), useValue: {} },
        { provide: CircuitBreakerService, useValue: mockCircuitBreaker },
      ],
    }).compile();

    const protectedService = module.get<ChatService>(ChatService);
    const result = await protectedService.getAiResponse(
      [{ id: 1, content: "Hello", sender: "user", conversationId: 1 } as any],
      "openai/gpt-4o",
    );

    expect(result.reply).toBe("Protected AI response");
    expect(mockCircuitBreaker.execute).toHaveBeenCalled();
  });

  it("retains extracted attachment text for later turns", async () => {
    const file = {
      name: "notes.txt",
      mime_type: "text/plain",
      data: Buffer.from("Important project decision").toString("base64"),
    };
    const normalized = await (service as any).normalizeAttachedFiles([file]);
    expect(normalized[0].extracted_text).toBe("Important project decision");
    expect((service as any).buildPriorFileContext(normalized)).toContain(
      "Important project decision",
    );
  });

  it("extracts text from attachments saved before extraction was available", async () => {
    const message: any = {
      id: 9,
      files: [
        {
          name: "older.txt",
          mime_type: "text/plain",
          data: Buffer.from("Context from an earlier turn").toString("base64"),
        },
      ],
    };
    const repository = (service as any).messageRepository;
    repository.update = jest.fn().mockResolvedValue({ affected: 1 });

    await (service as any).hydrateStoredFiles(message);

    expect(message.files[0].extracted_text).toBe(
      "Context from an earlier turn",
    );
    expect(repository.update).toHaveBeenCalledWith(
      { id: 9 },
      { files: message.files },
    );
  });

  it("summarizes older messages when the input token budget is exceeded", async () => {
    const messages = Array.from({ length: 6 }, (_, index) => ({
      id: index + 1,
      content: "Context ".repeat(1350),
      sender: index % 2 ? "bot" : "user",
      model: "openai/gpt-4o",
      files: null,
    }));
    const repository = (service as any).messageRepository;
    repository.find = jest.fn().mockResolvedValue(messages);
    const conversationRepository = (service as any).conversationRepository;
    conversationRepository.update = jest
      .fn()
      .mockResolvedValue({ affected: 1 });
    const ai = (service as any).openRouter;
    ai.chat.completions.create = jest.fn().mockResolvedValue({
      choices: [
        { message: { content: "The user is discussing project context." } },
      ],
    });
    const conversation = {
      id: 1,
      userId: 7,
      contextSummary: null,
      summaryThroughMessageId: 0,
    };
    const result = await (service as any).prepareConversationContext(
      conversation,
      messages[5],
    );
    expect(result.summary).toContain("project context");
    expect(conversation.summaryThroughMessageId).toBeGreaterThan(0);
    expect(result.messages.at(-1).id).toBe(6);
    expect(conversationRepository.update).toHaveBeenCalled();
  });

  it("stores an alternative answer linked to the original without replacing it", async () => {
    const context = jest
      .spyOn(service as any, "getProjectContext")
      .mockResolvedValue({ text: "Relevant excerpt", sources: [] });
    const original = {
      id: 20,
      userId: 7,
      conversationId: 3,
      sender: "bot",
      content: "First answer",
      alternativeToMessageId: null,
    };
    const question = {
      id: 19,
      userId: 7,
      conversationId: 3,
      sender: "user",
      content: "Question",
      files: null,
    };
    const messages = [question];
    const messageRepository = (service as any).messageRepository;
    messageRepository.findOne = jest
      .fn()
      .mockResolvedValueOnce(original)
      .mockResolvedValueOnce(question);
    messageRepository.find = jest.fn().mockResolvedValue(messages);
    const conversationRepository = (service as any).conversationRepository;
    conversationRepository.findOne = jest
      .fn()
      .mockResolvedValue({ id: 3, userId: 7, projectId: null });
    const pricing = (service as any).pricingService;
    pricing.getModelConfig = jest
      .fn()
      .mockReturnValue({ type: "text", cost: 5 });
    const users = (service as any).usersService;
    users.deductCredits = jest.fn().mockResolvedValue(true);
    users.logTransaction = jest.fn().mockResolvedValue(null);
    jest
      .spyOn(service, "getAiResponse")
      .mockResolvedValue({ reply: "Second answer", tokensUsed: 10 });
    const save = jest.spyOn(service, "saveMessage").mockResolvedValue({
      id: 21,
      content: "Second answer",
      model: "openai/gpt-4o",
      activity: ["Generated alternative answer"],
    } as any);

    const result = await service.generateAlternative(7, 20, "openai/gpt-4o");

    expect(result.alternativeToMessageId).toBe(20);
    expect(save).toHaveBeenCalledWith(
      expect.objectContaining({ id: 3 }),
      "Second answer",
      "bot",
      "openai/gpt-4o",
      7,
      undefined,
      null,
      expect.any(Array),
      expect.any(Array),
      20,
    );
    expect(original.content).toBe("First answer");
    expect(context).toHaveBeenCalledWith(
      expect.objectContaining({ id: 3 }),
      "Question",
    );
  });

  it("snapshots a selected skill when the first conversation is created", async () => {
    const repository = (service as any).conversationRepository;
    repository.create = (value: Record<string, unknown>) => ({
      ...value,
      id: 91,
    });
    repository.save = async (value: unknown) => value;
    const applyPreset = jest.fn().mockResolvedValue({ presetId: 6 });
    (service as any).workspaceService = { applyPreset };
    await (service as any).getOrCreateConversation(
      7,
      undefined,
      "First question",
      undefined,
      6,
    );
    expect(applyPreset).toHaveBeenCalledWith(7, 91, 6);
  });

  it("includes shared project instructions and file text in model context", async () => {
    (service as any).projectRepository = {
      findOne: jest.fn().mockResolvedValue({
        id: 4,
        userId: 7,
        name: "Research",
        instructions: "Use a concise tone",
        files: [
          {
            name: "brief.txt",
            mime_type: "text/plain",
            extracted_text: "Project-specific facts",
          },
        ],
      }),
    };
    const context = await (service as any).getProjectContext({
      id: 2,
      userId: 7,
      projectId: 4,
    });
    expect(context.text).toContain("Use a concise tone");
    expect(context.text).toContain("Project-specific facts");
    expect(context.sources).toEqual(["brief.txt"]);
    expect((service as any).projectRepository.findOne).toHaveBeenCalledWith({
      where: { id: 4, userId: 7 },
    });
  });

  it("adds earlier generated images to the library when it is opened", async () => {
    const messageRepository = (service as any).messageRepository;
    messageRepository.find = jest.fn().mockResolvedValue([
      {
        id: 30,
        model: "openai/dall-e-3",
        content: '<img src="https://example.test/image.png">',
      },
    ]);
    const libraryRepository = {
      find: jest
        .fn()
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ id: 8, sourceMessageId: 30 }]),
      create: jest.fn((value) => value),
      save: jest.fn(async (value) => value),
    };
    (service as any).libraryRepository = libraryRepository;

    const items = await service.listLibrary(7);

    expect(libraryRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 7,
        type: "image",
        url: "https://example.test/image.png",
        sourceMessageId: 30,
      }),
    );
    expect(items).toEqual([{ id: 8, sourceMessageId: 30 }]);
  });

  it("returns recent chat history in reading order", async () => {
    const conversationRepository = (service as any).conversationRepository;
    conversationRepository.findOne = jest
      .fn()
      .mockResolvedValue({ id: 3, userId: 7 });
    const messageRepository = (service as any).messageRepository;
    messageRepository.find = jest
      .fn()
      .mockResolvedValue([{ id: 12 }, { id: 11 }]);

    const result = await service.getConversationMessages(7, 3);

    expect(result.map((item) => item.id)).toEqual([11, 12]);
    expect(messageRepository.find).toHaveBeenCalledWith(
      expect.objectContaining({
        order: { id: "DESC" },
        take: 200,
      }),
    );
  });

  it("includes fresh workspace memory even outside a project", async () => {
    (service as any).workspaceService = {
      getAdditionalContext: async () => "Use metric units",
    };
    (service as any).conversationRepository.findOne = async () => ({
      id: 3,
      userId: 7,
      projectId: null,
    });
    const context = await (service as any).getProjectContext({
      id: 3,
      userId: 7,
      projectId: null,
    });
    expect(context.text).toContain("Use metric units");
  });

  it("preserves retained project files when adding and removing independently", async () => {
    const project: any = {
      id: 4,
      userId: 7,
      name: "Research",
      instructions: "Keep",
      files: [
        {
          id: "keep",
          name: "keep.txt",
          mime_type: "text/plain",
          extracted_text: "Retained source",
        },
        {
          id: "remove",
          name: "remove.txt",
          mime_type: "text/plain",
          extracted_text: "Remove source",
        },
      ],
    };
    (service as any).projectRepository = {
      findOne: async () => project,
      save: async (value: any) => value,
    };
    const saved = await service.saveProject(
      7,
      {
        name: "Research",
        files: [
          {
            name: "new.txt",
            mime_type: "text/plain",
            data: Buffer.from("New source").toString("base64"),
          },
        ],
        removeFileIds: ["remove"],
      },
      4,
    );
    expect(saved.files!.map((file: any) => file.name)).toEqual([
      "keep.txt",
      "new.txt",
    ]);
    expect(saved.files![0].extracted_text).toBe("Retained source");
    expect(saved.instructions).toBe("Keep");
  });

  it("rejects oversized attachments instead of silently dropping their content", async () => {
    await expect(
      (service as any).normalizeAttachedFiles([
        {
          name: "huge.txt",
          mime_type: "text/plain",
          data: "a".repeat(5500001),
        },
      ]),
    ).rejects.toThrow("too large");
  });

  it("removes a failed first turn together with the chat it created", async () => {
    const messageRepository = (service as any).messageRepository;
    const conversationRepository = (service as any).conversationRepository;
    messageRepository.delete = jest.fn().mockResolvedValue({ affected: 1 });
    messageRepository.count = jest.fn().mockResolvedValue(0);
    conversationRepository.delete = jest
      .fn()
      .mockResolvedValue({ affected: 1 });
    const result = await (service as any).rollbackFailedTurn(
      3,
      { conversation: { id: 40 }, userMessage: { id: 90 } },
      true,
    );
    expect(messageRepository.delete).toHaveBeenCalledWith({
      id: 90,
      conversationId: 40,
    });
    expect(conversationRepository.delete).toHaveBeenCalledWith({
      id: 40,
      userId: 3,
    });
    expect(result).toEqual({ conversationId: null, rolledBack: true });
  });

  it("keeps an existing chat and only removes the unanswered question", async () => {
    const messageRepository = (service as any).messageRepository;
    const conversationRepository = (service as any).conversationRepository;
    messageRepository.delete = jest.fn().mockResolvedValue({ affected: 1 });
    messageRepository.count = jest.fn();
    conversationRepository.delete = jest.fn();
    const result = await (service as any).rollbackFailedTurn(
      3,
      { conversation: { id: 41 }, userMessage: { id: 91 } },
      false,
    );
    expect(messageRepository.delete).toHaveBeenCalledWith({
      id: 91,
      conversationId: 41,
    });
    expect(conversationRepository.delete).not.toHaveBeenCalled();
    expect(result).toEqual({ conversationId: 41, rolledBack: true });
  });
});
