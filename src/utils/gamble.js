import bot from './client.js';

const oneArmedBandit = {};

const startingGrid = [
  ['🪙', '🪙', '🪙'],
  ['💵', '💵', '💵'],
  ['🪙', '🪙', '🪙'],
  ['💵', '💵', '💵'],
  ['🪙', '🪙', '🪙'],
  ['💵', '💵', '💵'],
  ['🪙', '🪙', '🪙'],
  ['💰', '💰', '💰'],
];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function calculatePayout(userGridData) {
  const payout = {
    '🪙': 187,
    '💵': 420,
    '💰': 6900,
  };
  let totalPayout = 0;
  const winningRow = userGridData[4];

  if (winningRow[0] === winningRow[1] && winningRow[1] === winningRow[2]) {
    totalPayout += payout[winningRow[0]];
  }
  return totalPayout;
}

function generateMessage(userGridData) {
  let message = '```\nOne Armed Bandit\n';
  for (let i = 3; i <= 5; i++) {
    message += '  ' + userGridData[i].join(' | ') + '  \n';
  }
  message += '```';
  return message;
}

function moveColumn(userGridData, colIndex) {
  const lastSymbol = userGridData[userGridData.length - 1][colIndex];
  for (let i = userGridData.length - 1; i > 0; i--) {
    userGridData[i][colIndex] = userGridData[i - 1][colIndex];
  }
  userGridData[0][colIndex] = lastSymbol;
}

export async function runOneArmedBandit(userId) {
  let counter = 0;
  let randomSpins1 = Math.floor(Math.random() * 10) + 5;

  const user = await bot.users.fetch(userId);

  console.log(`${user.username} zockt mal wieder!`);

  const channel = await user.createDM();

  let userGridData = oneArmedBandit[userId];

  if (!userGridData) {
    userGridData = startingGrid;
  }

  const message = await channel.send({
    content: generateMessage(userGridData),
  });

  while (counter++ < randomSpins1) {
    moveColumn(userGridData, 0);
    moveColumn(userGridData, 1);
    moveColumn(userGridData, 2);
    await message.edit({ content: generateMessage(userGridData) });
    await sleep(500);
  }

  counter = 0;
  let randomSpins2 = Math.floor(Math.random() * 10) + 5;
  while (counter++ < randomSpins2) {
    moveColumn(userGridData, 1);
    moveColumn(userGridData, 2);
    await message.edit({ content: generateMessage(userGridData) });
    await sleep(1000);
  }

  counter = 0;
  let randomSpins3 = Math.floor(Math.random() * 10) + 5;
  while (counter++ < randomSpins3) {
    moveColumn(userGridData, 2);
    await message.edit({ content: generateMessage(userGridData) });
    await sleep(1500);
  }
  return calculatePayout(userGridData);
}
