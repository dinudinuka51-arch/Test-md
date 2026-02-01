const { 
    default: makeWASocket, 
    useMultiFileAuthState, 
    fetchLatestBaileysVersion,
    makeCacheableSignalKeyStore,
    DisconnectReason
} = require('@whiskeysockets/baileys');
const pino = require('pino');
const fs = require('fs-extra');
const yts = require('yt-search');
const ytdl = require('ytdl-core');

// ⚙️ CONFIGURATION
const ownerNumber = "94762498519@s.whatsapp.net"; 
const pairingNumber = "94762498519"; 
const botName = "VINU ROMAN MESSAGER";
let mode = "public"; 

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info');
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
        version,
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "silent" })),
        },
        printQRInTerminal: false,
        logger: pino({ level: 'silent' }),
        browser: ["Ubuntu", "Chrome", "20.0.04"],
        connectTimeoutMs: 60000,
        keepAliveIntervalMs: 15000
    });

    // PAIRING CODE
    if (!sock.authState.creds.registered) {
        setTimeout(async () => {
            try {
                let code = await sock.requestPairingCode(pairingNumber);
                code = code?.match(/.{1,4}/g)?.join("-") || code;
                console.log(`\n\n==== 🔑 YOUR PAIRING CODE: ${code} ====\n\n`);
            } catch (err) { console.error("Pairing Error: ", err); }
        }, 8000);
    }

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'open') {
            console.log("✅ VINU ROMAN Connected!");
            sock.sendMessage(ownerNumber, { text: "System Online! 🚀\nStable Version 2.1.0" });
        }
        if (connection === 'close') {
            let reason = lastDisconnect?.error?.output?.statusCode;
            if (reason !== DisconnectReason.loggedOut) startBot();
        }
    });

    sock.ev.on('messages.upsert', async ({ messages }) => {
        const msg = messages[0];
        if (!msg.message || msg.key.fromMe) return;

        const from = msg.key.remoteJid;
        const pushName = msg.pushName || 'User';
        const body = msg.message.conversation || msg.message.extendedTextMessage?.text || "";
        const prefix = ".";

        if (!body.startsWith(prefix)) return;
        const args = body.slice(prefix.length).trim().split(/\s+/);
        const command = args.shift().toLowerCase();
        const text = args.join(" ");

        try {
            switch (command) {
                case 'menu':
                case 'help':
                    const menu = `┏━━━━━━━━━━━━━━━━━━━━━━━━┓\n┃  ✨ *${botName}* ✨  ┃\n┗━━━━━━━━━━━━━━━━━━━━━━━━┛\n\n` +
                                 `👤 *User:* ${pushName}\n⚙️ *Mode:* ${mode}\n\n` +
                                 `*📥 DOWNLOADS*\n.song [name]\n.video [link]\n\n` +
                                 `*📊 INFO*\n.alive\n.runtime\n.owner\n\n` +
                                 `> *POWERED BY VINU ROMAN*`;
                    await sock.sendMessage(from, { text: menu }, { quoted: msg });
                    break;

                case 'alive':
                    await sock.sendMessage(from, { text: `👋 *Hi ${pushName}*\n\nVINU ROMAN is Alive! ✅` }, { quoted: msg });
                    break;

                case 'song':
                    if (!text) return sock.sendMessage(from, { text: "❌ සිංදුවේ නම දෙන්න." });
                    await sock.sendMessage(from, { text: "🎧 *සොයමින් පවතියි...*" });
                    
                    const search = await yts(text);
                    const video = search.videos[0];
                    if (!video) return sock.sendMessage(from, { text: "❌ සොයාගත නොහැකි විය." });

                    const filePath = './temp.mp3';
                    const videoStream = ytdl(video.url, { filter: 'audioonly' });
                    
                    videoStream.pipe(fs.createWriteStream(filePath)).on('finish', async () => {
                        await sock.sendMessage(from, { 
                            audio: fs.readFileSync(filePath), 
                            mimetype: 'audio/mp4',
                            fileName: `${video.title}.mp3`
                        }, { quoted: msg });
                        fs.unlinkSync(filePath);
                    });
                    break;

                case 'owner':
                    await sock.sendMessage(from, { text: `👑 *Owner:* VINU ROMAN\n📱 *Number:* 94762498519` });
                    break;

                case 'runtime':
                    const uptime = process.uptime();
                    await sock.sendMessage(from, { text: `🚀 *Runtime:* ${Math.floor(uptime / 60)} Minutes` });
                    break;
            }
        } catch (e) {
            console.log(e);
        }
    });
}
startBot();
