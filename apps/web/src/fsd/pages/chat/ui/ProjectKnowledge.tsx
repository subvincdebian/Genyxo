"use client";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { useWorkspace } from "@/features/workspace";
import { WorkspaceDialog, WorkspaceIcon, WorkspaceTooltip } from "@/shared/ui/workspace";

type Kind = "file" | "url" | "gdrive" | "notion";
type Source = {
  id: number;
  kind: Kind;
  title: string;
  url: string | null;
  mimeType: string | null;
  size: number;
  status: "processing" | "ready" | "failed";
  error: string | null;
  pages: number;
  chunks: number;
  syncedAt: string | null;
};
type Hit = { n: number; sourceId: number; chunkId: number; label: string; heading: string | null; text: string };
type DriveFile = { id: string; name: string; mimeType: string; modifiedTime?: string };
type Pending = { key: string; title: string; kind: Kind };
type Adding = null | "url" | "gdrive" | "notion";

const MAX_BYTES = 20 * 1024 * 1024;
const KIND_LABEL: Record<Kind, string> = { file: "File", url: "Website", gdrive: "Google Drive", notion: "Notion" };

function ago(iso: string | null) {
  if (!iso) return "";
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  if (minutes < 1440) return `${Math.round(minutes / 60)} h ago`;
  return new Date(iso).toLocaleDateString("en", { month: "short", day: "numeric" });
}

function KindIcon({ kind }: { kind: Kind }) {
  if (kind === "gdrive") return <img src="/images/plugins/google-drive.svg" alt="" width={18} height={18} />;
  if (kind === "notion") return <img className="gx-kb-notion" src="/images/plugins/notion.svg" alt="" width={18} height={18} />;
  return <WorkspaceIcon name={kind === "url" ? "link" : "file"} size={18} />;
}

const readBase64 = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error(`Unable to read ${file.name}`));
    reader.onload = () => resolve(String(reader.result).split(",")[1] || "");
    reader.readAsDataURL(file);
  });

/**
 * A project's knowledge base: PDFs and documents, web pages, Google Drive files
 * and Notion pages that every model in the project answers from, with page
 * citations.
 */
