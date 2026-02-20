const { SlashCommandBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("current-page")
    .setDescription("عرض الصفحة الحالية للختمة"),

  async execute(interaction) {
    const settings = guildSettings.get(interaction.guild.id);

    if (!settings) {
      return interaction.reply({ content: "لم يتم تعيين روم الختمة.", flags: 64 });
    }

    return interaction.reply({
      content: `📖 الصفحة الحالية في الختمة: **${settings.currentPage}**`,
      flags: 64
    });
  }
};
