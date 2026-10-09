const fs=require('node:fs');const path=require('node:path');const {execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'..'),release=path.join(root,'outputs/releases'),target=path.join(release,'web');
fs.mkdirSync(target,{recursive:true});
for(const name of fs.readdirSync(path.join(root,'outputs/trigger-lab'))){if(/\.(html|css|mjs)$/.test(name)||name==='lab')fs.cpSync(path.join(root,'outputs/trigger-lab',name),path.join(target,name),{recursive:true});}
fs.writeFileSync(path.join(target,'README.txt'),'网页版：将本目录部署到 HTTPS 静态网站。开发时可运行 python3 -m http.server 8765。不要双击 index.html；模块和 WebHID 需要安全来源。\n');
const zip=path.join(release,`Almost-Broken-${require('../package.json').version}-web.zip`);fs.rmSync(zip,{force:true});execFileSync('zip',['-qr',zip,'web'],{cwd:release});console.log(zip);
