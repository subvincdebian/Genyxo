"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent, type ReactNode, type SyntheticEvent } from "react";
import { workspaceRequest, useWorkspace } from "@/features/workspace";
import { WorkspaceDialog, WorkspaceIcon, WorkspaceMenu, WorkspaceTooltip } from "@/shared/ui/workspace";
import { ConfirmDelete, Field, Form, FormFooter, jsonBody, ResourceState, Search, tabKeys, useAction, useLabels, usePageQuery, useResource, type Id } from "./page-tools";
import "./library-page.css";

type Kind = "document" | "image" | "video" | "audio";
type LibraryItem = { id: Id; name: string; type: Kind; url?: string | null; content?: string | null; isFavorite: boolean; folderId?: Id | null; sourceMessageId?: Id | null; conversationId?: Id | null; createdAt?: string };
type Folder = { id: Id; name: string };
type LibraryResponse = { items: LibraryItem[]; folders: Folder[]; hasMore: boolean };
type Edit = { kind: "document" | "folder"; id?: Id; name: string; content?: string };
type Label = ReturnType<typeof useLabels>;

const KIND_ICON: Record<Kind, string> = { image: "image", video: "video", audio: "mic", document: "file" };
const kindLabel = (l: Label, kind: Kind) => kind === "image" ? l("image", "Image") : kind === "video" ? l("video", "Video") : kind === "audio" ? l("audio", "Audio") : l("document", "Document");
/** Generated media keeps its prompt in `content`; documents keep their text there. */
const isGenerated = (item: LibraryItem) => !!item.url?.startsWith("/api/chat/media/");
const fileName = (item: LibraryItem) => {
  const base = item.name.replace(/[\\/:*?"<>|]+/g, " ").trim().slice(0, 80) || "genyxo";
  if (/\.[a-z0-9]{2,4}$/i.test(base)) return base;
  return `${base}.${item.type === "image" ? "png" : item.type === "video" ? "mp4" : item.type === "audio" ? "wav" : "txt"}`;
};

export function WorkspaceLibraryPage() {
  const l = useLabels(); const workspace = useWorkspace(); const [query, setQuery] = usePageQuery();
  const tab = ["recommended", "favorites", "folders", "images", "all"].includes(query.get("tab") || "") ? query.get("tab")! : "recommended";
  const folderId = query.get("folderId") || ""; const sort = query.get("sort") || "date";
  const [search, setSearch] = useState(""); const [type, setType] = useState("");
  const path = `library?${new URLSearchParams({ tab, search, folderId, sort, ...(type ? { type } : {}) })}`;
  const resource = useResource<LibraryResponse>(path);
  const [extra, setExtra] = useState<{ path: string; items: LibraryItem[]; hasMore: boolean } | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [uploading, setUploading] = useState(false);
  const items = [...(resource.data?.items || []), ...(extra?.path === path ? extra.items : [])];
  const folders = resource.data?.folders || [];
  const [menu, setMenu] = useState<{ x: number; y: number; item?: LibraryItem; folder?: Folder } | null>(null);
  const [createMenu, setCreateMenu] = useState(false); const [filterMenu, setFilterMenu] = useState(false);
  const [edit, setEdit] = useState<Edit | null>(null); const [viewing, setViewing] = useState<Id | null>(null);
  const [move, setMove] = useState<LibraryItem | null>(null); const [deleting, setDeleting] = useState<{ id: Id; name: string; kind: "library" | "folders" } | null>(null);
  const upload = useRef<HTMLInputElement>(null); const createButton = useRef<HTMLButtonElement>(null); const filterButton = useRef<HTMLButtonElement>(null);
  const action = useAction();
  const refresh = () => { setExtra(null); resource.reload(); };
  const mutate = async (path: string, init?: RequestInit) => { const result = await workspaceRequest(path, init); refresh(); return result; };
  const [viewOverride, setViewOverride] = useState<"grid" | "list" | null>(null);
  const view = viewOverride || workspace.preferences?.libraryView || "grid";
  const changeView = async (value: "grid" | "list") => { if (await action.run(() => workspaceRequest("preferences", jsonBody({ libraryView: value }, "PATCH")))) { setViewOverride(value); void workspace.refresh(); } };
  const loadMore = async () => {
    setLoadingMore(true);
    await action.run(async () => { const result = await workspaceRequest<LibraryResponse>(`${path}&offset=${items.length}`); setExtra({ path, items: [...(extra?.path === path ? extra.items : []), ...result.items], hasMore: result.hasMore }); });
    setLoadingMore(false);
  };
  const uploadFile = async (file?: File) => {
    if (!file) return;
    setUploading(true);
    await action.run(async () => {
      if (file.size > 5_000_000) throw new Error(l("fileLimit", "Choose a file smaller than 5 MB."));
      const type = file.type.startsWith("image/") ? "image" : file.type.startsWith("video/") ? "video" : file.type.startsWith("audio/") ? "audio" : "document";
      if (type === "document" && !/\.(txt|md|csv|json|log|xml|html?)$/i.test(file.name)) throw new Error(l("textFormats", "Upload a text, Markdown, CSV, JSON, image, video or audio file."));
      const body: Record<string, unknown> = { name: file.name, type, folderId: folderId ? Number(folderId) : null };
      if (type === "document") body.content = await file.text();
      else { body.mime_type = file.type; body.data = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result).split(",")[1]); reader.onerror = () => reject(new Error(l("fileReadError", "Unable to read this file"))); reader.readAsDataURL(file); }); }
      await mutate("library", jsonBody(body));
    });
    if (upload.current) upload.current.value = "";
    setUploading(false);
  };
  const favorite = (item: LibraryItem) => action.run(() => mutate(`library/${item.id}`, jsonBody({ isFavorite: !item.isFavorite }, "PATCH")));
  const favoriteLabel = (item: LibraryItem) => `${item.isFavorite ? l("removeFavorite", "Remove") : l("addFavorite", "Add")} ${item.name} ${item.isFavorite ? l("fromFavorites", "from favorites") : l("toFavorites", "to favorites")}`;
  const openMenu = (item: LibraryItem, element: HTMLElement) => { const box = element.getBoundingClientRect(); setMenu({ x: box.right - 220, y: box.bottom + 6, item }); };
  const showFolders = tab === "folders" && !folderId;
  /** Focus returns to the tile of the item last shown, which may differ from the one opened. */
  const closeViewer = (id: Id) => { setViewing(null); requestAnimationFrame(() => document.querySelector<HTMLElement>(`.lb-open[data-lb-item="${String(id)}"]`)?.focus({ preventScroll: false })); };
  const viewed = items.find((item) => item.id === viewing) || null;
  const tabs = [["recommended", l("recommended", "Recommended")], ["favorites", l("favorites", "Favorites")], ["folders", l("folders", "Folders")], ["images", l("images", "Images")], ["all", l("all", "All")]];
  const types: Array<[string, string]> = [["", l("allTypes", "All types")], ["image", l("images", "Images")], ["video", l("videos", "Videos")], ["audio", l("audio", "Audio")], ["document", l("documents", "Documents")]];

  return <section className="wp-library lb-page" aria-labelledby="library-title">
    <header className="lb-head">
      <h1 id="library-title">{l("library", "Library")}</h1>
      <div className="lb-toolbar">
        <WorkspaceTooltip label={l("filter", "Filter")} side="bottom"><button ref={filterButton} className={`lb-icon${type || sort !== "date" ? " is-on" : ""}`} aria-label={l("filter", "Filter")} aria-expanded={filterMenu} onClick={() => setFilterMenu(!filterMenu)}><svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true"><path d="M3.5 6h13M6 10h8M8.5 14h3" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg></button></WorkspaceTooltip>
        {filterMenu && <WorkspaceMenu onClose={() => setFilterMenu(false)} className="lb-menu">
          <p className="lb-menu-label">{l("type", "Type")}</p>
          {types.map(([value, name]) => <button key={value || "all"} role="menuitemradio" aria-checked={type === value} onClick={() => { setType(value); setFilterMenu(false); }}>{name}{type === value && <WorkspaceIcon name="check" size={16} />}</button>)}
          <hr />
          <p className="lb-menu-label">{l("sort", "Sort")}</p>
          {([["date", l("newest", "Newest first")], ["name", l("byName", "Name")]] as const).map(([value, name]) => <button key={value} role="menuitemradio" aria-checked={sort === value} onClick={() => { setQuery({ sort: value === "date" ? null : value }); setFilterMenu(false); }}>{name}{sort === value && <WorkspaceIcon name="check" size={16} />}</button>)}
        </WorkspaceMenu>}
        <div className="lb-views" role="group" aria-label={l("view", "View")}>
          <WorkspaceTooltip label={l("gridView", "Grid view")} side="bottom"><button aria-label={l("gridView", "Grid view")} aria-pressed={view === "grid"} onClick={() => void changeView("grid")}><WorkspaceIcon name="grid" /></button></WorkspaceTooltip>
          <WorkspaceTooltip label={l("listView", "List view")} side="bottom"><button aria-label={l("listView", "List view")} aria-pressed={view === "list"} onClick={() => void changeView("list")}><WorkspaceIcon name="list" /></button></WorkspaceTooltip>
        </div>
        <div className="lb-search"><Search value={search} onChange={setSearch} label={l("searchLibrary", "Search library")} /></div>
        <button ref={createButton} className="lb-create" aria-expanded={createMenu} onClick={() => setCreateMenu(!createMenu)}>{l("create", "Create")}<WorkspaceIcon name="chevron-down" size={16} /></button>
        {createMenu && <WorkspaceMenu onClose={() => setCreateMenu(false)} className="lb-menu">
          <button role="menuitem" onClick={() => { setEdit({ kind: "document", name: "", content: "" }); setCreateMenu(false); }}><WorkspaceIcon name="file" size={18} />{l("newDocument", "New document")}</button>
          <button role="menuitem" onClick={() => { setEdit({ kind: "folder", name: "" }); setCreateMenu(false); }}><WorkspaceIcon name="folder" size={18} />{l("newFolder", "New folder")}</button>
          <button role="menuitem" onClick={() => { upload.current?.click(); setCreateMenu(false); }}><WorkspaceIcon name="upload" size={18} />{l("uploadFile", "Upload file")}</button>
        </WorkspaceMenu>}
        <input ref={upload} type="file" hidden onChange={(event) => void uploadFile(event.target.files?.[0])} accept=".txt,.md,.csv,.json,.log,.xml,.html,image/*,video/*,audio/*" />
      </div>
    </header>
    <div className="lb-tabs" role="tablist" onKeyDown={tabKeys} aria-label={l("librarySections", "Library sections")}>{tabs.map(([id, name]) => <button key={id} role="tab" aria-selected={tab === id} tabIndex={tab === id ? 0 : -1} onClick={() => setQuery({ tab: id, folderId: null })}>{name}</button>)}</div>
    {folderId && <button className="lb-back" aria-label={l("allFolders", "All folders")} onClick={() => setQuery({ folderId: null })}><WorkspaceIcon name="arrow-left" size={18} />{l("allFolders", "All folders")}</button>}
    {action.error && <p className="wp-error" role="alert">{action.error}</p>}
    {uploading && <p className="wp-muted" role="status"><progress aria-label={l("uploading", "Uploading file…")} /> {l("uploading", "Uploading file…")}</p>}
    <ResourceState icon={search ? "search" : tab === "images" ? "image" : tab === "favorites" ? "heart" : tab === "folders" ? "folder" : "library"} loading={resource.loading} error={resource.error} retry={refresh} empty={!resource.loading && !resource.error && (showFolders ? folders.length === 0 : items.length === 0)} emptyTitle={search ? l("noResults", "No results found") : l("libraryEmpty", "Your library is ready for something new")} emptyText={search ? l("trySearch", "Try a different search or clear your filters.") : l("libraryEmptyHint", "Images, videos and audio you make in chat appear here. You can also save documents.")} />
    {!resource.loading && !resource.error && showFolders && <div className="lb-folders">{folders.map((folder) => <article className="lb-folder" key={folder.id}>
      <button className="lb-folder-open" aria-label={`${l("openFolder", "Open folder")} ${folder.name}`} onClick={() => setQuery({ folderId: String(folder.id) })}><WorkspaceIcon name="folder" size={26} /><span>{folder.name}</span></button>
      <WorkspaceTooltip label={`${l("folderActions", "Folder actions")} ${folder.name}`} side="bottom"><button className="lb-icon lb-small" aria-label={`${l("folderActions", "Folder actions")} ${folder.name}`} onClick={(event) => setMenu({ x: event.clientX, y: event.clientY, folder })}><WorkspaceIcon name="more" size={18} /></button></WorkspaceTooltip>
    </article>)}</div>}
    {!resource.loading && !resource.error && !showFolders && items.length > 0 && <Masonry list={view === "list"} busy={loadingMore} items={items} render={(item, index) => <article className={`lb-tile lb-kind-${item.type}`} key={item.id} style={{ animationDelay: `${Math.min(index, 12) * 35}ms` }}>
        <button className="lb-open" data-lb-item={item.id} aria-label={`${l("open", "Open")} ${item.name}`} onClick={() => setViewing(item.id)}>
          <Thumb item={item} l={l} list={view === "list"} />
          {view === "list" && <span className="lb-row-text"><strong>{item.name}</strong><span>{kindLabel(l, item.type)}{item.createdAt ? ` · ${new Date(item.createdAt).toLocaleDateString()}` : ""}</span></span>}
        </button>
        <div className="lb-tile-actions">
          <WorkspaceTooltip label={favoriteLabel(item)} side="bottom"><button className={`lb-icon lb-small${item.isFavorite ? " is-on" : ""}`} disabled={action.busy} aria-label={favoriteLabel(item)} aria-pressed={item.isFavorite} onClick={() => void favorite(item)}><WorkspaceIcon name={item.isFavorite ? "star-filled" : "star"} size={17} /></button></WorkspaceTooltip>
          <WorkspaceTooltip label={`${l("itemActions", "Actions for")} ${item.name}`} side="bottom"><button className="lb-icon lb-small" aria-label={`${l("itemActions", "Actions for")} ${item.name}`} onClick={(event) => openMenu(item, event.currentTarget)}><WorkspaceIcon name="more" size={18} /></button></WorkspaceTooltip>
        </div>
      </article>} />}
    {!resource.loading && (extra?.path === path ? extra.hasMore : resource.data?.hasMore) && <button className="lb-more" disabled={loadingMore} onClick={() => void loadMore()}>{l("loadMore", "Load more")}</button>}
    {menu && <WorkspaceMenu anchor={menu} onClose={() => setMenu(null)}>
      {menu.item?.url && <a role="menuitem" href={menu.item.url} download={fileName(menu.item)} onClick={() => setMenu(null)}><WorkspaceIcon name="download" size={18} />{l("download", "Download")}</a>}
      <button role="menuitem" onClick={() => { setEdit({ kind: menu.folder ? "folder" : "document", id: menu.folder?.id || menu.item!.id, name: menu.folder?.name || menu.item!.name, content: menu.item?.type === "document" ? menu.item.content || "" : undefined }); setMenu(null); }}><WorkspaceIcon name="edit" size={18} />{l("rename", "Rename")}</button>
      {menu.item && <button role="menuitem" onClick={() => { setMove(menu.item!); setMenu(null); }}><WorkspaceIcon name="folder" size={18} />{l("moveToFolder", "Move to folder")}</button>}
      <hr />
      <button role="menuitem" className="lb-danger" onClick={() => { setDeleting({ id: menu.folder?.id || menu.item!.id, name: menu.folder?.name || menu.item!.name, kind: menu.folder ? "folders" : "library" }); setMenu(null); }}><WorkspaceIcon name="trash" size={18} />{l("delete", "Delete")}</button>
    </WorkspaceMenu>}
    {edit && <LibraryEditor edit={edit} onClose={() => setEdit(null)} onSave={(body) => mutate(`${edit.kind === "folder" ? "folders" : "library"}${edit.id ? `/${edit.id}` : ""}`, jsonBody({ ...body, ...(!edit.id && edit.kind === "document" ? { type: "document", folderId: folderId ? Number(folderId) : null } : {}) }, edit.id ? "PATCH" : "POST"))} />}
    {move && <MoveDialog item={move} folders={folders} onClose={() => setMove(null)} onSave={(folderId) => mutate(`library/${move.id}`, jsonBody({ folderId }, "PATCH"))} />}
    {deleting && <ConfirmDelete name={deleting.name} message={deleting.kind === "folders" ? l("deleteFolderConfirm", "Delete this folder? Materials will stay in the library.") : undefined} onClose={() => setDeleting(null)} onDelete={() => mutate(`${deleting.kind}/${deleting.id}`, { method: "DELETE" })} />}
    {viewed && <LibraryViewer item={viewed} items={items} onNavigate={setViewing} onClose={() => closeViewer(viewed.id)} onFavorite={() => void favorite(viewed)}
      onDelete={() => { setViewing(null); setDeleting({ id: viewed.id, name: viewed.name, kind: "library" }); }}
      onRename={() => { setViewing(null); setEdit({ kind: "document", id: viewed.id, name: viewed.name, content: viewed.type === "document" ? viewed.content || "" : undefined }); }}
      onMove={() => { setViewing(null); setMove(viewed); }} />}
  </section>;
}

