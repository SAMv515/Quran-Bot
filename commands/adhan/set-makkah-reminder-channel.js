const { SlashCommandBuilder } = require("discord.js");
const fs = require("fs");
const config = require("../../config.json");
const { getMakkahPrayerTimes, getNextPrayer, getRemainingTime, buildCountdownEmbed } = require("../../utils/adhan");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("set-makkah-reminder-channel")
    .setDescription("تعيين روم تنبيهات أذان مكة")
    .addChannelOption(opt =>
      opt.setName("channel")
        .setDescription("الروم الذي سيتم إرسال العدّاد فيه")
        .setRequired(true)
    ),

  async execute(interaction) {
    if (!hasPermission(interaction)) {
      return interaction.reply({ content: "هذا الأمر للمالك أو الأدمن فقط.", flags: 64 });
    }

    await interaction.deferReply({ flags: 64 });

    const channel = interaction.options.getChannel("channel");

    config.makkahReminderChannelId = channel.id;
    fs.writeFileSync("./config.json", JSON.stringify(config, null, 2));

    const times = await getMakkahPrayerTimes();
    const now = new Date();
    const h = now.getHours().toString().padStart(2, "0");
    const m = now.getMinutes().toString().padStart(2, "0");
    const current = `${h}:${m}`;

    const nextPrayer = getNextPrayer(times, current);
    const remaining = getRemainingTime(now, times[nextPrayer]);

    await channel.send({
      embeds: [buildCountdownEmbed(nextPrayer, remaining, channel.guild.iconURL())]
    });

    return interaction.editReply({
      content: `🕋 تم تعيين روم تنبيهات أذان مكة: ${channel}`
    });
  }
};
