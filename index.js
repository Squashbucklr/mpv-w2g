const WebSocket = require('ws');
const readline = require('readline');
const { exec } = require('child_process');
const { promises: fs } = require('fs');
const config = require('./config.js');

(async function() {

    mpv('show-text "bridge started"');
    
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    let lobby = await new Promise((r,e) => rl.question('lobby id\n', r));
    rl.close();

    let ws = new WebSocket('wss://' + config.home + '/lobby?mpv=true&id=' + lobby);

    let cur = {
        v: '',
        t: -1,
        p: null // normally true or false
    }

    ws.on('message', async msg => {
        let message = JSON.parse(msg.toString('utf8'));
        if (message.type != 'pong') console.log(message);
        if (message.type == 'video') {
            if (cur.v != message.video.url && message.video.url.length) {
                mpv('loadfile ' + geturl(message.video.url));
                cur.v = message.video.url;
            }
            cur.v = message.video.url;

            if (cur.t != message.video.time) {
                mpv('{ "command": ["seek", ' + message.video.time + ', "absolute", "exact"] }');
            }
            cur.t = message.video.time;

            if (cur.p !== message.video.play) {
                mpv('{ "command": ["set_property", "pause", ' + !message.video.play + '] }');
            }
            cur.p = message.video.play;
        }
        if (message.type == 'mpv') {
            switch (message.command) {                                         
                case 'display':                                             
                    mpv('show-text ${track-list}');
                    break;                                                  
                case 'subcycle':                                            
                    mpv('cycle sub');
                    break;                                                  
                case 'audiocycle':                                          
                    mpv('cycle audio');
                    break;                                                  
                case 'voldown':                                             
                    mpv('add volume -2');
                    break;                                                  
                case 'volup':                                               
                    mpv('add volume +2');
                    break;                                                  
                case 'subdelaydown':                                        
                    mpv('add sub-delay -0.1');
                    break;                                                  
                case 'subdelayup':                                          
                    mpv('add sub-delay +0.1');
                    break;                                                  
                case 'audiodelaydown':                                      
                    mpv('add audio-delay -0.100');
                    break;                                                  
                case 'audiodelayup':                                        
                    mpv('add audio-delay +0.100');
                    break;                                                  
            }            
        }
    });

    ws.on('open', () => {
        mpv('show-text "websocket connected"');
        ws.send(JSON.stringify({
            type: 'name',
            name: 'mpv-w2g'
        }));
        setInterval(() => {
            ws.send(JSON.stringify({
                type: 'ping'
            }));
        }, 5000);
    });
})();


function mpv(msg) {
    console.log(msg);
    if (process.platform == 'win32') {
        exec('echo ' + msg + ' >\\\\.\\pipe\\mpv-w2g', (er, o, e) => {
            if (er) console.log(er);
            else if (e) console.log(e);
        });
    } else {
        exec("echo '" + msg + "' | socat - /tmp/mpv-w2g", (er, o, e) => {
            if (er) console.log(er);
            else if (e) console.log(e);
        });
    }
}

function geturl(weburl) {
    let query = weburl.slice(weburl.indexOf('?') + 1);
    let params = new URLSearchParams(query);
    let local = params.get('local');
    if (local) {
        return local;
    } else {
        return weburl;
    }
}
