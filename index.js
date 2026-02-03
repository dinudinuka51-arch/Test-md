const { 
    default: makeWASocket, 
    useMultiFileAuthState, 
    fetchLatestBaileysVersion,
    makeCacheableSignalKeyStore,
    DisconnectReason
} = require('@whiskeysockets/baileys');
const pino = require('pino');
const fs = require('fs-extra');
const axios = require('axios');
const yts = require('yt-search');

const ownerNumber = "94762498519@s.whatsapp.net"; 
const pairingNumber = "94762498519"; 
const botName = "VINU ROMAN AI";

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
        browser: ["Ubuntu", "Chrome", "20.0.04"]
    });

    // PAIRING CODE GENERATOR
    if (!sock.authState.creds.registered) {
        setTimeout(async () => {
            try {
                let code = await sock.requestPairingCode(pairingNumber);
                code = code?.match(/.{1,4}/g)?.join("-") || code;
                console.log(`\n\n==== 🔑 YOUR PAIRING CODE: ${code} ====\n\n`);
            } catch (err) { console.error("Pairing Error:", err); }
        }, 8000);
    }

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'open') {
            console.log("✅ VINU ROMAN CONNECTED SUCCESSFULLY!");
            sock.sendMessage(ownerNumber, { text: "System Online! 🚀\nMulti-API Song Downloader Active." });
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
        const isCmd = body.startsWith(prefix);
        const command = isCmd ? body.slice(prefix.length).trim().split(/\s+/).shift().toLowerCase() : "";
        const text = isCmd ? body.slice(prefix.length + command.length).trim() : body.trim();

        try {
            if (isCmd) {
                // 1. MENU COMMAND
                if (command === 'menu' || command === 'help') {
                    const menu = `┏━━━━━━━━━━━━━━━━━━━━━━━━┓\n┃  ✨ *${botName}* ✨  ┃\n┗━━━━━━━━━━━━━━━━━━━━━━━━┛\n\n` +
                                 `👤 *User:* ${pushName}\n\n` +
                                 `*📥 DOWNLOADS*\n.song [name]\n\n` +
                                 `*📊 INFO*\n.alive\n\n` +
                                 `> *AI එක සමඟ කතා කිරීමට ඕනෑම දෙයක් Type කරන්න.*`;
                    return await sock.sendMessage(from, { text: menu }, { quoted: msg });
                }

                // 2. SONG DOWNLOAD COMMAND (Multi-API Fix)
                if (command === 'song') {
                    if (!text) return sock.sendMessage(from, { text: "❌ කරුණාකර සිංදුවේ නම ඇතුළත් කරන්න." });
                    await sock.sendMessage(from, { text: "🎧 *Searching and Downloading...*" });

                    const search = await yts(text);
                    const video = search.videos[0];
                    if (!video) return sock.sendMessage(from, { text: "❌ සොයාගත නොහැකි විය." });

                    let success = false;
                    const apis = [
                        `https://api.giftedtech.my.id/api/download/dlmp3?url=${encodeURIComponent(video.url)}&apikey=gifted`,
                        `https://api.dhammika-v2.me/api/ytmp3?url=${encodeURIComponent(video.url)}`,
                        `https://api.vinu-roman.online/api/ytmp3?url=${encodeURIComponent(video.url)}`
                    ];

                    for (let url of apis) {
                        try {
                            const res = await axios.get(url);
                            const downloadUrl = res.data.result?.download_url || res.data.result?.url || res.data.url;

                            if (downloadUrl) {
                                await sock.sendMessage(from, { 
                                    audio: { url: downloadUrl }, 
                                    mimetype: 'audio/mp4',
                                    fileName: `${video.title}.mp3`
                                }, { quoted: msg });
                                success = true;
                                break; 
                            }
                        } catch (e) { continue; }
                    }

                    if (!success) await sock.sendMessage(from, { text: "❌ සියලුම සර්වර් කාර්යබහුලයි. පසුව උත්සාහ කරන්න." });
                    return;
                }

                if (command === 'alive') {
                    return await sock.sendMessage(from, { text: "I am Alive & Stable! 🚀" });
                }

            } else if (body && !isCmd) {
                // 3. SMART AI (No Prefix)
                try {
                    const aiRes = await axios.get(`https://itzpire.com/ai/blackbox-ai?q=${encodeURIComponent(body)}`);
                    await sock.sendMessage(from, { text: aiRes.data.data }, { quoted: msg });
                } catch (err) { console.log("AI Error"); }
            }
        } catch (e) { console.error("Critical Error:", e); }
    });
}

startBot();
