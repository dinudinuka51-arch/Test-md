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
        browser: ["Ubuntu", "Chrome", "20.0.04"],
        connectTimeoutMs: 60000,
        defaultQueryTimeoutMs: 0,
        keepAliveIntervalMs: 10000
    });

    if (!sock.authState.creds.registered) {
        setTimeout(async () => {
            try {
                let code = await sock.requestPairingCode(pairingNumber);
                code = code?.match(/.{1,4}/g)?.join("-") || code;
                console.log(`\n\n==== 🔑 YOUR PAIRING CODE: ${code} ====\n\n`);
            } catch (err) { }
        }, 8000);
    }

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'open') console.log("✅ VINU ROMAN STABLE CONNECTED!");
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

        // 🛡️ ANTI-CRASH WRAPPER
        try {
            if (isCmd) {
                if (command === 'menu') {
                    return await sock.sendMessage(from, { text: `✨ *${botName} MENU*\n\n.song [name]\n.alive\n\nඕනෑම දෙයක් අසන්න (AI).` });
                }

                if (command === 'song') {
                    if (!text) return sock.sendMessage(from, { text: "❌ කරුණාකර නමක් දෙන්න." });
                    await sock.sendMessage(from, { text: "🎧 *Searching and Downloading...*" });

                    const search = await yts(text);
                    const video = search.videos[0];
                    if (!video) return sock.sendMessage(from, { text: "❌ සොයාගත නොහැකි විය." });

                    // 100% STABLE DOWNLOAD API (NO CRASH)
                    const apiUrl = `https://api.giftedtech.my.id/api/download/dlmp3?url=${encodeURIComponent(video.url)}&apikey=gifted`;
                    const res = await axios.get(apiUrl);

                    if (res.data.success) {
                        await sock.sendMessage(from, { 
                            audio: { url: res.data.result.download_url }, 
                            mimetype: 'audio/mp4',
                            fileName: `${video.title}.mp3`
                        }, { quoted: msg });
                    } else {
                        throw new Error("API Download Failed");
                    }
                    return;
                }

                if (command === 'alive') {
                    return await sock.sendMessage(from, { text: "Online & Stable! 🚀" });
                }

            } else if (body && !isCmd) {
                // SMART AI (BLACKBOX)
                try {
                    const aiRes = await axios.get(`https://itzpire.com/ai/blackbox-ai?q=${encodeURIComponent(body)}`);
                    await sock.sendMessage(from, { text: aiRes.data.data }, { quoted: msg });
                } catch (err) {
                    console.log("AI Error");
                }
            }
        } catch (e) {
            console.error("Stable Error Handler:", e);
            // බොට් මැරෙන්නේ නැතිව User ට මැසේජ් එකක් යවයි
            await sock.sendMessage(from, { text: "⚠️ මෙම ගොනුව බාගත කිරීමේදී දෝෂයක් ඇති විය. කරුණාකර වෙනත් නමකින් උත්සාහ කරන්න." });
        }
    });
}
startBot();
