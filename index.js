require('dotenv').config();
const { default: makeWASocket, useSingleFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const responderGemini = require('./gemini'); // Função de resposta do Gemini
const fs = require('fs');

// Autenticação do Baileys
const { state, saveState } = useSingleFileAuthState('./auth_info.json');

async function startBot() {
  const sock = makeWASocket({
    auth: state,
    printQRInTerminal: true
  });

  sock.ev.on('creds.update', saveState);

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect } = update;

    if (connection === 'close') {
      const shouldReconnect = (lastDisconnect?.error)?.output?.statusCode !== DisconnectReason.loggedOut;
      console.log('🔌 Desconectado. Reconectar?', shouldReconnect);
      if (shouldReconnect) {
        startBot();
      }
    } else if (connection === 'open') {
      console.log('🤖 Bot conectado com sucesso!');
    }
  });

  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;

    const msg = messages[0];
    const sender = msg.key.remoteJid;
    const text = msg.message?.conversation || msg.message?.extendedTextMessage?.text;

    if (!text || msg.key.fromMe) return;

    const saudacoes = ['oi', 'olá', 'ola', 'menu', 'bom dia', 'boa tarde', 'boa noite', 'lista'];

    if (saudacoes.includes(text.toLowerCase())) {
      await sock.sendMessage(sender, {
        text: '👋 Olá! Escolha uma das opções abaixo:',
        buttons: [
          { buttonId: 'planilhas_masculinas', buttonText: { displayText: '📊 Planilhas masculinas' }, type: 1 },
          { buttonId: 'planilhas_femininas', buttonText: { displayText: '📊 Planilhas femininas' }, type: 1 },
          { buttonId: 'saber_dieta', buttonText: { displayText: '🥗 Saber sobre dieta' }, type: 1 },
          { buttonId: 'saber_treino', buttonText: { displayText: '💪 Saber sobre treino' }, type: 1 }
        ],
        headerType: 1
      });
      return;
    }

    // Trata cliques nos botões
    const body = text.toLowerCase();

    if (body === 'saber_dieta') {
      const resposta = await responderGemini('Me fale sobre uma boa dieta para iniciantes na academia');
      await sock.sendMessage(sender, { text: resposta });
    }

    else if (body === 'saber_treino') {
      const resposta = await responderGemini('Me fale sobre um bom treino para iniciantes na academia');
      await sock.sendMessage(sender, { text: resposta });
    }

    else if (body === 'planilhas_masculinas') {
      await sock.sendMessage(sender, { text: '📥 Baixe aqui a planilha masculina: [link-exemplo.com/masculina]' });
    }

    else if (body === 'planilhas_femininas') {
      await sock.sendMessage(sender, { text: '📥 Baixe aqui a planilha feminina: [link-exemplo.com/feminina]' });
    }
  });
}

startBot();