/**
 * Round-robin columns keep the newest items along the first row, like
 * ChatGPT's library, while each column stacks tiles at their own height.
 */
function Masonry({ items, list, busy, render }: { items: LibraryItem[]; list: boolean; busy: boolean; render: (item: LibraryItem, index: number) => ReactNode }) {
  const ref = useRef<HTMLDivElement>(null); const [count, setCount] = useState(4);
  useEffect(() => {
    const element = ref.current; if (!element || list) return;
    const update = () => setCount(Math.max(2, Math.floor((element.clientWidth + 16) / (232 + 16))));
    update();
    const observer = new ResizeObserver(update); observer.observe(element);
    return () => observer.disconnect();
  }, [list]);
  if (list) return <div className="lb-list" aria-busy={busy}>{items.map(render)}</div>;
  const columns: Array<Array<[LibraryItem, number]>> = Array.from({ length: count }, () => []);
  items.forEach((item, index) => columns[index % count].push([item, index]));
  return <div ref={ref} className="lb-grid" aria-busy={busy}>{columns.map((column, index) => <div className="lb-col" key={index}>{column.map(([item, position]) => render(item, position))}</div>)}</div>;
}

function Thumb({ item, l, list }: { item: LibraryItem; l: Label; list: boolean }) {
  const [failed, setFailed] = useState(false);
  const broken = () => setFailed(true);
  if (item.type === "image" && item.url && !failed) return <span className="lb-thumb"><img src={item.url} alt="" loading="lazy" decoding="async" onError={broken} /></span>;
  if (item.type === "video" && item.url && !failed) return <span className="lb-thumb lb-thumb-video">
    {/* The first frame is the poster; #t nudges Safari to paint it. */}
    <video src={`${item.url}#t=0.1`} muted playsInline preload="metadata" onError={broken} aria-hidden="true" tabIndex={-1} />
    <span className="lb-badge"><WorkspaceIcon name="play" size={list ? 12 : 16} /></span>
  </span>;
  if (item.type === "audio") return <span className="lb-thumb lb-thumb-audio">
    <span className="lb-wave" aria-hidden="true">{Array.from({ length: list ? 5 : 28 }, (_, index) => <i key={index} style={{ height: `${22 + Math.abs(Math.sin((index + item.name.length) * 1.7)) * 70}%` }} />)}</span>
    {!list && <span className="lb-thumb-caption"><WorkspaceIcon name="mic" size={16} />{item.name}</span>}
  </span>;
  if (item.type === "document") return <span className="lb-thumb lb-thumb-doc">
    {list ? <WorkspaceIcon name="file" size={20} /> : <><strong>{item.name}</strong><span>{item.content?.slice(0, 260) || l("document", "Document")}</span></>}
  </span>;
  return <span className="lb-thumb lb-thumb-missing"><WorkspaceIcon name={KIND_ICON[item.type]} size={list ? 20 : 30} />{!list && <span>{item.name}</span>}</span>;
}

