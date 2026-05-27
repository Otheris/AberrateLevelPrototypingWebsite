#!/bin/bash
PORT=5500
HOST="127.0.0.1"

echo "Starting minimal HTTP server..."
if command -v python3 &>/dev/null; then
    python3 -m http.server $PORT --bind $HOST
elif command -v python &>/dev/null; then
    python -m http.server $PORT --bind $HOST
elif command -v node &>/dev/null; then
    node -e "const http=require('http'),fs=require('fs'),path=require('path');http.createServer((req,res)=>{let p=path.join('.',req.url==='/'?'index.html':req.url.split('?')[0]);fs.readFile(p,(err,data)=>{if(err){res.writeHead(404);res.end();}else{const ext=path.extname(p);res.writeHead(200,{'Content-Type':ext==='.html'?'text/html':ext==='.js'?'application/javascript':ext==='.css'?'text/css':'text/plain'});res.end(data);}})}).listen($PORT, '$HOST', ()=>console.log('Listening on http://$HOST:$PORT/'));"
else
    echo "Neither python nor node is installed. Please open index.html directly."
fi
