require('dotenv').config();
const makeWASocket = require('@whiskeysockets/baileys').default;
const { DisconnectReason, useMultiFileAuthState } = require('@whiskeysockets/baileys');
const responderGemini = require('./gemini');
const fs = require('fs');

// Submenu de treino
const esperaSubMenuTreino = {};

const meusLinks = {
  planilha_masculina: 'https://drive.google.com/drive/folders/16SitgzJIcK3QygwaDpfpGLC0xgrHQ7Ug?usp=drive_link',
  planilha_feminina:  'https://drive.google.com/drive/folders/14tGidhDFjSiXZvg4UDdoK9tehlB18I5l?usp=drive_link'
};

// FAQ resumido para respostas diretas sobre curso, treinador, compra e contato
const faq = [
  {
    perguntas: [
      "o que é o curso", "me fale sobre o curso", "do que se trata o curso", "sobre o curso", "para quem é o curso", "conteúdo do curso"
    ],
    resposta: `O Curso de Emagrecimento e Hipertrofia do Toquinho Personal foi desenvolvido para ajudar pessoas de todos os níveis a atingirem seus objetivos com saúde, ciência e segurança. Inclui vídeo-aulas, planilhas de treino, módulos alimentares e suporte exclusivo.`
  },
  {
    perguntas: [
      "quem é toquinho", "quem é o toquinho personal", "quem criou o curso", "quem ministra o curso", "dono do curso"
    ],
    resposta: "Toquinho Personal é Educador Físico, especialista em Emagrecimento e Hipertrofia, com +20 anos de experiência. Ele é responsável pelo conteúdo do curso."
  },
  {
    perguntas: [
      "como comprar o curso", "onde compro o curso", "quero comprar", "quero adquirir o curso", "comprar o curso"
    ],
    resposta: "Para adquirir o curso do Toquinho Personal, acesse: https://hotmart.com/pt-br/marketplace/produtos/plataforma-de-treinos-metodo-toquinho-personal/T98528738U ou me chame no Instagram: https://instagram.com/toquinhopersonal/"
  },
  {
    perguntas: [
      "como falar com toquinho", "como falo com toquinho", "qual o contato", "quero atendimento", "tem whatsapp do toquinho"
    ],
    resposta: `Você pode falar comigo por aqui (75) 99961-2634 ou no Instagram https://instagram.com/toquinhopersonal/`
  }
];

// Função FAQ padrão
function encontraFaq(pergunta) {
  pergunta = pergunta.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  for (const item of faq) {
    for (const q of item.perguntas) {
      if (pergunta.includes(q.toLowerCase())) return item;
    }
  }
  return null;
}