const ZOOMS = [0.25, 0.5, 0.75, 1, 1.5, 2];

/** Full-screen viewer, as in ChatGPT's library: media in the middle, tools around it. */
function LibraryViewer({ item, items, onNavigate, onClose, onFavorite, onDelete, onRename, onMove }: { item: LibraryItem; items: LibraryItem[]; onNavigate: (id: Id) => void; onClose: () => void; onFavorite: () => void; onDelete: () => void; onRename: () => void; onMove: () => void }) {
  const l = useLabels(); const workspace = useWorkspace();
  const ref = useRef<HTMLDialogElement>(null); const stage = useRef<HTMLDivElement>(null);
  const kindButton = useRef<HTMLButtonElement>(null); const zoomButton = useRef<HTMLButtonElement>(null);
  const [kindMenu, setKindMenu] = useState(false); const [zoomMenu, setZoomMenu] = useState(false);
  const [zoom, setZoom] = useState<number | "fit">("fit"); const [fitScale, setFitScale] = useState(1);
  const [natural, setNatural] = useState<{ width: number; height: number } | null>(null);
  const [question, setQuestion] = useState(""); const [sending, setSending] = useState(false);
  const index = items.findIndex((entry) => entry.id === item.id);
  const previous = index > 0 ? items[index - 1] : null; const next = index >= 0 && index < items.length - 1 ? items[index + 1] : null;

  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal(); document.documentElement.classList.add("lb-viewer-open");
    return () => { dialog?.close(); document.documentElement.classList.remove("lb-viewer-open"); };
  }, []);
  const measure = useCallback(() => {
    const box = stage.current?.getBoundingClientRect();
    if (!box || !natural) return;
    setFitScale(Math.min(1, (box.width - 48) / natural.width, (box.height - 48) / natural.height));
  }, [natural]);
  useEffect(() => { measure(); window.addEventListener("resize", measure); return () => window.removeEventListener("resize", measure); }, [measure]);
  useEffect(() => {
    const keys = (event: KeyboardEvent) => {
      if ((event.target as HTMLElement)?.closest?.("input,textarea,[role=menu]")) return;
      if (event.key === "ArrowLeft" && previous) { event.preventDefault(); onNavigate(previous.id); }
      if (event.key === "ArrowRight" && next) { event.preventDefault(); onNavigate(next.id); }
    };
    document.addEventListener("keydown", keys);
    return () => document.removeEventListener("keydown", keys);
  }, [previous, next, onNavigate]);

  const scale = zoom === "fit" ? fitScale : zoom;
  const onImage = (event: SyntheticEvent<HTMLImageElement>) => setNatural({ width: event.currentTarget.naturalWidth, height: event.currentTarget.naturalHeight });
  const go = (target: LibraryItem | null) => { if (!target) return; setNatural(null); setZoom("fit"); onNavigate(target.id); };
  const prompt = isGenerated(item) ? item.content || "" : "";
  const copy = async (text: string, done: string) => { try { await navigator.clipboard.writeText(text); workspace.notify(done); } catch { workspace.notify(l("copyFailed", "Copy failed. Select the text and copy it manually."), "error"); } };
  const share = async () => {
    if (!item.url) { if (item.content) await copy(item.content, l("textCopied", "Text copied")); return; }
    const url = new URL(item.url, window.location.origin).href;
    // The media link itself grants access: anyone who has it can open the file.
    if (navigator.share) { try { await navigator.share({ title: item.name, url }); return; } catch (error) { if ((error as Error).name === "AbortError") return; } }
    await copy(url, l("linkCopied", "Link copied"));
  };
  /** A new chat with this file attached; the composer receives it like a manual upload. */
  const toChat = async (text: string, send: boolean) => {
    setSending(true);
    try {
      const files: File[] = [];
      if (item.url) {
        const blob = await (await fetch(item.url)).blob();
        files.push(new File([blob], fileName(item), { type: blob.type }));
      } else if (item.content) files.push(new File([item.content], fileName(item), { type: "text/plain" }));
      onClose();
      workspace.startNewChat();
      requestAnimationFrame(() => document.dispatchEvent(new CustomEvent("genyxo:composer-draft", { detail: { text, files, send } })));
    } catch { workspace.notify(l("mediaUnavailable", "This media is no longer available."), "error"); setSending(false); }
  };
  const ask = (event: FormEvent) => { event.preventDefault(); if (question.trim() && !sending) void toChat(question.trim(), true); };
  const tools: Array<{ icon: string; label: string; run: () => void; on?: boolean }> = [
    ...(item.type === "image" ? [
      { icon: "draw", label: l("editInChat", "Edit"), run: () => void toChat(l("editImageDraft", "Edit this image: "), false) },
      { icon: "sparkles", label: l("variation", "Variation"), run: () => void toChat(l("variationDraft", "Create a variation of this image"), false) },
      { icon: "video", label: l("animate", "Animate"), run: () => void toChat(l("animateDraft", "Turn this image into a short video"), false) },
    ] : []),
    { icon: item.isFavorite ? "star-filled" : "star", label: item.isFavorite ? l("favorites", "Favorites") : l("favorite", "Favorite"), run: onFavorite, on: item.isFavorite },
    ...(prompt ? [{ icon: "copy", label: l("copyPrompt", "Copy prompt"), run: () => void copy(prompt, l("textCopied", "Text copied")) }] : []),
  ];

  return <dialog ref={ref} className="lb-viewer" aria-label={item.name} onCancel={(event) => { event.preventDefault(); onClose(); }}>
    <div className="lb-viewer-top">
      <button ref={kindButton} className="lb-pill" aria-expanded={kindMenu} onClick={() => setKindMenu(!kindMenu)}><WorkspaceIcon name={KIND_ICON[item.type]} size={18} /><span>{kindLabel(l, item.type)}</span><WorkspaceIcon name="chevron-down" size={14} /></button>
      {kindMenu && <WorkspaceMenu onClose={() => setKindMenu(false)} className="lb-menu">
        {item.conversationId && <button role="menuitem" onClick={() => { setKindMenu(false); onClose(); workspace.selectChat(Number(item.conversationId)); }}><WorkspaceIcon name="external" size={18} />{l("sourceChat", "Open source chat")}</button>}
        <button role="menuitem" onClick={() => { setKindMenu(false); onRename(); }}><WorkspaceIcon name="edit" size={18} />{l("rename", "Rename")}</button>
        <button role="menuitem" onClick={() => { setKindMenu(false); onMove(); }}><WorkspaceIcon name="folder" size={18} />{l("moveToFolder", "Move to folder")}</button>
        <hr />
        <button role="menuitem" className="lb-danger" onClick={() => { setKindMenu(false); onDelete(); }}><WorkspaceIcon name="trash" size={18} />{l("delete", "Delete")}</button>
      </WorkspaceMenu>}
      <p className="lb-viewer-title">{item.name}</p>
      <div className="lb-viewer-actions">
        {item.type === "image" && natural && <button ref={zoomButton} className="lb-pill" aria-label={l("zoom", "Zoom")} aria-expanded={zoomMenu} onClick={() => setZoomMenu(!zoomMenu)}><span>{Math.round(scale * 100)} %</span><WorkspaceIcon name="chevron-down" size={14} /></button>}
        {zoomMenu && <WorkspaceMenu onClose={() => setZoomMenu(false)} className="lb-menu lb-zoom-menu">
          <button role="menuitemradio" aria-checked={zoom === "fit"} onClick={() => { setZoom("fit"); setZoomMenu(false); }}>{l("fitToScreen", "Fit")}{zoom === "fit" && <WorkspaceIcon name="check" size={16} />}</button>
          {ZOOMS.map((value) => <button key={value} role="menuitemradio" aria-checked={zoom === value} onClick={() => { setZoom(value); setZoomMenu(false); }}>{value * 100} %{zoom === value && <WorkspaceIcon name="check" size={16} />}</button>)}
        </WorkspaceMenu>}
        {(item.url || item.content) && <WorkspaceTooltip label={l("download", "Download")} side="bottom"><a className="lb-round" aria-label={l("download", "Download")} href={item.url || `data:text/plain;charset=utf-8,${encodeURIComponent(item.content || "")}`} download={fileName(item)}><WorkspaceIcon name="download" size={19} /></a></WorkspaceTooltip>}
        <button className="lb-pill" onClick={() => void share()}><WorkspaceIcon name="share" size={18} /><span>{l("share", "Share")}</span></button>
        <WorkspaceTooltip label={l("closeViewer", "Close")} side="bottom"><button className="lb-round" aria-label={l("closeViewer", "Close")} autoFocus onClick={() => onClose()}><WorkspaceIcon name="close" size={19} /></button></WorkspaceTooltip>
      </div>
    </div>
    <div ref={stage} className={`lb-stage${zoom !== "fit" && item.type === "image" ? " is-zoomed" : ""}`} onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      {previous && <WorkspaceTooltip label={l("previousItem", "Previous")} side="right"><button className="lb-nav lb-nav-prev" aria-label={l("previousItem", "Previous")} onClick={() => go(previous)}><WorkspaceIcon name="arrow-left" size={20} /></button></WorkspaceTooltip>}
      <div className="lb-media" key={item.id}>
        {item.type === "image" && item.url ? <img src={item.url} alt={item.name} onLoad={onImage} style={natural ? { width: natural.width * scale, height: natural.height * scale } : undefined} />
          : item.type === "video" && item.url ? <video src={item.url} controls autoPlay playsInline />
          : item.type === "audio" && item.url ? <div className="lb-audio"><span className="lb-wave lb-wave-big" aria-hidden="true">{Array.from({ length: 48 }, (_, index) => <i key={index} style={{ height: `${18 + Math.abs(Math.sin((index + 3) * 1.3)) * 78}%` }} />)}</span><strong>{item.name}</strong><audio src={item.url} controls autoPlay /></div>
          : item.type === "document" ? <article className="lb-doc"><h2>{item.name}</h2><pre>{item.content || l("noPreview", "No preview available")}</pre></article>
          : <p className="lb-missing">{l("mediaUnavailable", "This media is no longer available.")}</p>}
      </div>
      {next && <WorkspaceTooltip label={l("nextItem", "Next")} side="bottom"><button className="lb-nav lb-nav-next" aria-label={l("nextItem", "Next")} onClick={() => go(next)}><WorkspaceIcon name="arrow" size={20} /></button></WorkspaceTooltip>}
    </div>
    <div className="lb-viewer-bottom">
      {prompt && <p className="lb-prompt" title={prompt}><WorkspaceIcon name="sparkles" size={15} />{prompt}</p>}
      <div className="lb-dock" role="toolbar" aria-label={l("itemActions", "Actions for")}>
        {tools.map((tool) => <button key={tool.label} className={tool.on ? "is-on" : ""} aria-pressed={tool.on ?? undefined} disabled={sending} onClick={tool.run}><WorkspaceIcon name={tool.icon} size={17} /><span>{tool.label}</span></button>)}
      </div>
      <form className="lb-ask" onSubmit={ask}>
        <input value={question} onChange={(event) => setQuestion(event.target.value)} placeholder={l("askAboutFile", "Ask about this file")} aria-label={l("askAboutFile", "Ask about this file")} maxLength={2000} disabled={sending} />
        <WorkspaceTooltip label={l("send", "Send")} side="bottom"><button type="submit" aria-label={l("send", "Send")} disabled={!question.trim() || sending}>{sending ? <span className="lb-spinner" aria-hidden="true" /> : <WorkspaceIcon name="arrow-up" size={18} />}</button></WorkspaceTooltip>
      </form>
    </div>
  </dialog>;
}

