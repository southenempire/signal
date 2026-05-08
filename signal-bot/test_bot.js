import { Telegraf } from 'telegraf';
const bot = new Telegraf('fake_token');
const pendingReport = new Map();
bot.action(['FUEL','GROCERY','ELECTRICITY','RENT','GENERIC'], async (ctx) => {
  try {
    const category = ctx.callbackQuery.data;
    pendingReport.set(123, category);
    const labels = {
      FUEL: '⛽ Fuel / Gas',
      GROCERY: '🛒 Grocery / Recipes',
      ELECTRICITY: '💡 Electricity',
      RENT: '🏠 Rent / Property',
      GENERIC: '📦 Global Data',
    };
    console.log("Success! Category:", category, "Label:", labels[category]);
  } catch(e) {
    console.error("Action error:", e);
  }
});
bot.handleUpdate({
  update_id: 1,
  callback_query: {
    id: '1',
    from: { id: 123, is_bot: false, first_name: 'Test' },
    message: { message_id: 1, date: 1, chat: { id: 123, type: 'private' } },
    data: 'GENERIC'
  }
});
