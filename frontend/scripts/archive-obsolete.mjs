import fs from 'node:fs';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..');
const archive=path.join(root,'.tmp','obsolete-widgets');
const widgets=path.join(root,'src','fsd','widgets');
for(const entry of fs.readdirSync(widgets)) {
  const directory=path.join(widgets,entry,'ui');
  for(const name of fs.readdirSync(directory)) if(/Section\d+\.tsx$/.test(name)) {
    const source=path.resolve(directory,name),target=path.resolve(archive,entry,name);
    if(!source.startsWith(root+path.sep)||!target.startsWith(root+path.sep))throw Error('Outside frontend');
    fs.mkdirSync(path.dirname(target),{recursive:true});fs.renameSync(source,target);
  }
}
