import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const frontend = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourceRoot = path.join(frontend, 'src', 'fsd');
const routerRoot = path.join(frontend, 'app');
const layers = ['app', 'pages', 'widgets', 'features', 'entities', 'shared'];
const extensions = /\.(?:[cm]?[jt]s|[jt]sx)$/;
const errors = [];
let checkedImports = 0;

const configPath = path.join(frontend, 'tsconfig.json');
const config = ts.readConfigFile(configPath, ts.sys.readFile);
if (config.error) {
  console.error(ts.flattenDiagnosticMessageText(config.error.messageText, '\n'));
  process.exit(1);
}
const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, frontend);
if (parsed.errors.length) {
  console.error(ts.formatDiagnosticsWithColorAndContext(parsed.errors, {
    getCurrentDirectory: () => frontend,
    getCanonicalFileName: (name) => name,
    getNewLine: () => '\n',
  }));
  process.exit(1);
}

function files(directory) {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const name = path.join(directory, entry.name);
    return entry.isDirectory() ? files(name) : extensions.test(name) ? [name] : [];
  });
}

function inside(directory, file) {
  const relative = path.relative(directory, file);
  return relative === '' || (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative));
}

function layerOf(file) {
  if (!inside(sourceRoot, file)) return undefined;
  return path.relative(sourceRoot, file).split(path.sep)[0];
}

function report(file, node, message) {
  const location = node.getSourceFile().getLineAndCharacterOfPosition(node.getStart());
  errors.push(`${path.relative(frontend, file)}:${location.line + 1}: ${message}`);
}

function check(file, node, specifier) {
  checkedImports++;
  // Browser asset URLs do not represent imports between source modules.
  if (/^(?:https?:|data:|\/)/.test(specifier)) return;
  const resolved = ts.resolveModuleName(specifier, file, parsed.options, ts.sys).resolvedModule;
  if (!resolved) {
    // TypeScript resolves the existence of source modules during typecheck.
    // Styles and other public assets are outside this layer rule.
    if (extensions.test(specifier) || specifier.startsWith('.') || specifier.startsWith('@/')) {
      if (!/\.(?:css|svg|png|jpe?g|gif|webp|ico|woff2?|ttf|mp4|mp3)(?:\?.*)?$/.test(specifier)) {
        report(file, node, `Cannot resolve internal module "${specifier}".`);
      }
    }
    return;
  }
  const target = path.resolve(resolved.resolvedFileName);
  const from = layerOf(file);
  const to = layerOf(target);
  if (from && inside(routerRoot, target)) {
    report(file, node, `The ${from} layer cannot import App Router entry points (${specifier}).`);
  } else if (from && to && layers.indexOf(to) < layers.indexOf(from)) {
    report(file, node, `Upward layer import: ${from} → ${to} (${specifier}).`);
  } else if (to && !layers.includes(to)) {
    report(file, node, `Unknown source layer "${to}" (${specifier}).`);
  }
}

const modules = [...files(sourceRoot), ...files(routerRoot)];
for (const file of modules) {
  const source = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);
  const layer = layerOf(file);
  if (layer && !layers.includes(layer)) {
    report(file, source, `Source modules must belong to a known FSD layer, got "${layer}".`);
  }
  function visit(node) {
    if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier) {
      if (ts.isStringLiteralLike(node.moduleSpecifier)) check(file, node, node.moduleSpecifier.text);
    } else if (ts.isImportEqualsDeclaration(node) && ts.isExternalModuleReference(node.moduleReference)) {
      const expression = node.moduleReference.expression;
      if (expression && ts.isStringLiteralLike(expression)) check(file, node, expression.text);
    } else if (ts.isCallExpression(node) && (
      node.expression.kind === ts.SyntaxKind.ImportKeyword ||
      (ts.isIdentifier(node.expression) && node.expression.text === 'require')
    )) {
      const argument = node.arguments[0];
      if (argument && ts.isStringLiteralLike(argument)) check(file, node, argument.text);
      else report(file, node, 'Computed module imports cannot be checked for layer direction.');
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
}

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
console.log(`FSD layer direction checked: ${modules.length} source modules, ${checkedImports} static imports.`);