function LibraryEditor({ edit, onClose, onSave }: { edit: Edit; onClose: () => void; onSave: (body: { name: string; content?: string }) => Promise<unknown> }) {
  const l = useLabels(); const [name, setName] = useState(edit.name); const [content, setContent] = useState(edit.content || ""); const action = useAction(onClose);
  const submit = (event: FormEvent) => { event.preventDefault(); if (name.trim()) void action.run(() => onSave({ name: name.trim(), ...(edit.content !== undefined ? { content } : {}) })); };
  return <WorkspaceDialog title={edit.id ? l("edit", "Edit") : edit.kind === "folder" ? l("newFolder", "New folder") : l("newDocument", "New document")} onClose={onClose}><Form noValidate className="wp-form" onSubmit={submit}><Field label={l("name", "Name")}><input autoFocus required maxLength={200} value={name} onChange={(event) => setName(event.target.value)} /></Field>{edit.kind === "document" && edit.content !== undefined && <Field label={l("content", "Content")}><textarea className="resize-none" rows={10} maxLength={100000} value={content} onChange={(event) => setContent(event.target.value)} /></Field>}<FormFooter {...action} onClose={onClose} /></Form></WorkspaceDialog>;
}
function MoveDialog({ item, folders, onClose, onSave }: { item: LibraryItem; folders: Folder[]; onClose: () => void; onSave: (id: number | null) => Promise<unknown> }) {
  const l = useLabels(); const [folder, setFolder] = useState(String(item.folderId || "")); const action = useAction(onClose);
  return <WorkspaceDialog title={l("moveToFolder", "Move to folder")} onClose={onClose}><Form noValidate className="wp-form" onSubmit={(event) => { event.preventDefault(); void action.run(() => onSave(folder ? Number(folder) : null)); }}><Field label={l("folder", "Folder")}><select value={folder} onChange={(event) => setFolder(event.target.value)}><option value="">{l("noFolder", "No folder")}</option>{folders.map((folder) => <option key={folder.id} value={folder.id}>{folder.name}</option>)}</select></Field><FormFooter {...action} onClose={onClose} /></Form></WorkspaceDialog>;
}
