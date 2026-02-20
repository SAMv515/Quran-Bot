const { SlashCommandBuilder } = require("discord.js");
const { getMakkahPrayerTimes, getArabicPrayerName } = require("../../utils/adhan");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("what-prayer-now")
    .setDescription("معرفة هل نحن الآن في وقت صلاة"),

  async execute(interaction) {
    const times = await getMakkahPrayerTimes();

    const now = new Date();
    const h = now.getHours().toString().padStart(2, "0");
    const m = now.getMinutes().toString().padStart(2, "0");
    const current = `${h}:${m}`;

    const match = Object.entries(times).find(([_, t]) => t === current);

    if (!match) {
      return interaction.reply({
        content: `الآن الساعة **${current}**\nولا يوجد صلاة في هذا الوقت.`,
        flags: 64
      });
    }

    const [prayerKey] = match;

    return interaction.reply({
      content: `🕌 نحن الآن في وقت **${getArabicPrayerName(prayerKey)}**`,
      flags: 64
    });
  }
};
