const { 
    default: makeWASocket, 
    useMultiFileAuthState, 
    fetchLatestBaileysVersion,
    makeCacheableSignalKeyStore,
    DisconnectReason
} = require('@whiskeysockets/baileys');
const pino = require('pino');
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

    // --- PAIRING CODE LOGIC ---
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

    // --- GROUP SETTINGS UPDATE LISTENER (NEW FEATURE) ---
    sock.ev.on('groups.update', async (updates) => {
        for (const update of updates) {
            // announce: false කියන්නේ ගෘප් එක Unmute (All participants) කළා කියන එකයි
            if (update.announce === false) {
                console.log(`🔓 Group Unmuted: ${update.id}`);
                await sock.sendMessage(update.id, { 
                    text: "🔓 *ගෘප් එක දැන් Unmute කර ඇත! ඕනෑම කෙනෙකුට මැසේජ් දැමිය හැකිය.* \n\nPowered by VINU ROMAN AI 🚀" 
                });
            }
            // announce: true කියන්නේ ගෘප් එක Mute කළා කියන එකයි
            if (update.announce === true) {
                console.log(`🔒 Group Muted: ${update.id}`);
            }
        }
    });

    sock.ev.on('connection.update', (up) => { 
        if (up.connection === 'open') console.log("✅ VINU ROMAN AI CONNECTED!");
        if (up.connection === 'close') startBot(); 
    });

    sock.ev.on('messages.upsert', async ({ messages }) => {
        const msg = messages[0];
        if (!msg.message || msg.key.fromMe) return;

        const from = msg.key.remoteJid;
        const body = msg.message.conversation || msg.message.extendedTextMessage?.text || "";
        const prefix = ".";
        const isCmd = body.startsWith(prefix);
        const command = isCmd ? body.slice(prefix.length).trim().split(/\s+/).shift().toLowerCase() : "";
        const text = isCmd ? body.slice(prefix.length + command.length).trim() : body.trim();

        try {
            if (isCmd) {
                switch (command) {
                    case 'menu':
                        await sock.sendMessage(from, { text: `✨ *${botName} MENU*\n\n.song [name]\n.video [name]\n.fb [link]\n.tt [link]\n.ig [link]\n\n🤖 AI: තිත නැතිව අසන්න.` }, { quoted: msg });
                        break;
                    case 'song':
                        const s = await yts(text);
                        const resS = await axios.get(`https://api.dhammika-v2.me/api/ytmp3?url=${s.videos[0].url}`);
                        await sock.sendMessage(from, { audio: { url: resS.data.result.url }, mimetype: 'audio/mp4' }, { quoted: msg });
                        break;
                }
            } else if (body.trim().length > 1) {
                // AI Response
                try {
                    const aiRes = await axios.get(`https://itzpire.com/ai/blackbox-ai?q=${encodeURIComponent(body)}`);
                    await sock.sendMessage(from, { text: aiRes.data.data }, { quoted: msg });
                } catch (e) { }
            }
        } catch (e) { console.log("Error"); }
    });
}
startBot();
