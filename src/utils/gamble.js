import bot from './client.js';

let oneArmedBandit = [
  ['💀', '💀', '💀'],
  ['🔥', '🔥', '🔥'],
  ['💀', '💀', '💀'],
  ['🔥', '🔥', '🔥'],
  ['💀', '💀', '💀'],
  ['🔥', '🔥', '🔥'],
  ['💀', '💀', '💀'],
  ['👑', '👑', '👑'],
];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function calculatePayout() {
  const payout = {
    '💀': 187,
    '🔥': 420,
    '👑': 6900,
  };
  let totalPayout = 0;
  const winningRow = oneArmedBandit[4];

  if (winningRow[0] === winningRow[1] && winningRow[1] === winningRow[2]) {
    totalPayout += payout[winningRow[0]];
  }
  return totalPayout;
}

function generateMessage() {
  let message = '```\nOne Armed Bandit\n';
  for (let i = 3; i <= 5; i++) {
    message += '  ' + oneArmedBandit[i].join(' | ') + '  \n';
  }
  message += '```';
  return message;
}

function moveColumn(colIndex) {
  const lastSymbol = oneArmedBandit[oneArmedBandit.length - 1][colIndex];
  for (let i = oneArmedBandit.length - 1; i > 0; i--) {
    oneArmedBandit[i][colIndex] = oneArmedBandit[i - 1][colIndex];
  }
  oneArmedBandit[0][colIndex] = lastSymbol;
}

export async function runOneArmedBandit(userId) {
  let counter = 0;
  let randomSpins1 = Math.floor(Math.random() * 5) + 8;

  const user = await bot.users.fetch(userId);

  console.log(`${user.username} zockt mal wieder!`);

  const channel = await user.createDM();

  const message = await channel.send({ content: generateMessage() });

  while (counter++ < randomSpins1) {
    moveColumn(0);
    moveColumn(1);
    moveColumn(2);
    await message.edit({ content: generateMessage() });
    await sleep(500);
  }

  counter = 0;
  let randomSpins2 = Math.floor(Math.random() * 4) + 4;
  while (counter++ < randomSpins2) {
    moveColumn(1);
    moveColumn(2);
    await message.edit({ content: generateMessage() });
    await sleep(1000);
  }

  counter = 0;
  let randomSpins3 = Math.floor(Math.random() * 4) + 4;
  while (counter++ < randomSpins3) {
    moveColumn(2);
    await message.edit({ content: generateMessage() });
    await sleep(1500);
  }
  return calculatePayout();
}
