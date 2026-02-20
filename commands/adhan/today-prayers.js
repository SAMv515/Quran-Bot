const { SlashCommandBuilder } = require("discord.js");
const { getMakkahPrayerTimes } = require("../../utils/adhan");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("today-prayers")
    .setDescription("عرض أوقات صلاة مكة اليوم"),

  async execute(interaction) {
    await interaction.deferReply({ flags: 64 });

    const times = await getMakkahPrayerTimes();

    return interaction.editReply({
      content:
        `🕌 **أوقات صلاة مكة اليوم:**\n\n` +
        `• الفجر: ${times.Fajr}\n` +
        `• الظهر: ${times.Dhuhr}\n` +
        `• العصر: ${times.Asr}\n` +
        `• المغرب: ${times.Maghrib}\n` +
        `• العشاء: ${times.Isha}`
    });
  }
};
