const { SlashCommandBuilder } = require("discord.js");
const { getMakkahPrayerTimes, getRamadanDayIfAny, convertToArabic12 } = require("../../utils/adhan");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("test-api")
    .setDescription("اختبار API مواقيت الصلاة"),

  async execute(interaction) {
    await interaction.deferReply({ flags: 64 });

    const times = await getMakkahPrayerTimes();
    const ramadanDay = await getRamadanDayIfAny();

    return interaction.editReply({
      content:
        `🕌 **اختبار API**\n\n` +
        `• الفجر: ${convertToArabic12(times.Fajr)}\n` +
        `• الظهر: ${convertToArabic12(times.Dhuhr)}\n` +
        `• العصر: ${convertToArabic12(times.Asr)}\n` +
        `• المغرب: ${convertToArabic12(times.Maghrib)}\n` +
        `• العشاء: ${convertToArabic12(times.Isha)}\n\n` +
        `🌙 اليوم من رمضان: ${ramadanDay ?? "ليس رمضان"}`
    });
  }
};
