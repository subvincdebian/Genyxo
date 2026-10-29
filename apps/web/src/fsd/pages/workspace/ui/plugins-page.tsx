"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { isWorkspaceSignInError, workspaceRequest, useWorkspace } from "@/features/workspace";
import { PluginLogo } from "@/shared/ui/plugin-logos";
import { WorkspaceDialog, WorkspaceIcon, WorkspaceMenu, WorkspaceTooltip } from "@/shared/ui/workspace";
import { CONNECT_ERRORS, integrationsRequest, isInstalled, pluginPath, type CatalogPlugin, type IntegrationCatalog, type PluginCategory } from "../model/integrations";
import { CatalogHeader, ConfirmDelete, Field, Form, FormFooter, jsonBody, ResourceState, Search, tabKeys, useAction, useLabels, usePageQuery, useResource } from "./page-tools";
import { usePluginActions } from "./plugin-actions";
import { SkillsCatalog } from "./skills-catalog";
import "./plugins-page.css";
import "./plugin-pages.css";

type Connection = { id: number; pluginId?: string; name: string; status: string; endpoint?: string; permissions?: string[] };
const SECTION_SIZE = 6;

export function useCatalog() {
  const [state, setState] = useState<{ data: IntegrationCatalog | null; error: string; loading: boolean }>({ data: null, error: "", loading: true });
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let live = true;
    integrationsRequest<IntegrationCatalog>("").then(
      (data) => { if (live) setState({ data, error: "", loading: false }); },
      (error: unknown) => { if (live) setState({ data: null, error: error instanceof Error ? error.message : "Unable to load plugins", loading: false }); },
    );
    return () => { live = false; };
  }, [revision]);
  return { ...state, reload: useCallback(() => setRevision((value) => value + 1), []) };
}

export function WorkspacePluginsPage() {
  const [query, setQuery] = usePageQuery();
  const onTab = (tab: "plugins" | "skills") => setQuery({ tab, view: null, category: null, scope: null });
  return query.get("tab") === "skills" ? <SkillsCatalog onTab={onTab} /> : <PluginsCatalog onTab={onTab} />;
}