export function ProjectKnowledge({ projectId }: { projectId: number }) {
  const { request, notify } = useWorkspace();
  const [sources, setSources] = useState<Source[] | null>(null);
  const [pending, setPending] = useState<Pending[]>([]);
  const [error, setError] = useState("");
  const [adding, setAdding] = useState<Adding>(null);
  const [link, setLink] = useState("");
  const [driveQuery, setDriveQuery] = useState("");
  const [driveFiles, setDriveFiles] = useState<DriveFile[] | null>(null);
  const [driveBusy, setDriveBusy] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [remove, setRemove] = useState<Source | null>(null);
  const [question, setQuestion] = useState("");
  const [hits, setHits] = useState<Hit[] | null>(null);
  const [searching, setSearching] = useState(false);
  const picker = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    try {
      const data = await request<{ items: Source[] }>(`projects/${projectId}/knowledge`);
      setSources(data.items || []);
    } catch (caught) {
      setError((caught as Error).message);
      setSources([]);
    }
  }, [projectId, request]);
  useEffect(() => {
    queueMicrotask(() => void load());
  }, [load]);

  const track = async (item: Pending, run: () => Promise<Source>) => {
    setPending((list) => [...list, item]);
    setError("");
    try {
      const added = await run();
      setSources((list) => [added, ...(list || []).filter((source) => source.id !== added.id)]);
      return true;
    } catch (caught) {
      setError(`${item.title}: ${(caught as Error).message}`);
      return false;
    } finally {
      setPending((list) => list.filter((entry) => entry.key !== item.key));
    }
  };

  const addFiles = async (files: FileList | null) => {
    const list = Array.from(files || []);
    for (const file of list) {
      if (file.size > MAX_BYTES) {
        setError(`${file.name}: files up to 20 MB can be added`);
        continue;
      }
      const ok = await track({ key: `${file.name}-${file.size}-${Date.now()}`, title: file.name, kind: "file" }, async () =>
        request<Source>(`projects/${projectId}/knowledge/files`, {
          method: "POST",
          body: JSON.stringify({ name: file.name, mime_type: file.type || "application/octet-stream", data: await readBase64(file) }),
        }),
      );
      if (ok) notify(`${file.name} added to the knowledge base`, "success");
    }
  };

  const addLink = async (event: FormEvent) => {
    event.preventDefault();
    const value = link.trim();
    if (!value || !adding || adding === "gdrive") return;
    const kind = adding;
    setLink("");
    setAdding(null);
    await track({ key: `${kind}-${value}`, title: value, kind }, () =>
      request<Source>(`projects/${projectId}/knowledge/${kind}`, { method: "POST", body: JSON.stringify({ url: value }) }),
    );
  };

  const searchDrive = async (event?: FormEvent) => {
    event?.preventDefault();
    setDriveBusy(true);
    setError("");
    try {
      const data = await request<{ items: DriveFile[] }>(`knowledge/drive?q=${encodeURIComponent(driveQuery.trim())}`);
      setDriveFiles(data.items || []);
    } catch (caught) {
      setError((caught as Error).message);
      setDriveFiles(null);
    } finally {
      setDriveBusy(false);
    }
  };

  const refresh = async (source: Source) => {
    setBusyId(source.id);
    setError("");
    try {
      const updated = await request<Source>(`knowledge/${source.id}/refresh`, { method: "POST" });
      setSources((list) => (list || []).map((item) => (item.id === updated.id ? updated : item)));
      notify(`${updated.title} is up to date`, "success");
    } catch (caught) {
      setError((caught as Error).message);
      void load();
    } finally {
      setBusyId(null);
    }
  };

  const test = async (event: FormEvent) => {
    event.preventDefault();
    if (!question.trim()) return;
    setSearching(true);
    try {
      const data = await request<{ items: Hit[] }>(`projects/${projectId}/knowledge/search?q=${encodeURIComponent(question.trim())}`);
      setHits(data.items || []);
    } catch (caught) {
      setError((caught as Error).message);
    } finally {
      setSearching(false);
    }
  };

  const ready = (sources || []).filter((source) => source.status === "ready");
  const pages = ready.reduce((sum, source) => sum + source.pages, 0);

  return (
    <div className="ws-form gx-kb">
      <p className="ws-muted">
        Every model in this project answers from these sources and cites the exact page. Text stays private to your account.
      </p>
      {error && <p className="ws-inline-error" role="alert">{error}</p>}

      <div className="gx-kb-add" role="group" aria-label="Add to the knowledge base">
        <button type="button" className="ws-btn" onClick={() => picker.current?.click()}>
          <WorkspaceIcon name="upload" size={16} />
          Files
        </button>
        <button type="button" className="ws-btn" aria-pressed={adding === "url"} onClick={() => setAdding(adding === "url" ? null : "url")}>
          <WorkspaceIcon name="link" size={16} />
          Website
        </button>
        <button type="button" className="ws-btn" aria-pressed={adding === "gdrive"} onClick={() => { setAdding(adding === "gdrive" ? null : "gdrive"); if (!driveFiles) void searchDrive(); }}>
          <KindIcon kind="gdrive" />
          Google Drive
        </button>
        <button type="button" className="ws-btn" aria-pressed={adding === "notion"} onClick={() => setAdding(adding === "notion" ? null : "notion")}>
          <KindIcon kind="notion" />
          Notion
        </button>
        <input ref={picker} type="file" hidden multiple accept=".pdf,.docx,.txt,.md,.markdown,.csv,.tsv,.json,.xml,.yaml,.yml,.html,.htm,.log" onChange={(event) => { void addFiles(event.target.files); event.target.value = ""; }} />
      </div>

      {(adding === "url" || adding === "notion") && (
        <form className="gx-kb-inline" onSubmit={addLink}>
          <input
            autoFocus
            type="url"
            value={link}
            onChange={(event) => setLink(event.target.value)}
            placeholder={adding === "url" ? "https://example.com/handbook" : "https://www.notion.so/your-page"}
            aria-label={adding === "url" ? "Web page address" : "Notion page link"}
          />
          <button className="ws-btn ws-btn-primary" type="submit" disabled={!link.trim()}>Add</button>
        </form>
      )}

      {adding === "gdrive" && (
        <div className="gx-kb-drive">
          <form className="gx-kb-inline" onSubmit={searchDrive}>
            <input autoFocus value={driveQuery} onChange={(event) => setDriveQuery(event.target.value)} placeholder="Search your Drive" aria-label="Search Google Drive" />
            <button className="ws-btn" type="submit" disabled={driveBusy}>{driveBusy ? "Searching…" : "Search"}</button>
          </form>
          {driveFiles && (driveFiles.length ? (
            <ul className="gx-kb-drive-list">
              {driveFiles.map((file) => (
                <li key={file.id}>
                  <span>{file.name}</span>
                  <small>{ago(file.modifiedTime || null)}</small>
                  <button type="button" className="ws-btn" onClick={() => void track({ key: `gdrive-${file.id}`, title: file.name, kind: "gdrive" }, () => request<Source>(`projects/${projectId}/knowledge/drive`, { method: "POST", body: JSON.stringify({ fileId: file.id }) }))}>Add</button>
                </li>
              ))}
            </ul>
          ) : <p className="ws-empty">No files found</p>)}
        </div>
      )}

      <div className="gx-kb-head">
        <strong>Sources</strong>
        {ready.length > 0 && <span>{ready.length} ready{pages ? ` · ${pages} pages` : ""}</span>}
      </div>
      <ul className="gx-kb-list" aria-busy={sources === null}>
        {pending.map((item) => (
          <li key={item.key} className="gx-kb-row" data-status="processing">
            <span className="gx-kb-icon"><KindIcon kind={item.kind} /></span>
            <span className="gx-kb-copy"><strong>{item.title}</strong><small>Reading and indexing…</small></span>
            <span className="gx-kb-spinner" aria-label="Processing" />
          </li>
        ))}
        {sources === null ? <li className="ws-skeleton" style={{ height: 56 }} /> : null}
        {sources?.map((source) => (
          <li key={source.id} className="gx-kb-row" data-status={source.status}>
            <span className="gx-kb-icon"><KindIcon kind={source.kind} /></span>
            <span className="gx-kb-copy">
              <strong title={source.title}>{source.title}</strong>
              <small>
                {source.status === "failed"
                  ? source.error || "Could not be read"
                  : [KIND_LABEL[source.kind], source.pages ? `${source.pages} pages` : "", `${source.chunks} passages`, source.syncedAt ? `updated ${ago(source.syncedAt)}` : ""].filter(Boolean).join(" · ")}
                {source.error && source.status === "ready" ? ` · last refresh failed: ${source.error}` : ""}
              </small>
            </span>
            <span className="gx-kb-actions">
              {source.url && (
                <WorkspaceTooltip label="Open original" side="bottom">
                  <a className="ws-icon-btn" href={source.url} target="_blank" rel="noopener noreferrer" aria-label={`Open ${source.title}`}><WorkspaceIcon name="external" size={16} /></a>
                </WorkspaceTooltip>
              )}
              {source.kind !== "file" && (
                <WorkspaceTooltip label="Refresh" side="bottom">
                  <button type="button" className="ws-icon-btn" disabled={busyId === source.id} aria-label={`Refresh ${source.title}`} onClick={() => void refresh(source)}>
                    {busyId === source.id ? <span className="gx-kb-spinner" /> : <WorkspaceIcon name="clock" size={16} />}
                  </button>
                </WorkspaceTooltip>
              )}
              <WorkspaceTooltip label="Remove" side="bottom">
                <button type="button" className="ws-icon-btn" aria-label={`Remove ${source.title}`} onClick={() => setRemove(source)}><WorkspaceIcon name="trash" size={16} /></button>
              </WorkspaceTooltip>
            </span>
          </li>
        ))}
        {sources?.length === 0 && !pending.length && (
          <li className="ws-empty">Add contracts, reports, handbooks or web pages. Models will answer from them with page links.</li>
        )}
      </ul>

      {ready.length > 0 && (
        <form className="gx-kb-test" onSubmit={test}>
          <label htmlFor={`kb-test-${projectId}`}>Try a question</label>
          <div className="gx-kb-inline">
            <input id={`kb-test-${projectId}`} value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="What is the notice period?" />
            <button className="ws-btn" type="submit" disabled={searching || !question.trim()}>{searching ? "Searching…" : "Search"}</button>
          </div>
          {hits && (hits.length ? (
            <ol className="gx-kb-hits">
              {hits.map((hit) => (
                <li key={hit.chunkId}>
                  <strong>{hit.label}{hit.heading ? ` · ${hit.heading}` : ""}</strong>
                  <p>{hit.text.slice(0, 320)}{hit.text.length > 320 ? "…" : ""}</p>
                </li>
              ))}
            </ol>
          ) : <p className="ws-empty">Nothing in the sources matches that yet.</p>)}
        </form>
      )}

      {remove && (
        <WorkspaceDialog title="Remove source" onClose={() => setRemove(null)}>
          <p>Remove “{remove.title}” from this project? Models will stop using it. The original file or page is not affected.</p>
          <div className="ws-form-actions">
            <button className="ws-btn" onClick={() => setRemove(null)}>Cancel</button>
            <button className="ws-btn" onClick={async () => {
              const target = remove;
              setRemove(null);
              try {
                await request(`knowledge/${target.id}`, { method: "DELETE" });
                setSources((list) => (list || []).filter((item) => item.id !== target.id));
              } catch (caught) {
                setError((caught as Error).message);
              }
            }}>Remove</button>
          </div>
        </WorkspaceDialog>
      )}
    </div>
  );
}
