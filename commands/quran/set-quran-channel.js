const { SlashCommandBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("set-quran-channel")
    .setDescription("تعيين روم الختمة")
    .addChannelOption(opt =>
      opt.setName("channel")
        .setDescription("الروم الذي سيتم إرسال صفحات الختمة فيه")
        .setRequired(true)
    ),

  async execute(interaction) {
    if (!hasPermission(interaction)) {
      return interaction.reply({ content: "هذا الأمر للمالك أو الأدمن فقط.", flags: 64 });
    }

    const channel = interaction.options.getChannel("channel");

    guildSettings.set(interaction.guild.id, {
      quranChannelId: channel.id,
      currentPage: 1
    });

    return interaction.reply({
      content: `تم تعيين روم الختمة: ${channel}`,
      flags: 64
    });
  }
};
