const fs = require('fs');
const path = require('path');

const walkSync = function(dir, filelist) {
  let files = fs.readdirSync(dir);
  filelist = filelist || [];
  files.forEach(function(file) {
    if (fs.statSync(path.join(dir, file)).isDirectory()) {
      filelist = walkSync(path.join(dir, file), filelist);
    } else {
      filelist.push(path.join(dir, file));
    }
  });
  return filelist;
};

const files = walkSync('c:/Odi.Pet/src/app/api');
files.forEach(file => {
  if (file.endsWith('.ts') || file.endsWith('.tsx')) {
    let content = fs.readFileSync(file, 'utf8');
    let original = content;
    content = content.replace(/\/\/\s*revalidateTag\('dashboard'\)/g, "revalidateTag('dashboard', 'default')");
    content = content.replace(/[^\/]\s*revalidateTag\('dashboard'\)/g, match => match.replace("revalidateTag('dashboard')", "revalidateTag('dashboard', 'default')"));
    if (content !== original) {
      fs.writeFileSync(file, content);
      console.log('Fixed', file);
    }
  }
});
