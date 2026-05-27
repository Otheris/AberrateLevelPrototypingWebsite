@echo off
set PORT=5500
set HOST=127.0.0.1

echo Starting minimal HTTP server using Python...
python -m http.server %PORT% --bind %HOST%
if %errorlevel% neq 0 (
    echo Python not found. Trying node...
    node -e "const http=require('http'),fs=require('fs'),path=require('path');http.createServer((req,res)=>{let p=path.join('.',req.url==='/'?'index.html':req.url);fs.readFile(p,(err,data)=>{if(err){res.writeHead(404);res.end();}else{const ext=path.extname(p);res.writeHead(200,{'Content-Type':ext==='.html'?'text/html':ext==='.js'?'application/javascript':ext==='.css'?'text/css':'text/plain'});res.end(data);}})}).listen(%PORT%, '%HOST%', ()=>console.log('Listening on http://%HOST%:%PORT%/'));"
)
if %errorlevel% neq 0 (
    echo Node not found either. Please open index.html directly or install Python/Node.
)
pause
