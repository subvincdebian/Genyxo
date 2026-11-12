// Next never unloads a route's CSS after client-side navigation, so a page's
// global stylesheet would keep styling every page visited after it. This
// PostCSS plugin gates each rule of a route stylesheet at build time: the rule
// only matches while an element with one of the stylesheet's marker classes is
// in the document. The gate sits in `:where()`, so it adds no specificity and
// a page renders exactly as on a hard load. Source CSS stays plain.
//
// Every non-module stylesheet must be listed here (scripts/check-architecture.mjs
// enforces it). New styles belong in CSS Modules or Tailwind utilities instead.
const path = require("node:path");

const frontend = path.resolve(__dirname, "..");
const workspace = [".workspace-shell"];

// Marker classes per stylesheet. Route markers come from `RouteScope`
// (src/fsd/shared/ui/route-scope.tsx); the workspace uses its shell element.
const routeStylesheets = {
  "src/fsd/shared/styles/style.css": [
    ...workspace,
    ".gx-route-home",
    ".gx-route-admin",
    ".gx-route-policies",
  ],
  "src/fsd/shared/styles/home-premium.css": [".gx-route-home"],
  "node_modules/lenis/dist/lenis.css": [".gx-route-home"],
  "src/fsd/shared/styles/profile.css": [
    ".gx-route-profile",
    ".gx-route-notifications",
    ".gx-route-admin",
    ".gx-route-policies",
  ],
  "src/fsd/shared/styles/policies.css": [".gx-route-policies"],
  "src/fsd/shared/styles/dashboard.css": [".gx-route-dashboard"],
  "src/fsd/shared/styles/auth-page.css": [".gx-route-sign-in"],
  "src/fsd/pages/admin/ui/page.css": [".gx-route-admin"],
  "src/fsd/pages/notifications/ui/page.css": [".gx-route-notifications"],
  "app/share/[token]/share.css": [".gx-route-share"],
  "src/fsd/shared/styles/chat.css": workspace,
  "src/fsd/pages/chat/ui/page.css": workspace,
  "src/fsd/shared/styles/workspace.css": workspace,
  "src/fsd/shared/styles/genyxo-icons.css": workspace,
  "src/fsd/shared/styles/genyxo-orb.css": workspace,
  "src/fsd/shared/styles/workspace-premium.css": workspace,
  "src/fsd/shared/styles/composer-premium.css": workspace,
  "src/fsd/pages/workspace/ui/library-page.css": workspace,
  "src/fsd/pages/workspace/ui/plugin-pages.css": workspace,
  "src/fsd/pages/workspace/ui/plugins-page.css": workspace,
  "src/fsd/pages/workspace/ui/workspace-pages.css": workspace,
  "src/fsd/widgets/canvas/ui/canvas.css": workspace,
  "src/fsd/widgets/chat/ui/action-card.css": workspace,
  "src/fsd/widgets/maps/ui/maps.css": workspace,
  "node_modules/maplibre-gl/dist/maplibre-gl.css": workspace,
  "src/fsd/widgets/workspace/ui/WorkspaceSidebar.css": workspace,
};

// Global by design: imported once by the root layout.
const rootStylesheets = [
  "src/fsd/shared/styles/tailwind.css",
  "src/fsd/shared/styles/theme.css",
  "src/fsd/shared/styles/avatar.css",
  "src/fsd/shared/ui/appearance.css",
];

// Keyframe names are global and cannot be gated. The workspace's copies of
// names that legacy pages also define get a suffix, so a page visited earlier
// can never replace the chat's animations.
const workspaceKeyframes = new Set(["fadeIn", "slideIn", "genyxo-spin"]);
const keyframeSuffix = "--ws";

function gateFor(markers) {
  const target =
    markers.length === 1 ? markers[0] : `:is(${markers.join(", ")})`;
  return `:where(:root:has(${target}), :root:has(${target}) *)`;
}

function scanTopLevel(selector, visit) {
  let depth = 0;
  let quote = "";
  for (let index = 0; index < selector.length; index++) {
    const char = selector[index];
    if (quote) {
      if (char === "\\") index++;
      else if (char === quote) quote = "";
      continue;
    }
    if (char === '"' || char === "'") quote = char;
    else if (char === "(" || char === "[") depth++;
    else if (char === ")" || char === "]") depth--;
    else if (depth === 0 && visit(char, index) === false) return;
  }
}

const legacyPseudoElement =
  /^:(?:before|after|first-line|first-letter)(?![\w-])/i;

// Appends the gate to the subject compound, ahead of any pseudo-element.
function gateSelector(selector, gate) {
  const trimmed = selector.trim();
  let subjectStart = 0;
  scanTopLevel(trimmed, (char, index) => {
    if (/[\s>+~]/.test(char)) subjectStart = index + 1;
  });
  let insertAt = trimmed.length;
  scanTopLevel(trimmed, (char, index) => {
    if (index < subjectStart || char !== ":") return;
    if (
      trimmed[index + 1] === ":" ||
      legacyPseudoElement.test(trimmed.slice(index))
    ) {
      insertAt = index;
      return false;
    }
  });
  const universal = insertAt === subjectStart ? "*" : "";
  return `${trimmed.slice(0, insertAt)}${universal}${gate}${trimmed.slice(insertAt)}`;
}

function topLevelRules(root, visit) {
  root.walkRules((rule) => {
    for (let parent = rule.parent; parent; parent = parent.parent) {
      if (parent.type === "rule") return;
      if (parent.type === "atrule" && /keyframes$/i.test(parent.name)) return;
    }
    visit(rule);
  });
}

function stylesheetKey(file) {
  if (!file) return undefined;
  return path.relative(frontend, file).split(path.sep).join("/");
}

function scope(root, markers) {
  const gate = gateFor(markers);
  topLevelRules(root, (rule) => {
    rule.selectors = rule.selectors.map((selector) =>
      gateSelector(selector, gate),
    );
  });
  if (markers !== workspace) return;
  const rename = (name) =>
    workspaceKeyframes.has(name) ? `${name}${keyframeSuffix}` : name;
  root.walkAtRules(/keyframes$/i, (rule) => {
    rule.params = rename(rule.params);
  });
  root.walkDecls(/^(?:-webkit-)?animation(?:-name)?$/i, (decl) => {
    decl.value = decl.value.replace(/(?<![\w-])[A-Za-z_][\w-]*/g, rename);
  });
}

function routeScope() {
  return {
    postcssPlugin: "genyxo-route-scope",
    OnceExit(root, { result }) {
      const key = stylesheetKey(result.opts.from ?? root.source?.input.file);
      const markers = key && routeStylesheets[key];
      if (markers) scope(root, markers);
    },
  };
}
routeScope.postcss = true;

module.exports = routeScope;
module.exports.routeStylesheets = routeStylesheets;
module.exports.rootStylesheets = rootStylesheets;
module.exports.gateSelector = gateSelector;
module.exports.gateFor = gateFor;