// Lê o arquivo 'base_conhecimento.txt' (se existir)
function getBaseConhecimento() {
  if (fs.existsSync('base_conhecimento.txt')) {
    return fs.readFileSync('base_conhecimento.txt', 'utf-8');
  }
  return '';
}

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState('auth');
  const sock = makeWASocket({
    auth: state,
    printQRInTerminal: true
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect } = update;
    if (connection === 'close') {
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
      console.log('🔌 Desconectado. Reconectar?', shouldReconnect);
      if (shouldReconnect) startBot();
    } else if (connection === 'open') {
      console.log('🤖 Bot conectado com sucesso!');
    }
  });

  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;
    const msg = messages[0];
    const sender = msg.key.remoteJid;
    const pushName = msg.pushName || 'Desconhecido';
    const timestamp = msg.messageTimestamp
      ? new Date(msg.messageTimestamp * 1000).toLocaleString('pt-BR')
      : 'Sem data';
    const text = msg.message?.conversation || msg.message?.extendedTextMessage?.text || '';
    if (!text || msg.key.fromMe) return;
    const body = text.toLowerCase().trim();

    // LOG das mensagens recebidas
    console.log(`
==================== NOVA MENSAGEM ====================
De: ${pushName} (${sender})
Conteúdo: "${text}"
ID: ${msg.key.id}
Horário: ${timestamp}
=======================================================
    `);

    // MENU inicial
    const saudacoes = [
      'oi', 'olá', 'ola', 'menu', 'bom dia', 'boa tarde', 'boa noite', 'lista'
    ];
    if (saudacoes.includes(body)) {
      const menuIntro = `
👋 Olá! Bem-vindo ao Toquinho Personal!
Escolha uma das opções digitando o número:

1️⃣ Planilha Masculina
2️⃣ Planilha Feminina
3️⃣ Saber sobre dieta
4️⃣ Saber sobre treino

☑️ Dica: pode perguntar sobre o curso, treinador ou qualquer dúvida a qualquer momento!
      `.trim();
      await sock.sendMessage(sender, { text: menuIntro });
      return;
    }

    // Menu principal (números)
    if (["1", "2", "3", "4"].includes(body) && !esperaSubMenuTreino[sender]) {
      if (body === "1") {
        await sock.sendMessage(sender, { text: `📊 Sua Planilha Masculina: ${meusLinks.planilha_masculina}` });
        return;
      } else if (body === "2") {
        await sock.sendMessage(sender, { text: `📊 Sua Planilha Feminina: ${meusLinks.planilha_feminina}` });
        return;
      } else if (body === "3") {
        const resposta = await responderGemini('Me fale sobre uma boa dieta para iniciantes na academia');
        await sock.sendMessage(sender, { text: resposta });
        return;
      } else if (body === "4") {
        await sock.sendMessage(sender, { text: 
          `Vamos crescer juntos! O que deseja saber? Escolha uma das opções abaixo:
1. Métodos utilizados nos treinos
2. Melhores exercícios das planilhas para superior
3. Melhores exercícios das planilhas para inferior
4. Ajuda para treinar

Digite apenas o número desejado.`
        });
        esperaSubMenuTreino[sender] = true;
        return;
      }
    }

    // Submenu de treino
    if (esperaSubMenuTreino[sender] && ["1", "2", "3", "4"].includes(body)) {
      let respostaTreino = "";
      if (body === "1") {
        respostaTreino =
`🔥 1. Drop Set
✅ Como funciona: Após uma série até a falha muscular, reduzimos a carga e continuamos sem descansar.
⚡ 2. Rest-Pause
✅ Como funciona: Série até a falha, descansa 10-15s e faz mais reps.
🔄 3. Bi-Set
✅ Como funciona: Dois exercícios mesmo grupo muscular, sem descanso.
💥 4. Super-Set
✅ Como funciona: Dois exercícios de grupos opostos, sem descanso.
🕑 5. Tempo Controlado (TUT)
✅ Como funciona: Controle de ritmo, mais tempo de tensão.
🚀 6. FST-7
✅ Como funciona: 7 séries de um mesmo exercício, pausas de 30~45s.
`;
      } else if (body === "2") {
        respostaTreino =
`🔥 Peito
1. Supino Reto
2. Crucifixo Inclinado

💪 Costas
3. Puxada Alta
4. Remada Curvada

💥 Ombros
5. Desenvolvimento Halteres
6. Elevação Lateral

💪 Braços
7. Rosca Direta
8. Tríceps Testa

⚡ Trapézio
9. Encolhimento Halteres
`;
      } else if (body === "3") {
        respostaTreino =
`🔥 Quadríceps
1. Agachamento Livre
2. Cadeira Extensora

💥 Posterior
3. Terra Romeno
4. Mesa Flexora

🍑 Glúteos
5. Hip Thrust
6. Afundo Halteres

⚡ Panturrilha
7. Gêmeos em Pé
8. Gêmeos Sentado
`;
      } else if (body === "4") {
        respostaTreino =
`1️⃣ Estrutura: Aquecimento, compostos, isolados, alongamento.
2️⃣ Séries: força (4-6), hipertrofia (8-12), resistência (12-20).
3️⃣ Carga e intervalos: desafiante, de 45s a 3min.
4️⃣ Frequência: iniciante (3-4x), intermediário (4-5x), avançado (5-6x).
5️⃣ Dúvidas? Pergunte aqui ou no Insta!`;
      }
      await sock.sendMessage(sender, { text: respostaTreino.trim() });
      delete esperaSubMenuTreino[sender];
      return;
    }

    // FAQ padrão (perguntas recorrentes)
    const respostaFaq = encontraFaq(body);
    if (respostaFaq) {
      await sock.sendMessage(sender, { text: respostaFaq.resposta });
      return;
    }

    // Saber sobre dieta: Gemini
    if (body.includes('dieta')) {
      const resposta = await responderGemini('Me fale sobre uma boa dieta para iniciantes na academia');
      await sock.sendMessage(sender, { text: resposta });
      return;
    }

    // Qualquer outra pergunta: Gemini + TXT base de conhecimento!
    const baseConhecimento = getBaseConhecimento();
    const contexto = `Com base no conteúdo abaixo, responda de forma clara e profissional:\n${baseConhecimento}\n\nPergunta do usuário: ${text}`;
    const resposta = await responderGemini(contexto);
    await sock.sendMessage(sender, { text: resposta });
  });
}

startBot();