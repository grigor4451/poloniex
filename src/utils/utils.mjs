export const formateDate = (createdAt) => {
  const currentDate = new Date()
  const year = currentDate.getFullYear()
  const month = String(currentDate.getMonth() + 1).padStart(2, '0')
  const day = String(currentDate.getDate()).padStart(2, '0')
  const hours = String(currentDate.getHours()).padStart(2, '0')
  const minutes = String(currentDate.getMinutes()).padStart(2, '0')
  const seconds = String(currentDate.getSeconds()).padStart(2, '0')

  const currentDateTimeString = `${day}-${month}-${year} | ${hours}:${minutes}:${seconds} - UTC+3`

  const createdAtDateString = new Date(createdAt)
  createdAtDateString.setDate(createdAtDateString.getDate())
  const createdAtYear = createdAtDateString.getFullYear()
  const createdAtMonth = String(createdAtDateString.getMonth() + 1).padStart(
    2,
    '0'
  )
  const createdAtDay = String(createdAtDateString.getDate()).padStart(2, '0')

  const createdAtDateStringString = `${createdAtDay}-${createdAtMonth}-${createdAtYear}`

  return {
    currentDateTimeString,
    createdAtDateStringString,
  }
}

export const generateRandomNumber = (min, max) => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

export const getRandomEmoji = () => {
  const emojis = ['🔴', '🟡', '🟢']; // Array of emojis
  const randomIndex = Math.floor(Math.random() * emojis.length); // Generate a random index
  return emojis[randomIndex]; // Return the emoji at the random index
};

export const generateRandomPercent = () => {
  const percent = (Math.random() * 1.98) - 0.99;
  return percent.toFixed(2) + '%';
};



export const generateCryptoData = () => {
  const coins = ['Bitcoin', 'Ethereum', 'Litecoin', 'Cardano', 'Terra', 'Polkadot', 'Cardano', 'Avalanche', 'Polygon', 'Tron', 'Ripple', 'Uniswap', 'Stacks', 'HederaHashgraph', 'Arbitrum', 'Quant', 'RocketPool', 'MultiversX'];
  const data = coins.map(coin => {
    const percent = generateRandomPercent()

    return ({
      text: `${+percent.slice(0, -1) > 0 ? '⬆️' : '⬇️'} ${coin} ${+percent.slice(0, -1) > 0 ? '+' : ''}${percent}`,
      callback_data: `make-bet-${coin}`,
    })
  })
  return data;
};

export const generateStocksData = () => {
  const stocks = ['Intel', 'Microsoft', 'IBM', 'Amazon', 'Tesla', 'Facebook', 'Alibaba', 'CocaCola', 'Cisco', 'Visa', 'Boeing', 'Verizon', 'Nike', 'Adidas'];
  const data = stocks.map(stock => {
    const percent = generateRandomPercent()
    return ({
      text: `${+percent.slice(0, -1) > 0 ? '⬆️' : '⬇️'} ${stock} ${+percent.slice(0, -1) > 0 ? '+' : ''}${percent}`,
      callback_data: `make-bet-${stock}`,
    })
  })
  return data;
}