function PluginsCatalog({ onTab }: { onTab: (tab: "plugins" | "skills") => void }) {
  const l = useLabels(); const workspace = useWorkspace(); const [query, setQuery] = usePageQuery();
  const catalog = useCatalog();
  const actions = usePluginActions(catalog.reload);
  const categoryId = query.get("category"); const installedView = query.get("view") === "installed";
  const personal = query.get("scope") === "personal";
  const [search, setSearch] = useState("");
  const [menu, setMenu] = useState<{ plugin: CatalogPlugin; trigger: HTMLElement } | null>(null);
  const [addMenu, setAddMenu] = useState<HTMLElement | null>(null);
  const [removing, setRemoving] = useState<CatalogPlugin | null>(null);
  const plugins = catalog.data?.plugins || [];
  const categories = catalog.data?.categories || [];
  const installed = plugins.filter(isInstalled);
  const category = categories.find((item) => item.id === categoryId) || null;
  const needle = search.trim().toLocaleLowerCase();
  const matches = (plugin: CatalogPlugin) => !needle || `${plugin.name} ${plugin.description}`.toLocaleLowerCase().includes(needle);

  // A failed OAuth callback lands here with ?integrationError=.
  const errorParam = query.get("integrationError");
  useEffect(() => {
    if (!errorParam) return;
    workspace.notify(CONNECT_ERRORS[errorParam] || l("connectFailed", "The connection did not complete. Try again."), "error");
    setQuery({ integrationError: null });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [errorParam]);

  const row = (plugin: CatalogPlugin) => <PluginRow key={plugin.id} plugin={plugin} busy={actions.busy === plugin.id} onConnect={() => void actions.connect(plugin)} onMenu={(trigger) => setMenu({ plugin, trigger })} />;

  const crumb = category ? category.name : installedView ? l("installed", "Installed") : null;
  let body: ReactNode;
  if (personal && !crumb) body = <PersonalPlugins search={needle} />;
  else if (catalog.loading || catalog.error) body = <div className="pl-state"><ResourceState icon="plugins" loading={catalog.loading} error={catalog.error} retry={catalog.reload} /></div>;
  else if (crumb) {
    const list = (category ? plugins.filter((plugin) => plugin.categories.includes(category.id)) : installed).filter(matches);
    body = list.length ? <ul className="pl-list" aria-label={crumb}>{list.map(row)}</ul> : <EmptyResults installedView={installedView && !needle} />;
  } else if (needle) {
    const list = plugins.filter(matches);
    body = <section className="pl-section" aria-labelledby="pl-results"><h2 id="pl-results" className="pl-section-title">{l("results", "Results")}</h2>{list.length ? <ul className="pl-list">{list.map(row)}</ul> : <EmptyResults />}</section>;
  } else body = categories.map((item) => <CategorySection key={item.id} category={item} onOpen={() => setQuery({ category: item.id })}>{plugins.filter((plugin) => plugin.categories.includes(item.id)).slice(0, SECTION_SIZE).map(row)}</CategorySection>);

  return <section className="wp-page wp-plugins pl-page" aria-label={l("pluginsAndSkills", "Plugins and skills")}>
    <CatalogHeader skills={false} onTab={onTab}>
      <WorkspaceTooltip label={l("integrationSettings", "Integration settings")} side="bottom"><button className="wp-icon-button" aria-label={l("integrationSettings", "Integration settings")} onClick={() => setQuery({ view: "installed", category: null, scope: null })}><WorkspaceIcon name="settings" /></button></WorkspaceTooltip>
      <button className="pl-add" aria-haspopup="menu" aria-expanded={Boolean(addMenu)} onClick={(event) => setAddMenu(addMenu ? null : event.currentTarget)}>{l("add", "Add")}<WorkspaceIcon name="chevron-down" size={14} /></button>
      {addMenu && <WorkspaceMenu trigger={addMenu} onClose={() => setAddMenu(null)} className="pl-menu"><button role="menuitem" onClick={() => { setAddMenu(null); setQuery({ scope: "public", category: null, view: null }); }}><WorkspaceIcon name="plugins" size={17} />{l("browsePlugins", "Browse plugins")}</button><button role="menuitem" onClick={() => { setAddMenu(null); setQuery({ scope: "personal", category: null, view: null, custom: "new" }); }}><WorkspaceIcon name="link" size={17} />{l("customApi", "Custom API / webhook")}</button></WorkspaceMenu>}
    </CatalogHeader>

    {crumb ? <>
      <nav className="pl-crumbs" aria-label={l("breadcrumb", "Breadcrumb")}><button onClick={() => setQuery({ category: null, view: null })}>{l("plugins", "Plugins")}</button><WorkspaceIcon name="chevron" size={14} /><span aria-current="page">{crumb}</span></nav>
      <div className="pl-hero"><h1>{crumb}</h1><p>{category ? category.description : l("installedHint", "Plugins you connected. Manage access or disconnect at any time.")}</p></div>
      <Search value={search} onChange={setSearch} label={l("searchPlugins", "Search plugins")} />
    </> : <>
      <div className="pl-hero"><h1>{l("plugins", "Plugins")}</h1><p>{l("pluginsSubtitle", "Connect plugins so Genyxo can work with your tools")}</p></div>
      <Search value={search} onChange={setSearch} label={l("searchPlugins", "Search plugins")} />
      <section className="pl-installed" aria-labelledby="pl-installed-title">
        <h2 id="pl-installed-title" className="pl-section-title"><button onClick={() => setQuery({ view: "installed" })}>{l("installed", "Installed")}<WorkspaceIcon name="chevron" size={15} /></button></h2>
        <div className="pl-strip">
          {installed.map((plugin) => <WorkspaceTooltip key={plugin.id} label={`${plugin.name}${plugin.connection?.account ? ` · ${plugin.connection.account}` : ""}`} side="bottom"><Link className="pl-tile pl-tile-lg" data-status={plugin.status} aria-label={plugin.name} href={pluginPath(plugin.id)}><PluginLogo id={plugin.id} size={26} /></Link></WorkspaceTooltip>)}
          {!catalog.loading && !installed.length && <p className="pl-muted">{l("noInstalled", "Your connected apps will appear here.")}</p>}
        </div>
      </section>
      <div className="wp-tabs pl-scope" role="tablist" onKeyDown={tabKeys} aria-label={l("catalogScope", "Catalog scope")}><button role="tab" aria-selected={!personal} onClick={() => setQuery({ scope: "public" })}>{l("public", "Public")}</button><button role="tab" aria-selected={personal} onClick={() => setQuery({ scope: "personal" })}>{l("personal", "Personal")}</button></div>
    </>}
    {catalog.data?.encryptionAvailable === false && <p className="pl-notice" role="note">{l("encryptionMissing", "Plugin connections are disabled until the server sets INTEGRATIONS_ENCRYPTION_KEY.")}</p>}
    {body}

    {menu && <WorkspaceMenu trigger={menu.trigger} onClose={() => setMenu(null)} className="pl-menu" placement="auto">
      {menu.plugin.status === "expired" ? <button role="menuitem" onClick={() => { const plugin = menu.plugin; setMenu(null); void actions.connect(plugin); }}><WorkspaceIcon name="link" size={17} />{l("reconnect", "Reconnect")}</button> : <button role="menuitem" onClick={() => { const plugin = menu.plugin; setMenu(null); actions.tryNow(plugin); }}><WorkspaceIcon name="new" size={17} />{l("tryNow", "Try now")}</button>}
      <Link role="menuitem" href={pluginPath(menu.plugin.id, true)} onClick={() => setMenu(null)}><WorkspaceIcon name="settings" size={17} />{l("manage", "Manage")}</Link>
      <div className="pl-menu-divider" role="separator" />
      <button role="menuitem" className="ws-danger" onClick={() => { setRemoving(menu.plugin); setMenu(null); }}><WorkspaceIcon name="trash" size={17} />{l("delete", "Delete")}</button>
    </WorkspaceMenu>}
    {removing && <ConfirmDelete name={removing.name} message={l("disconnectConfirm", "Disconnect this plugin? Chats will no longer be able to use it.")} onClose={() => setRemoving(null)} onDelete={() => actions.disconnect(removing)} />}
  </section>;
}

function CategorySection({ category, onOpen, children }: { category: PluginCategory; onOpen: () => void; children: ReactNode }) {
  const id = `pl-category-${category.id}`;
  return <section className="pl-section" aria-labelledby={id}><h2 id={id} className="pl-section-title"><button onClick={onOpen}>{category.name}<WorkspaceIcon name="chevron" size={15} /></button></h2><ul className="pl-list">{children}</ul></section>;
}

function EmptyResults({ installedView = false }: { installedView?: boolean }) {
  const l = useLabels();
  return <div className="wp-state pl-empty"><span className="gx-state-icon"><WorkspaceIcon name={installedView ? "plugins" : "search"} size={26} /></span><h2>{installedView ? l("noInstalledTitle", "No plugins connected yet") : l("noResults", "No results found")}</h2><p>{installedView ? l("noInstalledHint", "Connect a plugin and every chat model can use it.") : l("noResultsHint", "Try a different name or browse the categories.")}</p></div>;
}

function PluginRow({ plugin, busy, onConnect, onMenu }: { plugin: CatalogPlugin; busy: boolean; onConnect: () => void; onMenu: (trigger: HTMLElement) => void }) {
  const l = useLabels();
  const kind = isInstalled(plugin) ? "menu" : plugin.configured ? "connect" : "info";
  const label = kind === "menu" ? `${l("itemActions", "Actions for")} ${plugin.name}` : kind === "connect" ? `${l("connect", "Connect")} ${plugin.name}` : `${l("about", "About")} ${plugin.name}`;
  const badge = plugin.status === "unavailable" ? l("noApi", "No public API") : plugin.status === "unconfigured" ? l("notConfigured", "Not configured") : plugin.status === "expired" ? l("reconnectNeeded", "Reconnect") : null;
  const action = <button className="pl-row-action" data-kind={kind} aria-label={label} aria-haspopup={kind === "menu" ? "menu" : undefined} disabled={busy} onClick={(event) => kind === "menu" ? onMenu(event.currentTarget) : onConnect()}>{busy ? <span className="pl-spinner" aria-hidden="true" /> : <WorkspaceIcon name={kind === "menu" ? "more" : kind === "connect" ? "plus" : "info"} size={kind === "info" ? 18 : 20} />}</button>;
  return <li className="pl-row" data-status={plugin.status}>
    <Link className="pl-row-main" href={pluginPath(plugin.id)}>
      <span className="pl-tile"><PluginLogo id={plugin.id} size={22} /></span>
      <span className="pl-row-copy"><strong>{plugin.name}{badge && <em className={`pl-badge${plugin.status === "expired" ? " pl-badge-warn" : ""}`}>{badge}</em>}</strong><span>{plugin.description}</span></span>
    </Link>
    <WorkspaceTooltip label={label} side="bottom">{kind === "info" ? <Link className="pl-row-action" data-kind="info" aria-label={label} href={pluginPath(plugin.id)}><WorkspaceIcon name="info" size={18} /></Link> : action}</WorkspaceTooltip>
  </li>;
}

/** Personal tab: the user's own HTTPS endpoints (configuration only). */
function PersonalPlugins({ search }: { search: string }) {
  const l = useLabels(); const [query, setQuery] = usePageQuery();
  const resource = useResource<{ connections: Connection[] }>("plugins");
  const [deleting, setDeleting] = useState<Connection | null>(null);
  const editingId = query.get("custom");
  const connections = (resource.data?.connections || []).filter((item) => (!item.pluginId || item.pluginId === "personal-api") && `${item.name} ${item.endpoint || ""}`.toLocaleLowerCase().includes(search));
  const editing = editingId === "new" ? "new" : connections.find((item) => String(item.id) === editingId) || null;
  const mutate = async (path: string, init?: RequestInit) => { const result = await workspaceRequest(path, init); resource.reload(); return result; };
  if (resource.error && isWorkspaceSignInError(resource.error)) return <ResourceState loading={false} error={resource.error} retry={resource.reload} />;
  return <section className="pl-section" aria-labelledby="pl-personal">
    <h2 id="pl-personal" className="pl-section-title">{l("yourCollection", "Your collection")}</h2>
    {resource.loading || resource.error ? <ResourceState icon="plugins" loading={resource.loading} error={resource.error} retry={resource.reload} /> : <ul className="pl-list">
      {connections.map((item) => <li className="pl-row" key={item.id}><button className="pl-row-main" onClick={() => setQuery({ custom: String(item.id) })}><span className="pl-tile"><PluginLogo id="personal-api" size={22} /></span><span className="pl-row-copy"><strong>{item.name}</strong><span>{item.endpoint || l("personalIntegration", "Personal integration")}</span></span></button><WorkspaceTooltip label={`${l("settingsFor", "Settings for")} ${item.name}`} side="bottom"><button className="pl-row-action" data-kind="menu" aria-label={`${l("settingsFor", "Settings for")} ${item.name}`} onClick={() => setQuery({ custom: String(item.id) })}><WorkspaceIcon name="more" /></button></WorkspaceTooltip></li>)}
      <li className="pl-row pl-row-add"><button className="pl-row-main" onClick={() => setQuery({ custom: "new" })}><span className="pl-tile"><WorkspaceIcon name="plus" size={20} /></span><span className="pl-row-copy"><strong>{l("customApi", "Custom API / webhook")}</strong><span>{l("customApiHint", "Store an HTTPS endpoint and key for your own tools")}</span></span></button></li>
    </ul>}
    {editing && <ConnectionEditor connection={editing === "new" ? null : editing} onClose={() => setQuery({ custom: null })} onSave={(body) => mutate(`connections${editing === "new" ? "" : `/${editing.id}`}`, jsonBody(body, editing === "new" ? "POST" : "PATCH"))} onDelete={editing === "new" ? undefined : () => { setDeleting(editing); setQuery({ custom: null }); }} />}
    {deleting && <ConfirmDelete name={deleting.name} onClose={() => setDeleting(null)} onDelete={() => mutate(`connections/${deleting.id}`, { method: "DELETE" })} />}
  </section>;
}

function ConnectionEditor({ connection, onClose, onSave, onDelete }: { connection: Connection | null; onClose: () => void; onSave: (body: unknown) => Promise<unknown>; onDelete?: () => void }) {
  const l = useLabels(); const action = useAction(onClose); const [name, setName] = useState(connection?.name || ""); const [endpoint, setEndpoint] = useState(connection?.endpoint || ""); const [apiKey, setApiKey] = useState(""); const [permissions, setPermissions] = useState(connection?.permissions?.join("\n") || "");
  return <WorkspaceDialog title={connection ? l("connectionSettings", "Connection settings") : l("customApi", "Custom API / webhook")} onClose={onClose}><Form noValidate className="wp-form" onSubmit={(event) => { event.preventDefault(); if (name.trim()) void action.run(() => onSave({ name: name.trim(), endpoint, permissions: permissions.split("\n").map((value) => value.trim()).filter(Boolean), ...(apiKey ? { apiKey } : {}) })); }}><Field label={l("name", "Name")}><input autoFocus required maxLength={200} value={name} onChange={(event) => setName(event.target.value)} /></Field><Field label={l("httpsEndpoint", "HTTPS endpoint")}><input type="url" required pattern="https://.*" placeholder="https://example.com/api" value={endpoint} onChange={(event) => setEndpoint(event.target.value)} /></Field><Field label={l("apiKey", "API key (optional)")}><input type="password" autoComplete="new-password" value={apiKey} onChange={(event) => setApiKey(event.target.value)} /></Field><Field label={l("allowedActions", "Allowed actions (one per line)")}><textarea className="resize-none" rows={3} value={permissions} onChange={(event) => setPermissions(event.target.value)} /></Field>{connection && <p className="wp-notice">{l("secretStored", "Existing credentials stay on the server. Enter a key only to replace it.")}</p>}<p className="wp-muted">{l("connectionHint", "Saving configuration does not verify a live connection.")}</p>{onDelete && <button className="wp-danger" type="button" onClick={onDelete}>{l("disconnect", "Disconnect")}</button>}<FormFooter {...action} onClose={onClose} /></Form></WorkspaceDialog>;
}
