const { 
    default: makeWASocket, 
    useMultiFileAuthState, 
    downloadContentFromMessage,
    fetchLatestBaileysVersion 
} = require('@whiskeysockets/baileys');
const pino = require('pino');
const fs = require('fs-extra');

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info');
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
        version,
        auth: state,
        logger: pino({ level: 'silent' }),
        browser: ["Ubuntu", "Chrome", "20.0.04"]
    });

    // --- PAIRING CODE GENERATOR ---
    if (!sock.authState.creds.registered) {
        const phoneNumber = "94762498519"; // ⚠️ ඔබේ අංකය 94 සමග මෙහි දාන්න
        setTimeout(async () => {
            let code = await sock.requestPairingCode(phoneNumber);
            console.log(`\n\n==== PAIRING CODE: ${code} ====\n\n`);
        }, 5000);
    }

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('messages.upsert', async ({ messages }) => {
        const msg = messages[0];
        if (!msg.message || msg.key.fromMe) return;

        const from = msg.key.remoteJid;
        const type = Object.keys(msg.message)[0];
        const body = (type === 'conversation') ? msg.message.conversation : 
                     (type === 'extendedTextMessage') ? msg.message.extendedTextMessage.text : 
                     (type === 'imageMessage') ? msg.message.imageMessage.caption : '';

        const prefix = ".";
        if (!body.startsWith(prefix)) return;
        const command = body.slice(prefix.length).trim().split(/\s+/)[0].toLowerCase();

        // Commands
        if (command === 'alive') {
            await sock.sendMessage(from, { text: 'Bot is running on GitHub Actions! ✅' });
        }

        if (command === 'sticker') {
            const isImage = type === 'imageMessage';
            const isQuotedImage = type === 'extendedTextMessage' && msg.message.extendedTextMessage.contextInfo.quotedMessage?.imageMessage;

            if (isImage || isQuotedImage) {
                const img = isImage ? msg.message.imageMessage : msg.message.extendedTextMessage.contextInfo.quotedMessage.imageMessage;
                const stream = await downloadContentFromMessage(img, 'image');
                let buffer = Buffer.from([]);
                for await (const chunk of stream) { buffer = Buffer.concat([buffer, chunk]); }
                await sock.sendMessage(from, { sticker: buffer });
            }
        }
    });

    sock.ev.on('connection.update', (update) => {
        if (update.connection === 'open') console.log("Connected Success!");
        if (update.connection === 'close') startBot();
    });
}

startBot();
