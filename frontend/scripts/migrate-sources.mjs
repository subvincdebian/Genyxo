import fs from 'node:fs';
import path from 'node:path';
import { parse } from 'parse5';
import { parse as parseJs } from '@babel/parser';
import traverseModule from '@babel/traverse';
import generateModule from '@babel/generator';
import * as t from '@babel/types';
import postcss from 'postcss';
const traverse = traverseModule.default || traverseModule;
const generate = generateModule.default || generateModule;
const root = path.resolve(import.meta.dirname, '../..');
const front = path.join(root, 'frontend');
const write = (file, text) => { const dest = path.join(front, file); fs.mkdirSync(path.dirname(dest), { recursive: true }); fs.writeFileSync(dest, text); };
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const pages = [
  ['home', 'public/index.html', '/', ''],
  ['chat', 'public/chat.html', '/chat.html', 'chat'],
  ['profile', 'public/profile.html', '/profile.html', 'profile'],
  ['notifications', 'public/notifications.html', '/notifications.html', 'notifications'],
  ['support', 'public/support.html', '/support.html', 'support'],
  ['admin', 'secure_html/admin.html', '/gate.html', 'admin'],
  ['dashboard', 'secure_html/dashboard.html', '/dashboard.html', 'dashboard'],
  ...['policies', 'privacy-policy', 'terms-of-service', 'faq'].map(name => [name, `public/policies/${name}.html`, `/policies/${name}.html`, `policies/${name}`]),
];
const walk = (node, fn) => { fn(node); for (const child of node.childNodes || []) walk(child, fn); };
const attr = (node, name) => node.attrs?.find(a => a.name === name)?.value;
const content = node => (node.childNodes || []).map(n => n.value || '').join('');
const documentOf = file => parse(read(file));
const jsSources = new Map();
const addSource = (id, code, feature) => {
  if (jsSources.has(id)) return;
  code = code.replaceAll("'https://genyxo.com'", 'API_ORIGIN')
    .replaceAll("'https://genyxo.com/notifications'", '`${SOCKET_ORIGIN}/notifications`')
    .replaceAll("`${API_BASE_URL}/are-you-sure-you-want-to-admin/resolve`", "`${API_BASE_URL}/support/admin/resolve`")
    .replaceAll('`locales/${lang}.json`', '`/locales/${lang}.json`');
  if (feature === 'privacy-policy') code = code.replaceAll("getElementById('overlay')", "getElementById('sidebar-overlay')");
  // Function declarations in classic scripts used last-definition-wins semantics.
  const ast = parseJs(code, { sourceType: 'script', allowReturnOutsideFunction: true });
  const seen = new Set();
  ast.program.body = ast.program.body.toReversed().filter(node => {
    if (!t.isFunctionDeclaration(node) || !node.id) return true;
    if (seen.has(node.id.name)) return false;
    seen.add(node.id.name); return true;
  }).reverse();
  jsSources.set(id, { id, ast, feature });
};
const scriptFeature = { 'script.js': 'platform', 'i18n.js': 'language', 'chat.js': 'conversation', 'demochat.js': 'demo-chat', 'profile-security.js': 'profile-security', 'profile-transactions.js': 'profile-transactions', 'dashboard.js': 'dashboard', 'policies.js': 'policy-navigation' };
for (const [name,file] of pages) {
  const doc = documentOf(file); const scripts = [];
  let head = 0, inline = 0;
  walk(doc, node => {
    if (node.tagName !== 'script' || attr(node,'type') === 'application/ld+json') return;
    const src = attr(node,'src');
    if (src?.startsWith('http')) return;
    if (src) {
      const base = path.basename(src); if (base === 'i18n.js') return; addSource(base, read(`public/js/${base}`), scriptFeature[base]); scripts.push(base);
    } else {
      const inHead = node.parentNode?.tagName === 'head';
      if (name === 'admin' && inHead) {
        const id = 'admin-head0';
        addSource(id, `async function initAdmin() { await Promise.all([loadAdminProfile(), loadUsers(), loadTransactions(), loadAdminTickets()]); document.getElementById('admin-loader')?.remove(); }`, name);
        scripts.push(id); return;
      }
      const id = `${name}-${inHead ? 'head' + head++ : 'inline' + inline++}`;
      addSource(id, content(node), name); scripts.push(id);
    }
  });
  // Deferred files execute after head scripts and before all ready callbacks.
  pages.find(page => page[0] === name).push(scripts.sort((a,b) => (a.includes('-head') ? -1 : a.endsWith('.js') ? 0 : 1) - (b.includes('-head') ? -1 : b.endsWith('.js') ? 0 : 1)));
}
const known = new Set();
const windowNames = new Set();
for (const source of jsSources.values()) {
  const declarations = [];
  for (const node of source.ast.program.body) {
    if ((t.isFunctionDeclaration(node) || t.isClassDeclaration(node)) && node.id) declarations.push(node.id.name);
    if (t.isVariableDeclaration(node)) for (const declaration of node.declarations) declarations.push(...Object.keys(t.getBindingIdentifiers(declaration.id)));
  }
  source.declarations = declarations; declarations.forEach(name => known.add(name));
  traverse(source.ast, { AssignmentExpression(p) { const left=p.node.left; if(t.isMemberExpression(left) && t.isIdentifier(left.object,{name:'window'}) && t.isIdentifier(left.property)) windowNames.add(left.property.name); } });
}
const integrations = new Set(['io','Chart','marked','DOMPurify','confetti']);
const unsupported = new Set();
for (const source of jsSources.values()) {
  const usedImports = new Set();
  traverse(source.ast, {
    AssignmentExpression(p) {
      const left=p.node.left;
      if(t.isIdentifier(left) && !p.scope.hasBinding(left.name) && known.has(left.name)) p.node.left=t.memberExpression(t.identifier('context'),t.identifier(left.name));
    },
    UpdateExpression(p) {
      const argument=p.node.argument;
      if(t.isIdentifier(argument) && !p.scope.hasBinding(argument.name) && known.has(argument.name)) p.node.argument=t.memberExpression(t.identifier('context'),t.identifier(argument.name));
    },
    NewExpression(p) {
      if(t.isIdentifier(p.node.callee,{name:'IntersectionObserver'})) p.replaceWith(t.callExpression(t.memberExpression(t.identifier('scope'),t.identifier('createIntersectionObserver')),p.node.arguments));
      else if(t.isIdentifier(p.node.callee,{name:'ResizeObserver'})) p.replaceWith(t.callExpression(t.memberExpression(t.identifier('scope'),t.identifier('createResizeObserver')),p.node.arguments));
    },    CallExpression(p) {
      const callee = p.node.callee;
      if (t.isMemberExpression(callee) && t.isIdentifier(callee.property,{name:'addEventListener'}) && !(t.isIdentifier(callee.object,{name:'document'}) || t.isIdentifier(callee.object,{name:'window'}))) {
        p.replaceWith(t.callExpression(t.memberExpression(t.identifier('scope'),t.identifier('listen')), [callee.object, ...p.node.arguments]));
      }
    },
    ReferencedIdentifier(p) {
      const name=p.node.name;
      if(p.scope.hasBinding(name)) return;
      if (integrations.has(name)) { usedImports.add(name); return; }
      if (['document','window','fetch','setTimeout','setInterval','requestAnimationFrame'].includes(name)) {
        p.replaceWith(t.memberExpression(t.identifier('scope'),t.identifier(name))); p.skip(); return;
      }
      if (known.has(name)) { p.replaceWith(t.memberExpression(t.identifier('context'),t.identifier(name))); p.skip(); return; }
      if (windowNames.has(name)) { p.replaceWith(t.memberExpression(t.memberExpression(t.identifier('scope'),t.identifier('window')),t.identifier(name))); p.skip(); return; }
    },
  });
  const feature = source.feature;
  source.output = `src/fsd/features/${feature}/model/${source.id.replace('.js','')}.js`;
  const exports = source.declarations.map(name => `Object.defineProperty(context, ${JSON.stringify(name)}, { configurable: true, get: () => ${name}${source.ast.program.body.find(node => t.isVariableDeclaration(node) && node.kind !== 'const' && node.declarations.some(d => t.isIdentifier(d.id,{name}))) ? `, set: value => { ${name} = value; }` : ''} });`).join('\n');
  const funcs = source.ast.program.body.filter(node => t.isFunctionDeclaration(node) && node.id).map(node => `scope.expose(${JSON.stringify(node.id.name)}, ${node.id.name});`).join('\n');
  write(source.output, `// Behavior migrated from ${source.id}; resources are owned by the React mount.\n${usedImports.size ? `import { ${[...usedImports].join(', ')} } from '@/shared/lib/browser-integrations';\n` : ''}import { API_BASE_URL as API_ORIGIN, SOCKET_URL as SOCKET_ORIGIN } from '@/shared/config';\nexport default function initialize(scope, context) {\n${generate(source.ast,{comments:true}).code}\n${exports}\n${funcs}\n${source.id==='script.js' ? `scope.cleanup(() => { if (socket) socket.disconnect(); });` : ''}\n}\n`);
}
const attributes = { class:'className', for:'htmlFor', tabindex:'tabIndex', readonly:'readOnly', maxlength:'maxLength', minlength:'minLength', colspan:'colSpan', rowspan:'rowSpan', contenteditable:'contentEditable', spellcheck:'spellCheck', autocomplete:'autoComplete', autofocus:'autoFocus', autocapitalize:'autoCapitalize', crossorigin:'crossOrigin', fetchpriority:'fetchPriority', srcset:'srcSet', frameborder:'frameBorder', allowfullscreen:'allowFullScreen', referrerpolicy:'referrerPolicy', acceptcharset:'acceptCharset', viewbox:'viewBox', preserveaspectratio:'preserveAspectRatio', gradientunits:'gradientUnits', gradienttransform:'gradientTransform', markerwidth:'markerWidth', markerheight:'markerHeight', refx:'refX', refy:'refY', patternunits:'patternUnits', patterncontentunits:'patternContentUnits', textlength:'textLength', lengthadjust:'lengthAdjust', charset:'charSet', datetime:'dateTime', playsinline:'playsInline', usemap:'useMap', httpequiv:'httpEquiv', enctype:'encType', novalidate:'noValidate', formaction:'formAction', srcdoc:'srcDoc', 'xlink:href':'xlinkHref', 'xml:space':'xmlSpace', 'xmlns:xlink':'xmlnsXlink' };
const booleans = new Set(['disabled','checked','multiple','required','hidden','autofocus','readonly','selected','controls','loop','muted','autoplay','open','allowfullscreen','playsinline']);
const camel = name => name.replace(/^-ms-/, 'ms-').replace(/-([a-z])/g,(_,c)=>c.toUpperCase());
const asset = (url,file) => {
  if (!url || /^(https?:|data:|blob:|#|mailto:|tel:|javascript:)/.test(url)) return url;
  if(url.startsWith('/')) return url;
  const absolute = path.posix.normalize(path.posix.join(path.posix.dirname(file.replaceAll('\\','/')), url));
  return '/' + absolute.replace(/^public\//,'').replace(/^secure_html\//,'');
};
for (const [name,file,url,folder,scripts] of pages) {
  const doc = documentOf(file); let body,head;
  walk(doc,node => { if(node.tagName==='body')body=node; if(node.tagName==='head')head=node; });
  let actionId=0; const actions=[]; const inlineCss=[]; const css=[]; const links=[]; const ld=[];
  walk(doc,node => {
    if(node.tagName==='style')inlineCss.push((name === 'admin' ? content(node).replace('display: none;', 'display: block;') : content(node)).replace(/(@keyframes\s+|animation(?:-name)?\s*:\s*)(spin|pulse|bounce|ping)\b/g, '$1genyxo-$2'));
    if(node.tagName==='script' && attr(node,'type')==='application/ld+json')ld.push(content(node));
    if(node.tagName==='link' && attr(node,'rel')==='stylesheet'){
      const href=attr(node,'href'); if(href.startsWith('http'))links.push(href); else css.push(path.basename(href));
    }
  });
  function render(node) {
    if(node.nodeName==='#text')return node.value.trim() ? `{${JSON.stringify(node.value)}}` : node.value;
    if(!node.tagName || ['script','style'].includes(node.tagName))return '';
    if (node.tagName==='link')return '';
    const props=[];
    const translationKey = attr(node, 'data-i18n') || (attr(node, 'id') === 'currentLangDisplay' ? 'menu.language' : undefined);
    const localized = !!translationKey;
    const tag = localized ? 'Localized' : node.tagName;
    if (localized) props.push(`as=${JSON.stringify(node.tagName)} translationKey=${JSON.stringify(translationKey)}`);
    for(const a of node.attrs || []){
      const key=a.name;
      if(key === 'a') continue;
      if(key.startsWith('on')){
        const id=`${name}-${actionId++}`;
        const eventName={onclick:'onClick',onchange:'onChange',oninput:'onInput',onkeyup:'onKeyUp',onkeydown:'onKeyDown',onerror:'onError',onload:'onLoad',onmouseover:'onMouseOver',onmouseout:'onMouseOut',onsubmit:'onSubmit',onfocus:'onFocus',onblur:'onBlur',onmousedown:'onMouseDown',onmouseup:'onMouseUp'}[key];
        if(!eventName)throw new Error(`Unsupported event ${key}`);
        props.push(`${eventName}={event => dispatch(${JSON.stringify(id)}, event)}`);
        actions.push([id,a.value]);continue;
      }
      if(key==='selected')continue;
      if(key==='style'){
        const style={};
        postcss.parse(`a{${a.value}}`).walkDecls(d=>{style[d.prop.startsWith('--')?d.prop:camel(d.prop)]=d.value.replace(/\s*!important\s*$/,'');});
        if(Object.keys(style).some(k=>k.startsWith('--'))){
          const className=`gx-inline-${name}-${actionId++}`;
          inlineCss.push(`.${className}{${a.value}}`);
          const cls=node.attrs.find(a=>a.name==='class'); if(cls)cls.value+=` ${className}`; else props.push(`className=${JSON.stringify(className)}`);
        }else props.push(`style={${JSON.stringify(style)}}`);
        continue;
      }
      let val=a.value;
      if(['src','href','poster'].includes(key))val=asset(val,file);
      if(key==='href' && val.startsWith('https://genyxo.com/auth/'))val=val.replace('https://genyxo.com','');
      let prop=attributes[key] || (key.includes('-') && !key.startsWith('data-') && !key.startsWith('aria-') ? camel(key) : key);
      if(key==='value' && ['input','textarea','select'].includes(node.tagName))prop='defaultValue';
      if(key==='checked')prop='defaultChecked';
      if(key==='autoplay')prop='autoPlay';
      if (['rows','cols','tabIndex','maxLength','minLength','colSpan','rowSpan','size'].includes(prop)) { props.push(prop + '={' + Number(val) + '}'); continue; }
      props.push(booleans.has(key)?`${prop}={true}`:`${prop}=${JSON.stringify(val)}`);
    }
    if(node.tagName==='textarea'){props.push(`defaultValue=${JSON.stringify(content(node))}`);return `<${tag} ${props.join(' ')} />`;}
    if(node.tagName==='select'){
      const selected=node.childNodes?.find(n=>n.tagName==='option' && n.attrs.some(a=>a.name==='selected'));
      if(selected && !props.some(p=>p.startsWith('defaultValue')))props.push(`defaultValue=${JSON.stringify(attr(selected,'value') || content(selected))}`);
    }
    const voids=new Set(['area','base','br','col','embed','hr','img','input','link','meta','param','source','track','wbr']);
    return `<${tag}${props.length?' '+props.join(' '):''}${voids.has(node.tagName)?' />':`>${(attr(node, 'id') === 'langGrid' ? '<LanguageGrid />' : (node.childNodes || []).map(render).join(''))}</${tag}>`}`;
  }
  const widgets=[];let widgetIndex=0;
  for(const node of body.childNodes || []){
    if(!node.tagName || ['script','style'].includes(node.tagName))continue;
    const markup=render(node);if(!markup)continue;
    const identity = (attr(node, 'id') || attr(node, 'class')?.split(' ')[0] || node.tagName).replace(/[^a-zA-Z0-9]+/g, '-');
    let component = (name + '-' + identity).replace(/(^|-)([a-z])/g,(_,a,b)=>b.toUpperCase());
    if (widgets.includes(component)) component += ++widgetIndex;
    widgets.push(component);
    write(`src/fsd/widgets/${name}/ui/${component}.tsx`, `'use client';\nimport type { SyntheticEvent } from 'react';\n${markup.includes('Localized') || markup.includes('LanguageGrid') ? `import { ${[markup.includes('Localized') ? 'Localized' : '', markup.includes('LanguageGrid') ? 'LanguageGrid' : ''].filter(Boolean).join(', ')} } from '@/features/language';` : ''}\nexport function ${component}({${markup.includes('dispatch(') ? 'dispatch' : ''}}: {dispatch:(name:string,event:SyntheticEvent<Element>)=>unknown}) { return (${markup}); }\n`);
  }
  write(`src/fsd/widgets/${name}/index.ts`,widgets.map(c=>`export { ${c} } from './ui/${c}';`).join('\n'));
  // Handlers are compiled functions, never strings interpreted at runtime.
  const handlers=actions.map(([id,code])=>{
    const ast=parseJs(`function handler(event){${code}}`,{sourceType:'script'});
    traverse(ast,{ReferencedIdentifier(p){const n=p.node.name;if(p.scope.hasBinding(n))return;if(n==='document'||n==='window'){p.replaceWith(t.memberExpression(t.identifier('scope'),t.identifier(n)));p.skip();return;}if(known.has(n)){p.replaceWith(t.memberExpression(t.identifier('context'),t.identifier(n)));p.skip();return;}if(windowNames.has(n)){p.replaceWith(t.memberExpression(t.memberExpression(t.identifier('scope'),t.identifier('window')),t.identifier(n)));p.skip();return;}if(!['event','console'].includes(n)){unsupported.add(n);p.replaceWith(t.memberExpression(t.memberExpression(t.identifier('scope'),t.identifier('window')),t.identifier(n)));p.skip();}}});
    return `scope.register(${JSON.stringify(id)}, ${generate(ast.program.body[0]).code.replace('function handler','function')});`;
  });
  const imports=scripts.map((id,i)=>`import initialize${i} from '@/features/${jsSources.get(id).feature}/model/${id.replace('.js','')}.js';`).join('\n');
  write(`src/fsd/pages/${name}/model/initialize.js`,`${imports}\nexport default function initialize(scope){const context=scope.context;\n${scripts.map((id,i)=>`initialize${i}(scope,context);`).join('\n')}\n${handlers.join('\n')}\nif (context.loadProducts) { scope.listen(document, 'genyxo:language', () => context.loadProducts()); scope.onReady(() => context.loadProducts()); }\nscope.expose('openLangModal', () => { const modal=document.getElementById('langModal'); if(modal) modal.style.display='flex'; });\nscope.listen(document, 'click', event => { const button=event.target.closest?.('[data-i18n=\"menu.language\"]')?.parentElement; if(button && button.contains(event.target)) { event.preventDefault(); const modal=document.getElementById('langModal'); if(modal) modal.style.display='flex'; } if(event.target.closest?.('#closeLangModal')) { const modal=document.getElementById('langModal'); if(modal) modal.style.display='none'; } });\n${['policies','privacy-policy','terms-of-service','faq'].includes(name) ? `scope.expose('closeSidebarOnMobile', () => { if(window.innerWidth <= 992) context.closeMenu(); }); scope.expose('toggleSidebar', context.toggleSidebar = () => { document.getElementById('sidebar')?.classList.toggle('active'); document.getElementById('sidebar-overlay')?.classList.toggle('active'); }); scope.expose('openTab', () => {});` : ''}\n}`);
  const component=name.replace(/(^|-)([a-z])/g,(_,a,b)=>b.toUpperCase())+'Page';
  write(`src/fsd/pages/${name}/ui/${component}.tsx`,`'use client';\nimport { useController } from '@/shared/lib/use-controller';\nimport { ${widgets.join(', ')} } from '@/widgets/${name}';\nconst loadController=()=>import('../model/initialize').then(module=>module.default);\nexport function ${component}(){const dispatch=useController(loadController);return <>${widgets.map(c=>`<${c} dispatch={dispatch}/>`).join('')}</>;}`);
  write(`src/fsd/pages/${name}/index.ts`,`export { ${component} } from './ui/${component}';`);
  if(inlineCss.length)write(`src/fsd/pages/${name}/ui/page.css`,inlineCss.join('\n'));
  const titleNode=head.childNodes.find(n=>n.tagName==='title');
  const description=head.childNodes.find(n=>n.tagName==='meta'&&attr(n,'name')==='description');
  const privatePage=['admin','dashboard','profile','support','notifications'].includes(name);
  const pageCode=`import type { Metadata } from 'next';\nimport { ${component} } from '@/pages/${name}';\n${css.map(file=>`import '@/shared/styles/${file}';`).join('\n')}\n${inlineCss.length?`import '@/pages/${name}/ui/page.css';`:''}\n${['admin','dashboard'].includes(name)?`import {AdminBoundary} from '@/entities/session';`:''}\nexport const metadata:Metadata=${JSON.stringify({title:content(titleNode),description:description?attr(description,'content'):undefined,robots:privatePage?{index:false,follow:false}:{index:true,follow:true},alternates:{canonical:url==='/'?'https://genyxo.com/':`https://genyxo.com${url}`}})};\nexport default function Page(){return <>${links.map(href=>`<link rel="stylesheet" href=${JSON.stringify(href)}/>`).join('')}${ld.map(json=>`<script type="application/ld+json" dangerouslySetInnerHTML={{__html:${JSON.stringify(json)}}}/>`).join('')}${['admin','dashboard'].includes(name)?`<AdminBoundary><${component}/></AdminBoundary>`:`<${component}/>`}</>;}`;
  write(`app/${folder?folder+'/':''}page.tsx`,pageCode);
}
write('scripts/migration-report.json',JSON.stringify({pages:pages.map(([name,file,url])=>({name,file,url})),unresolvedOriginalHandlers:[...unsupported]},null,2));
for(const dir of ['images','locales'])fs.cpSync(path.join(root,'public',dir),path.join(front,'public',dir),{recursive:true});
for(const file of ['robots.txt','sitemap.xml'])fs.copyFileSync(path.join(root,'public',file),path.join(front,'public',file));
console.log(`Migrated ${pages.length} screens and ${jsSources.size} behavior modules. Original unresolved handlers: ${[...unsupported].join(', ')}`);







