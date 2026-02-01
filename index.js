const { 
    default: makeWASocket, 
    useMultiFileAuthState, 
    downloadContentFromMessage,
    fetchLatestBaileysVersion 
} = require('@whiskeysockets/baileys');
const { Sticker, StickerTypes } = require('wa-sticker-formatter');
const pino = require('pino');
const fs = require('fs-extra');
const ytdl = require('ytdl-core');
const yts = require('yt-search');
const axios = require('axios');
const translate = require('translate-google-api');

// ⚙️ SETTINGS
const ownerNumber = "94762498519@s.whatsapp.net"; // ⚠️ ඔබේ අංකය මෙහි දාන්න
const botName = "VINU ROMAN MESSAGER";
const aliveImg = "https://i.ibb.co/vzP4S8S/vinu-roman-bot.jpg";
const menuImg = "https://i.ibb.co/L5hY5M5/vinu-menu-img.jpg";
let mode = "public"; 

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info');
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
        version,
        auth: state,
        logger: pino({ level: 'silent' }),
        browser: [botName, "Chrome", "20.0.04"]
    });

    if (!sock.authState.creds.registered) {
        const phoneNumber = "94762498519"; // ඔබේ අංකය මෙතනට
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
        const pushName = msg.pushName || 'User';
        const type = Object.keys(msg.message)[0];
        const isGroup = from.endsWith('@g.us');
        const sender = isGroup ? msg.key.participant : msg.key.remoteJid;
        const isOwner = sender === ownerNumber;

        const body = (type === 'conversation') ? msg.message.conversation : 
                     (type === 'extendedTextMessage') ? msg.message.extendedTextMessage.text : 
                     (type === 'imageMessage') ? msg.message.imageMessage.caption : '';

        const prefix = ".";
        if (!body.startsWith(prefix)) return;
        const args = body.slice(prefix.length).trim().split(/\s+/);
        const command = args.shift().toLowerCase();
        const text = args.join(" ");

        // 🛡️ MODE PROTECTION
        if (mode === "private" && !isOwner) return;

        // --- COMMANDS ---
        switch (command) {
            case 'menu':
            case 'help':
                let menuText = `┏━━━━━━━━━━━━━━━━━━━━━━━━┓
┃  ✨ *${botName}* ✨  ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━┛
👤 *Hi ${pushName}* | 🔒 *Mode:* ${mode}

*📥 DOWNLOADS*
┃ ➥ *.song* (Music) 🎵
┃ ➥ *.video* (YT Video) 🎥
┃ ➥ *.fb* (Facebook) 📱
┃ ➥ *.tiktok* (TikTok) 📱
┃ ➥ *.film* (Movies) 🎬

*🛠️ UTILITY*
┃ ➥ *.ai* (ChatGPT) 🤖
┃ ➥ *.trt* (Translate) 🔠
┃ ➥ *.weather* (Weather) ☁️
┃ ➥ *.google* (Search) 🔍
┃ ➥ *.img* (Google Img) 🖼️

*👥 GROUP & ADMIN*
┃ ➥ *.hidetag* (Tag All) 📢
┃ ➥ *.kick* (Remove) 🚫
┃ ➥ *.group* [open/close]
┃ ➥ *.public* / *.private*

*📊 INFO*
┃ ➥ *.alive* | *.runtime* | *.owner*
┗━━━━━━━━━━━━━━━━━━━━━━━━┛`;
                await sock.sendMessage(from, { 
                    image: { url: menuImg }, 
                    caption: menuText,
                    contextInfo: { externalAdReply: { title: botName, body: "Professional Messenger", thumbnailUrl: menuImg, mediaType: 1, renderLargerThumbnail: true } }
                }, { quoted: msg });
                break;

            case 'alive':
                await sock.sendMessage(from, { 
                    image: { url: aliveImg }, 
                    caption: `*${botName} IS ONLINE!* ✅\n\n🚀 *Speed:* Fast\n📂 *Mode:* ${mode}\n👑 *Owner:* VINU ROMAN`,
                    contextInfo: { externalAdReply: { title: "ALIVE STATUS", body: "System Working Smoothly", thumbnailUrl: aliveImg, mediaType: 1, renderLargerThumbnail: true } }
                }, { quoted: msg });
                break;

            case 'song':
                if (!text) return sock.sendMessage(from, { text: '❌ සිංදුවේ නම දෙන්න!' });
                const search = await yts(text);
                const vid = search.videos[0];
                await sock.sendMessage(from, { text: `🎧 *Searching:* ${vid.title}` });
                const stream = ytdl(vid.url, { filter: 'audioonly' });
                stream.pipe(fs.createWriteStream('./temp.mp3')).on('finish', async () => {
                    await sock.sendMessage(from, { audio: fs.readFileSync('./temp.mp3'), mimetype: 'audio/mp4' }, { quoted: msg });
                    fs.unlinkSync('./temp.mp3');
                });
                break;

            case 'sticker':
                const isImg = type === 'imageMessage' || msg.message.extendedTextMessage?.contextInfo?.quotedMessage?.imageMessage;
                if (!isImg) return sock.sendMessage(from, { text: '❌ පින්තූරයකට reply කරන්න!' });
                const img = isImg ? (msg.message.imageMessage || msg.message.extendedTextMessage.contextInfo.quotedMessage.imageMessage) : null;
                const bufferImg = await downloadContentFromMessage(img, 'image');
                let buffer = Buffer.from([]);
                for await (const chunk of bufferImg) buffer = Buffer.concat([buffer, chunk]);
                const st = new Sticker(buffer, { pack: botName, author: pushName, type: StickerTypes.FULL });
                await sock.sendMessage(from, { sticker: await st.toBuffer() });
                break;

            case 'trt':
                if (!text) return sock.sendMessage(from, { text: '❌ පරිවර්තනය කළ යුතු කොටස දෙන්න.' });
                const translated = await translate(text, { to: 'si' });
                await sock.sendMessage(from, { text: `🎯 *Translated (SI):*\n\n${translated}` });
                break;

            case 'runtime':
                const runtime = process.uptime();
                const hrs = Math.floor(runtime / 3600);
                const mins = Math.floor((runtime % 3600) / 60);
                await sock.sendMessage(from, { text: `🚀 *Bot Runtime:* ${hrs}h ${mins}m` });
                break;

            case 'private':
                if (!isOwner) return;
                mode = "private";
                await sock.sendMessage(from, { text: "🔒 Mode: *PRIVATE*" });
                break;

            case 'public':
                if (!isOwner) return;
                mode = "public";
                await sock.sendMessage(from, { text: "🔓 Mode: *PUBLIC*" });
                break;
                
            case 'hidetag':
                if (!isGroup || !isOwner) return;
                const groupMeta = await sock.groupMetadata(from);
                sock.sendMessage(from, { text: text || 'Attention!', mentions: groupMeta.participants.map(v => v.id) });
                break;
        }
    });

    sock.ev.on('connection.update', (u) => { if (u.connection === 'open') console.log(`✅ ${botName} Connected!`); });
}
startBot();
