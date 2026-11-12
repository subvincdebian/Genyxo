"use client";

import { useCallback, useEffect, useState, type CSSProperties, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useWorkspace } from "@/features/workspace";
import { PluginLogo } from "@/shared/ui/plugin-logos";
import { WorkspaceIcon, WorkspaceMenu, WorkspaceTooltip } from "@/shared/ui/workspace";
import { integrationsRequest, isInstalled, pluginPath, type ActionPolicy, type CatalogPlugin } from "../model/integrations";
import { ConfirmDelete, Field, jsonBody, ResourceState, useLabels, usePageQuery } from "./page-tools";
import { usePluginActions } from "./plugin-actions";
import "./plugins-page.css";
import "./plugin-pages.css";

function usePluginDetail(id: string) {
  const [state, setState] = useState<{ data: CatalogPlugin | null; error: string; loading: boolean }>({ data: null, error: "", loading: true });
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let live = true;
    integrationsRequest<CatalogPlugin>(encodeURIComponent(id)).then(
      (data) => { if (live) setState({ data, error: "", loading: false }); },
      (error: unknown) => { if (live) setState({ data: null, error: error instanceof Error ? error.message : "Unable to load this plugin", loading: false }); },
    );
    return () => { live = false; };
  }, [id, revision]);
  return { ...state, reload: useCallback(() => setRevision((value) => value + 1), []) };
}

function Crumbs({ parent, href, current }: { parent: string; href: string; current: string }) {
  const l = useLabels();
  return <nav className="pl-crumbs pl-crumbs-top" aria-label={l("breadcrumb", "Breadcrumb")}><Link href={href}>{parent}</Link><WorkspaceIcon name="chevron" size={14} /><span aria-current="page">{current}</span></nav>;
}

function PageShell({ id, loading, error, retry, children }: { id: string; loading: boolean; error: string; retry: () => void; children: ReactNode }) {
  const l = useLabels();
  if (loading || error) return <section className="wp-page pl-page pl-detail" aria-busy={loading}><Crumbs parent={l("plugins", "Plugins")} href="/plugins" current={id} /><ResourceState icon="plugins" loading={loading} error={error} retry={retry} /></section>;
  return <>{children}</>;
}

/** The status line under a plugin's name. */
function statusText(plugin: CatalogPlugin, l: (key: string, fallback: string) => string) {
  if (plugin.status === "connected") return plugin.connection?.account ? `${l("connectedAs", "Connected as")} ${plugin.connection.account}` : l("statusConnected", "Connected");
  if (plugin.status === "expired") return l("statusExpired", "Access expired — reconnect");
  if (plugin.status === "unavailable") return l("noApi", "No public API");
  if (plugin.status === "unconfigured") return l("notConfigured", "Not configured");
  return "";
}

// ---------- Plugin page ----------

