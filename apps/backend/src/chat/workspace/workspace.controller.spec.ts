import { WorkspaceController } from "./workspace.controller";
import { WorkspaceService } from "./workspace.service";
import { ChatService } from "../chat.service";

it("includes generated media in the new filtered library route", async () => {
  const items: Array<{ id: number; type: string }> = [];
  const chat = {
    listLibrary: async (userId: number) => {
      expect(userId).toBe(7);
      items.push({ id: 11, type: "image" });
    },
  };
  const workspace = {
    indexGeneratedMedia: async (userId: number) => {
      expect(userId).toBe(7);
      items.push({ id: 12, type: "audio" });
    },
    listLibrary: async (userId: number, query: { tab: string }) => {
      expect(userId).toBe(7);
      expect(query.tab).toBe("images");
      return { items, hasMore: false };
    },
  };
  const controller = new WorkspaceController(
    workspace as unknown as WorkspaceService,
    chat as unknown as ChatService,
  );
  expect(
    await controller.library({ user: { id: 7 } }, { tab: "images" }),
  ).toEqual({
    items: [
      { id: 11, type: "image" },
      { id: 12, type: "audio" },
    ],
    hasMore: false,
  });
});
