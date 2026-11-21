import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { randomBytes } from "crypto";
import { IsNull, LessThanOrEqual, Repository } from "typeorm";
import { Conversation } from "../conversation.entity";
import { Message } from "../message.entity";
import { WorkspaceRecord } from "../workspace/workspace-record.entity";
import { describeMapFences } from "../maps/maps-tools";

type ShareData = {
  conversationId: number;
  throughMessageId: number;
  sharedAt: string;
};

/** Fences a shared page shows as text, or not at all (memory, task cards). */
const FENCE = /```genyxo-([a-z-]+)\n([\s\S]*?)\n```/g;
function publicContent(content: string) {
  return describeMapFences(content)
    .replace(FENCE, (match, kind: string, json: string) => {
      try {
        const card = JSON.parse(json);
        if (kind === "task-run") return `⏰ ${card.title}`;
        if (kind === "media")
          return card.kind === "image" && card.status !== "failed"
            ? `![${String(card.title || "Image").replace(/[[\]]/g, "")}](/api/chat/media/${encodeURIComponent(card.id)})`
            : `_${card.kind === "video" ? "Video" : "Media"}: ${card.title || ""}_`;
        // Sources stay as data for the page to render; everything private goes.
        if (kind === "sources") return match;
        return "";
      } catch {
        return "";
      }
    })
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Public links to a chat, like ChatGPT's: a snapshot up to the moment of
 * sharing, readable without signing in. Messages written later stay private
 * until the owner updates the link; deleting the link or the chat ends it.
 */
@Injectable()
export class ShareService {
  constructor(
    @InjectRepository(WorkspaceRecord)
    private readonly records: Repository<WorkspaceRecord>,
    @InjectRepository(Conversation)
    private readonly conversations: Repository<Conversation>,
    @InjectRepository(Message) private readonly messages: Repository<Message>,
  ) {}

  private async owned(userId: number, conversationId: number) {
    const conversation = await this.conversations.findOne({
      where: { id: Number(conversationId), userId },
    });
    if (!conversation) throw new NotFoundException("Chat not found");
    return conversation;
  }
  private async record(userId: number, conversationId: number) {
    const rows = await this.records.find({ where: { userId, kind: "share" } });
    return (
      rows.find(
        (row) =>
          (row.data as ShareData).conversationId === Number(conversationId),
      ) || null
    );
  }
  private async latestMessageId(conversationId: number) {
    const latest = await this.messages.findOne({
      where: { conversationId },
      order: { id: "DESC" },
      select: { id: true },
    });
    return latest?.id || 0;
  }
  private view(row: WorkspaceRecord | null, latest: number) {
    if (!row) return { shared: false as const };
    const data = row.data as ShareData;
    return {
      shared: true as const,
      token: row.recordKey,
      path: `/share/${row.recordKey}`,
      sharedAt: data.sharedAt,
      upToDate: data.throughMessageId >= latest,
    };
  }

  async status(userId: number, conversationId: number) {
    const conversation = await this.owned(userId, conversationId);
    return this.view(
      await this.record(userId, conversation.id),
      await this.latestMessageId(conversation.id),
    );
  }

  /** Creates the link, or moves an existing one up to the latest message. */
  async share(userId: number, conversationId: number) {
    const conversation = await this.owned(userId, conversationId);
    const latest = await this.latestMessageId(conversation.id);
    if (!latest) throw new NotFoundException("This chat has no messages yet");
    const data: ShareData = {
      conversationId: conversation.id,
      throughMessageId: latest,
      sharedAt: new Date().toISOString(),
    };
    const existing = await this.record(userId, conversation.id);
    const row = existing
      ? Object.assign(existing, { data })
      : this.records.create({
          userId,
          kind: "share",
          recordKey: randomBytes(18).toString("base64url"),
          data,
        });
    return this.view(await this.records.save(row), latest);
  }

  async unshare(userId: number, conversationId: number) {
    const row = await this.record(
      userId,
      (await this.owned(userId, conversationId)).id,
    );
    if (row) await this.records.delete({ id: row.id, userId });
    return { shared: false };
  }

  /** What anyone with the link sees: title and messages, no files or private cards. */
  async publicView(token: string) {
    if (!/^[A-Za-z0-9_-]{16,40}$/.test(token))
      throw new NotFoundException("Link not found");
    const row = await this.records.findOne({
      where: { kind: "share", recordKey: token },
    });
    if (!row) throw new NotFoundException("Link not found");
    const data = row.data as ShareData;
    const conversation = await this.conversations.findOne({
      where: { id: data.conversationId, userId: row.userId },
    });
    if (!conversation) throw new NotFoundException("Link not found");
    const rows = await this.messages.find({
      where: {
        conversationId: conversation.id,
        id: LessThanOrEqual(data.throughMessageId),
        alternativeToMessageId: IsNull(),
      },
      order: { id: "ASC" },
      take: 300,
    });
    const messages = rows
      .map((message) => ({
        id: message.id,
        role: message.sender === "bot" ? "assistant" : "user",
        content: publicContent(message.content || ""),
        attachments: (message.files || [])
          .map((file) => file.name)
          .slice(0, 10),
        model: message.sender === "bot" ? message.model : undefined,
      }))
      .filter((message) => message.content || message.attachments.length);
    return {
      title: conversation.title,
      sharedAt: data.sharedAt,
      messages,
    };
  }
}
