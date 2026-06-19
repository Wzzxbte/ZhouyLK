const http = require('http');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const net = require('net');

const PORT = 8765;
const SAVE_DIR = 'E:\\22';
const YTDLP = path.join(__dirname, 'yt-dlp.exe');
const PROXY_HOST = '127.0.0.1';
const PROXY_PORT = 7897;

if (!fs.existsSync(SAVE_DIR)) fs.mkdirSync(SAVE_DIR, { recursive: true });

function proxyAvailable() {
  return new Promise((resolve) => {
    const sock = new net.Socket();
    sock.setTimeout(2000);
    sock.on('connect', () => { sock.destroy(); resolve(true); });
    sock.on('error', () => { sock.destroy(); resolve(false); });
    sock.on('timeout', () => { sock.destroy(); resolve(false); });
    sock.connect(PROXY_PORT, PROXY_HOST);
  });
}

const HTML = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>视频下载器</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:"Microsoft YaHei",sans-serif;background:#1a1a2e;color:#eee;min-height:100vh;display:flex;justify-content:center;align-items:center;padding:20px}
.box{background:#16213e;border-radius:16px;padding:32px;width:100%;max-width:620px;box-shadow:0 8px 32px rgba(0,0,0,.4)}
h1{text-align:center;margin-bottom:24px;font-size:22px;color:#e94560}
.row{display:flex;gap:10px;margin-bottom:16px}
input{flex:1;padding:12px 16px;border:2px solid #0f3460;border-radius:10px;background:#1a1a2e;color:#fff;font-size:15px;outline:none;transition:border .2s}
input:focus{border-color:#e94560}
button{padding:12px 24px;background:#e94560;color:#fff;border:none;border-radius:10px;font-size:15px;cursor:pointer;font-weight:bold;white-space:nowrap;transition:opacity .2s}
button:hover{opacity:.85}
button:disabled{opacity:.4;cursor:not-allowed}
.folder-row{display:flex;align-items:center;gap:10px;margin-bottom:20px;font-size:13px;color:#aaa;flex-wrap:wrap}
.folder-row span{color:#e94560;cursor:pointer;text-decoration:underline}
#proxyStatus{font-size:12px;padding:2px 8px;border-radius:10px}
.proxy-on{background:#1b5e20;color:#4caf50}
.proxy-off{background:#3e2723;color:#ff9800}
#status{background:#0f0f1a;border-radius:10px;padding:20px;min-height:80px}
.progress-wrap{display:none;margin-bottom:12px}
.progress-bar{height:8px;background:#0f3460;border-radius:4px;overflow:hidden;margin-bottom:8px}
.progress-fill{height:100%;background:#e94560;border-radius:4px;width:0%;transition:width .3s}
.progress-info{display:flex;justify-content:space-between;font-size:13px;color:#aaa}
#log{font-size:13px;font-family:Consolas,monospace;line-height:1.6;white-space:pre-wrap;word-break:break-all;max-height:200px;overflow-y:auto;margin-top:8px;color:#888}
.ok{color:#4caf50}
.err{color:#e94560}
.info{color:#aaa}
</style>
</head>
<body>
<div class="box">
<h1>视频下载器</h1>
<div class="row">
<input id="url" type="text" placeholder="在这里粘贴视频链接..." autofocus>
<button id="btn" onclick="download()">下载</button>
</div>
<div class="folder-row">
保存到 E:\\22 &nbsp;<span onclick="fetch('/open-folder')">打开文件夹</span>
<span id="proxyStatus">检测中...</span>
</div>
<div id="status"><span class="info">等待粘贴链接...</span></div>
<div id="log"></div>
<div class="progress-wrap" id="pw">
<div class="progress-bar"><div class="progress-fill" id="pfill"></div></div>
<div class="progress-info"><span id="pct">0%</span><span id="spd"></span><span id="eta"></span></div>
</div>
</div>
<script>
const log=document.getElementById('log'),btn=document.getElementById('btn'),
  urlInp=document.getElementById('url'),status=document.getElementById('status'),
  pw=document.getElementById('pw'),pfill=document.getElementById('pfill'),
  pct=document.getElementById('pct'),spd=document.getElementById('spd'),
  eta=document.getElementById('eta'),proxyStatus=document.getElementById('proxyStatus');

function addLog(msg,cls){log.innerHTML+='\\n<span class="'+(cls||'')+'">'+msg+'</span>';log.scrollTop=log.scrollHeight}

async function checkProxy(){
try{const r=await fetch('/proxy-check');const d=await r.json();
proxyStatus.textContent=d.on?'代理已连接':'无代理';
proxyStatus.className=d.on?'proxy-on':'proxy-off'}catch(e){}
}
checkProxy();

async function download(){
const url=urlInp.value.trim();
if(!url){status.innerHTML='<span class="err">请先粘贴链接</span>';return}
btn.disabled=true;log.innerHTML='';status.innerHTML='<span class="info">正在解析链接...</span>';
pw.style.display='none';

try{
const resp=await fetch('/download-go',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({url})});
const data=await resp.json();
if(!data.ok){status.innerHTML='<span class="err">'+data.error+'</span>';btn.disabled=false;return}
const evtSrc=new EventSource('/progress/'+data.id);
evtSrc.onmessage=function(e){
const d=JSON.parse(e.data);
if(d.type==='info'){status.innerHTML='<span class="info">'+d.msg+'</span>';addLog(d.msg,'info')}
if(d.type==='progress'){
pw.style.display='block';pfill.style.width=d.pct+'%';pct.textContent=d.pct+'%';
spd.textContent=d.speed||'';eta.textContent=d.eta?'剩余 '+d.eta:'';
status.innerHTML='<span class="info">正在下载...</span>';
}
if(d.type==='done'){evtSrc.close();status.innerHTML='<span class="ok">下载完成！'+d.file+'</span>';addLog('完成: '+d.file,'ok');btn.disabled=false}
if(d.type==='error'){evtSrc.close();status.innerHTML='<span class="err">'+d.msg+'</span>';addLog(d.msg,'err');btn.disabled=false}
};
evtSrc.onerror=function(){evtSrc.close();btn.disabled=false}
}catch(e){status.innerHTML='<span class="err">连接失败，确定双击的是"视频下载器"吗？</span>';btn.disabled=false}
}
urlInp.addEventListener('keydown',function(e){if(e.key==='Enter')download()})
</script>
</body>
</html>`;

const tasks = new Map();
let taskId = 0;

function parseProgress(line) {
  const m = line.match(/(\d+\.?\d*)%\s+of\s+(.+?)\s+at\s+(.+?\/s)\s+ETA\s+(.+)/);
  if (m) return { pct: parseFloat(m[1]), total: m[2], speed: m[3], eta: m[4] };
  return null;
}

const server = http.createServer((req, res) => {
  if (req.method === 'GET' && req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(HTML);
    return;
  }

  if (req.method === 'GET' && req.url === '/proxy-check') {
    proxyAvailable().then(on => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ on }));
    });
    return;
  }

  if (req.method === 'GET' && req.url === '/open-folder') {
    spawn('explorer', [SAVE_DIR]);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true }));
    return;
  }

  if (req.method === 'GET' && req.url.startsWith('/progress/')) {
    const id = req.url.split('/progress/')[1];
    const task = tasks.get(id);
    if (!task) { res.writeHead(404); res.end('not found'); return; }

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    });

    const send = (data) => res.write('data: ' + JSON.stringify(data) + '\n\n');

    task.onMsg = (data) => {
      try { send(data); } catch (e) {}
      if (data.type === 'done' || data.type === 'error') {
        res.end();
        tasks.delete(id);
      }
    };

    req.on('close', () => { tasks.delete(id); try { task.proc.kill(); } catch(e){} });
    return;
  }

  if (req.method === 'POST' && req.url === '/download-go') {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', async () => {
      let url;
      try { url = JSON.parse(body).url; } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: '请求格式错误' }));
        return;
      }
      if (!url) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: '没收到链接' }));
        return;
      }

      const useProxy = await proxyAvailable();

      const args = ['-o', path.join(SAVE_DIR, '%(title)s.%(ext)s'), url, '--newline', '--progress', '--no-simulate'];
      if (useProxy) args.push('--proxy', 'http://' + PROXY_HOST + ':' + PROXY_PORT);

      const id = String(++taskId);
      const proc = spawn(YTDLP, args, {
        stdio: ['ignore', 'pipe', 'pipe'],
        env: { ...process.env, PYTHONUNBUFFERED: '1' }
      });

      const task = { proc, onMsg: null };
      tasks.set(id, task);

      let lastFile = '';
      let doneSent = false;

      const emit = (data) => { if (task.onMsg) task.onMsg(data); };

      proc.stdout.on('data', (chunk) => {
        const lines = chunk.toString().split('\n').filter(Boolean);
        for (const line of lines) {
          const dest = line.match(/\[download\] Destination: (.+)/);
          if (dest) { lastFile = path.basename(dest[1]); emit({ type: 'info', msg: '文件: ' + lastFile }); continue; }
          const dl = line.match(/\[download\] (.+)/);
          if (dl) {
            const p = parseProgress(dl[1]);
            if (p) emit({ type: 'progress', pct: Math.round(p.pct), speed: p.speed, eta: p.eta });
            continue;
          }
          if (line.includes('has already been downloaded')) emit({ type: 'info', msg: '文件已存在，跳过' });
        }
      });

      proc.stderr.on('data', (chunk) => {
        const lines = chunk.toString().split('\n').filter(Boolean);
        for (const line of lines) {
          const clean = line.replace(/^\[yt-dlp\]\s*/, '').trim();
          if (clean && !clean.includes('WARNING:')) emit({ type: 'info', msg: clean.slice(0, 200) });
        }
      });

      proc.on('close', (code) => {
        if (!doneSent) {
          doneSent = true;
          if (code === 0) emit({ type: 'done', file: lastFile || '完成' });
          else emit({ type: 'error', msg: '下载失败，链接可能失效或需要代理' });
        }
      });

      proc.on('error', (err) => {
        if (!doneSent) { doneSent = true; emit({ type: 'error', msg: err.message }); }
      });

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true, id }));
    });
    return;
  }

  res.writeHead(404);
  res.end('404');
});

server.listen(PORT, () => {
  console.log('视频下载器已启动: http://localhost:' + PORT);
  console.log('保存目录: ' + SAVE_DIR);
});
