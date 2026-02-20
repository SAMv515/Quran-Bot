const { SlashCommandBuilder } = require("discord.js");
const { getRamadanDayIfAny } = require("../../utils/adhan");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("ramadan-day")
    .setDescription("معرفة اليوم من رمضان"),

  async execute(interaction) {
    const day = await getRamadanDayIfAny();

    return interaction.reply({
      content: day ? `🌙 اليوم هو **${day} رمضان**` : "اليوم ليس من رمضان.",
      flags: 64
    });
  }
};