export function WorkspacePluginDetailPage({ id }: { id: string }) {
  const l = useLabels(); const workspace = useWorkspace(); const [query, setQuery] = usePageQuery();
  const detail = usePluginDetail(id);
  const actions = usePluginActions(detail.reload);
  const [menu, setMenu] = useState<HTMLElement | null>(null);
  const [removing, setRemoving] = useState(false);
  const plugin = detail.data;

  // The OAuth callback lands here with ?connected=1.
  const connected = query.get("connected");
  useEffect(() => {
    if (!connected || !plugin) return;
    workspace.notify(`${plugin.name} ${l("connectedNotice", "connected")}`);
    setQuery({ connected: null });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected, plugin?.id]);

  return <PageShell id={id} loading={detail.loading} error={detail.error} retry={detail.reload}>{plugin && (() => {
    const installed = isInstalled(plugin);
    const status = statusText(plugin, l);
    const tryPrompt = (prompt: string) => {
      if (!installed) workspace.notify(`${l("connectFirst", "Connect")} ${plugin.name} ${l("connectFirstEnd", "first so Genyxo can use it.")}`, "info");
      actions.tryNow(plugin, prompt);
    };
    const primary = installed
      ? plugin.status === "expired"
        ? <button className="pl-cta" disabled={actions.busy === plugin.id} onClick={() => void actions.connect(plugin)}><WorkspaceIcon name="link" size={17} />{l("reconnect", "Reconnect")}</button>
        : <button className="pl-cta" onClick={() => actions.tryNow(plugin)}><WorkspaceIcon name="new" size={17} />{l("tryInChat", "Try in chat")}</button>
      : plugin.configured
        ? plugin.auth.type === "token"
          ? <a className="pl-cta" href="#connect"><WorkspaceIcon name="plus" size={17} />{l("connect", "Connect")}</a>
          : <button className="pl-cta" disabled={actions.busy === plugin.id} onClick={() => void actions.connect(plugin)}>{actions.busy === plugin.id ? <span className="pl-spinner" aria-hidden="true" /> : <WorkspaceIcon name="plus" size={17} />}{l("connect", "Connect")}</button>
        : <button className="pl-cta" disabled>{plugin.status === "unavailable" ? l("noApi", "No public API") : l("notConfigured", "Not configured")}</button>;
    return <section className="wp-page pl-page pl-detail" aria-labelledby="pl-detail-title" style={{ "--plugin-tint": plugin.tint } as CSSProperties}>
      <Crumbs parent={l("plugins", "Plugins")} href="/plugins" current={plugin.name} />
      <header className="pl-detail-head">
        <span className="pl-tile pl-tile-xl"><PluginLogo id={plugin.id} size={36} /></span>
        <div className="pl-detail-title">
          <h1 id="pl-detail-title">{plugin.name}</h1>
          <p>{l("by", "By")} {plugin.developer} • {plugin.description}</p>
          {status && <span className="pl-status" data-status={plugin.status}>{status}</span>}
        </div>
        <div className="pl-detail-actions">
          <WorkspaceTooltip label={l("moreActions", "More actions")} side="bottom"><button className="pl-icon" aria-label={l("moreActions", "More actions")} aria-haspopup="menu" onClick={(event) => setMenu(menu ? null : event.currentTarget)}><WorkspaceIcon name="more" /></button></WorkspaceTooltip>
          {installed && <Link className="pl-ghost" href={pluginPath(plugin.id, true)}><WorkspaceIcon name="settings" size={17} />{l("manage", "Manage")}</Link>}
          {primary}
        </div>
      </header>
      {menu && <WorkspaceMenu trigger={menu} onClose={() => setMenu(null)} className="pl-menu">
        <Link role="menuitem" href={pluginPath(plugin.id, true)} onClick={() => setMenu(null)}><WorkspaceIcon name="settings" size={17} />{l("pluginSettings", "Plugin settings")}</Link>
        <a role="menuitem" href={plugin.website} target="_blank" rel="noopener noreferrer" onClick={() => setMenu(null)}><WorkspaceIcon name="external" size={17} />{l("website", "Website")}</a>
        {installed && <><div className="pl-menu-divider" role="separator" /><button role="menuitem" className="ws-danger" onClick={() => { setMenu(null); setRemoving(true); }}><WorkspaceIcon name="trash" size={17} />{l("disconnect", "Disconnect")}</button></>}
      </WorkspaceMenu>}

      <div className="pl-banner" aria-label={l("examplePrompts", "Example prompts")}>
        <span className="pl-banner-glow" aria-hidden="true" />
        {plugin.prompts.map((prompt) => <button key={prompt} className="pl-prompt" onClick={() => tryPrompt(prompt)}>
          <span className="pl-prompt-text"><span className="pl-prompt-mark"><PluginLogo id={plugin.id} size={14} />{plugin.name}</span> {prompt}</span>
          <span className="pl-prompt-go" aria-hidden="true"><WorkspaceIcon name="arrow-right" size={16} /></span>
        </button>)}
      </div>

      <p className="pl-about">{plugin.about}</p>
      {plugin.unavailableReason && <p className="pl-notice" role="note">{plugin.unavailableReason}</p>}
      {plugin.auth.type === "token" && plugin.configured && <TokenConnect plugin={plugin} onConnected={detail.reload} />}

      <section className="pl-detail-section" aria-labelledby="pl-apps"><h2 id="pl-apps">{l("apps", "Apps")} <span>{plugin.apps.length}</span></h2>
        <ul className="pl-apps">{plugin.apps.map((app) => <li key={app.name}><Link href={pluginPath(plugin.id, true)}><span className="pl-tile"><PluginLogo id={plugin.id} size={22} /></span><span className="pl-row-copy"><strong>{app.name}</strong><span>{app.description}</span></span></Link></li>)}</ul>
      </section>
      {plugin.capabilities.length > 0 && <div className="pl-detail-grid">
        <section className="pl-detail-section"><h2>{l("whatAiCanDo", "What Genyxo can do")}</h2><ul className="pl-checks">{plugin.capabilities.map((item) => <li key={item}><WorkspaceIcon name="check" size={16} />{item}</li>)}</ul></section>
        <section className="pl-detail-section"><h2>{l("permissionsRequested", "Permissions requested")}</h2><ul className="pl-checks pl-perms">{plugin.permissions.map((item) => <li key={item}><WorkspaceIcon name="lock" size={15} />{item}</li>)}</ul></section>
      </div>}
      <p className="pl-safety"><WorkspaceIcon name="info" size={16} />{l("confirmSafety", "Anything that sends, publishes, pays or deletes waits for your Confirm in the chat unless you allow low-risk actions in the plugin settings. Any model you chat with can use connected plugins.")}</p>
      {removing && <ConfirmDelete name={plugin.name} message={l("disconnectConfirm", "Disconnect this plugin? Chats will no longer be able to use it.")} onClose={() => setRemoving(false)} onDelete={() => actions.disconnect(plugin)} />}
    </section>;
  })()}</PageShell>;
}

