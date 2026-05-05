import { Telegraf } from 'telegraf';
const bot = new Telegraf('FAKE_TOKEN');
bot.action(['A', 'B'], (ctx) => {
    console.log(ctx.match);
});
console.log("Syntax is valid");