function TokenConnect({ plugin, onConnected }: { plugin: CatalogPlugin; onConnected: () => void }) {
  const l = useLabels(); const workspace = useWorkspace();
  const fields = plugin.auth.type === "token" ? plugin.auth.fields : [];
  const [values, setValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false); const [error, setError] = useState("");
  const installed = isInstalled(plugin);
  if (plugin.auth.type !== "token") return null;
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true); setError("");
    try {
      await integrationsRequest(`${plugin.id}/token`, jsonBody({ fields: values }));
      setValues({}); workspace.notify(`${plugin.name} ${l("connectedNotice", "connected")}`); onConnected();
    } catch (caught) { setError(caught instanceof Error ? caught.message : l("connectFailed", "The connection did not complete. Try again.")); }
    finally { setSaving(false); }
  };
  const ready = fields.every((field) => field.optional || values[field.key]?.trim());
  return <form id="connect" className="pl-card pl-token" onSubmit={(event) => void submit(event)} aria-labelledby="pl-token-title">
    <h2 id="pl-token-title">{installed ? l("replaceKey", "Replace credentials") : l("connectWithKey", "Connect with your key")}</h2>
    {fields.map((field) => <Field key={field.key} label={field.label}><input type={field.secret ? "password" : "text"} autoComplete="off" spellCheck={false} placeholder={field.placeholder} value={values[field.key] || ""} onChange={(event) => setValues({ ...values, [field.key]: event.target.value })} /></Field>)}
    <p className="pl-muted">{plugin.auth.help} <a href={plugin.auth.docsUrl} target="_blank" rel="noopener noreferrer">{l("howToGetKey", "Where to get it")} ↗</a></p>
    {error && <p className="wp-error" role="alert">{error}</p>}
    <div className="pl-token-actions"><span className="pl-muted">{l("keyStored", "Stored encrypted. Genyxo checks it with the provider first.")}</span><button className="pl-cta" type="submit" disabled={saving || !ready}>{saving ? l("checking", "Checking…") : installed ? l("save", "Save") : l("connect", "Connect")}</button></div>
  </form>;
}

// ---------- Settings page ----------

const POLICIES: { id: ActionPolicy; label: string; hint: string }[] = [
  { id: "ask", label: "Always ask", hint: "Confirm every action that changes data." },
  { id: "low-risk", label: "Allow low-risk actions", hint: "Drafts and non-destructive changes run without asking. Sending, paying and deleting still ask." },
];

export function WorkspacePluginSettingsPage({ id }: { id: string }) {
  const l = useLabels(); const workspace = useWorkspace(); const router = useRouter();
  const detail = usePluginDetail(id);
  const actions = usePluginActions(detail.reload);
  const [policyMenu, setPolicyMenu] = useState<HTMLElement | null>(null);
  const [accountMenu, setAccountMenu] = useState<HTMLElement | null>(null);
  const [removing, setRemoving] = useState(false);
  const plugin = detail.data;

  return <PageShell id={id} loading={detail.loading} error={detail.error} retry={detail.reload}>{plugin && (() => {
    const installed = isInstalled(plugin);
    const policy = POLICIES.find((item) => item.id === plugin.policy) || POLICIES[0];
    const setPolicy = async (next: ActionPolicy) => {
      setPolicyMenu(null);
      try { await integrationsRequest(`${plugin.id}/settings`, jsonBody({ policy: next }, "PATCH")); workspace.notify(l("saved", "Saved")); detail.reload(); }
      catch (error) { workspace.notify(error instanceof Error ? error.message : l("saveError", "Unable to save changes"), "error"); }
    };
    const date = plugin.connection ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(plugin.connection.connectedAt)) : l("notConnected", "Not connected");
    const data: [string, ReactNode][] = [
      [l("connected", "Connected"), date],
      [l("category", "Category"), plugin.categoryNames.join(", ")],
      [l("developer", "Developer"), plugin.developer],
      [l("version", "Version"), plugin.version],
      [l("website", "Website"), <a key="w" href={plugin.website} target="_blank" rel="noopener noreferrer">{plugin.website}</a>],
      [l("privacyPolicy", "Privacy Policy"), <Link key="p" href="/policies/privacy-policy">{l("viewPrivacy", "View privacy policy")}</Link>],
      [l("termsOfUse", "Terms of use"), <Link key="t" href="/policies/terms-of-service">{l("viewTerms", "View terms and conditions")}</Link>],
      [l("authSupported", "Authorization is supported"), plugin.authorization],
      [l("authUsed", "Authorization used"), installed ? plugin.authorization : "—"],
    ];
    const tools = plugin.connection?.tools || [];
    return <section className="wp-page pl-page pl-settings" aria-labelledby="pl-settings-title">
      <Crumbs parent={l("pluginSettings", "Plugin settings")} href="/plugins?view=installed" current={plugin.name} />
      <header className="pl-settings-head">
        <span className="pl-tile pl-tile-xl"><PluginLogo id={plugin.id} size={34} /></span>
        <div className="pl-detail-title"><h1 id="pl-settings-title">{plugin.name}</h1><p>{plugin.description}</p></div>
        <div className="pl-detail-actions">
          <Link className="pl-pill" href={pluginPath(plugin.id)}>{l("viewDetails", "View details")}</Link>
          {installed ? <button className="pl-pill pl-pill-danger" onClick={() => setRemoving(true)}>{l("remove", "Remove")}</button> : plugin.configured && <button className="pl-pill" disabled={actions.busy === plugin.id} onClick={() => void actions.connect(plugin)}>{l("connect", "Connect")}</button>}
        </div>
      </header>

      {installed && <div className="pl-card pl-allow">
        <span className="pl-allow-icon" aria-hidden="true"><WorkspaceIcon name="lock" size={19} /></span>
        <span className="pl-row-copy"><strong>{l("allow", "Allow")}</strong><span>{l("allowHint", "Choose when Genyxo should ask for permission when using this plugin")}</span></span>
        <button className="pl-allow-pick" aria-haspopup="menu" aria-expanded={Boolean(policyMenu)} onClick={(event) => setPolicyMenu(policyMenu ? null : event.currentTarget)}>{l(`policy-${policy.id}`, policy.label)}<WorkspaceIcon name="chevron" size={14} /></button>
      </div>}
      {policyMenu && <WorkspaceMenu trigger={policyMenu} onClose={() => setPolicyMenu(null)} className="pl-menu pl-policy-menu" placement="auto">
        {POLICIES.map((item) => <button key={item.id} role="menuitemradio" aria-checked={item.id === policy.id} onClick={() => void setPolicy(item.id)}><span className="pl-row-copy"><strong>{l(`policy-${item.id}`, item.label)}</strong><span>{l(`policy-${item.id}-hint`, item.hint)}</span></span>{item.id === policy.id && <WorkspaceIcon name="check" size={16} />}</button>)}
      </WorkspaceMenu>}

      {installed && <section className="pl-detail-section" aria-labelledby="pl-accounts"><h2 id="pl-accounts">{l("connectedAccounts", "Connected accounts")}</h2>
        <div className="pl-card pl-accounts">
          <div className="pl-account"><span className="pl-avatar" aria-hidden="true">{(plugin.connection?.account || plugin.name).slice(0, 1).toUpperCase()}</span><span className="pl-row-copy"><strong>{plugin.connection?.account || l("statusConnected", "Connected")}</strong><span>{plugin.status === "expired" ? l("statusExpired", "Access expired — reconnect") : l("primary", "Primary")}</span></span>
            <WorkspaceTooltip label={l("accountActions", "Account actions")} side="bottom"><button className="pl-icon" aria-label={l("accountActions", "Account actions")} aria-haspopup="menu" onClick={(event) => setAccountMenu(accountMenu ? null : event.currentTarget)}><WorkspaceIcon name="more" /></button></WorkspaceTooltip>
          </div>
          {(plugin.auth.type === "oauth" || plugin.auth.type === "mcp" && !plugin.auth.open || plugin.auth.type === "token") && <button className="pl-account-add" onClick={() => void actions.connect(plugin)}><WorkspaceIcon name="plus" size={18} />{l("reconnectAccount", "Reconnect or switch account")}</button>}
        </div>
      </section>}
      {accountMenu && <WorkspaceMenu trigger={accountMenu} onClose={() => setAccountMenu(null)} className="pl-menu">
        <button role="menuitem" onClick={() => { setAccountMenu(null); void actions.connect(plugin); }}><WorkspaceIcon name="link" size={17} />{l("reconnect", "Reconnect")}</button>
        <div className="pl-menu-divider" role="separator" />
        <button role="menuitem" className="ws-danger" onClick={() => { setAccountMenu(null); setRemoving(true); }}><WorkspaceIcon name="trash" size={17} />{l("disconnect", "Disconnect")}</button>
      </WorkspaceMenu>}

      <section className="pl-detail-section" aria-labelledby="pl-uses"><h2 id="pl-uses">{l("uses", "Uses")}</h2>
        <ul className="pl-card pl-uses">{plugin.apps.map((app) => <li key={app.name}><span className="pl-tile"><PluginLogo id={plugin.id} size={20} /></span><span className="pl-row-copy"><strong>{app.name}</strong><span>{app.description}</span></span><span className="pl-uses-state">{installed ? l("statusConnected", "Connected") : plugin.configured ? l("notConnected", "Not connected") : statusText(plugin, l)}</span></li>)}</ul>
      </section>

      {tools.length > 0 && <section className="pl-detail-section" aria-labelledby="pl-tools"><h2 id="pl-tools">{l("tools", "Tools")} <span>{tools.length}</span></h2>
        <ul className="pl-card pl-tools">{tools.map((tool) => <li key={tool.name}><span>{tool.name}</span><em data-read={tool.readOnly}>{tool.readOnly ? l("readOnly", "Read-only") : l("asksFirst", "Asks first")}</em></li>)}</ul>
      </section>}

      <section className="pl-detail-section" aria-labelledby="pl-data"><h2 id="pl-data">{l("data", "Data")}</h2>
        <dl className="pl-card pl-data">{data.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
      </section>
      {removing && <ConfirmDelete name={plugin.name} message={l("disconnectConfirm", "Disconnect this plugin? Chats will no longer be able to use it.")} onClose={() => setRemoving(false)} onDelete={async () => { await actions.disconnect(plugin); router.push(pluginPath(plugin.id)); }} />}
    </section>;
  })()}</PageShell>;
}
