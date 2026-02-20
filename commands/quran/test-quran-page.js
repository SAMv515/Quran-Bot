const { SlashCommandBuilder } = require("discord.js");
const { getPageWithWhiteBackground } = require("../../utils/quran");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("test-quran-page")
    .setDescription("اختبار إرسال صفحة من القرآن")
    .addChannelOption(opt =>
      opt.setName("channel")
        .setDescription("الروم الذي سيتم إرسال الصفحة إليه")
        .setRequired(true)
    )
    .addIntegerOption(opt =>
      opt.setName("page")
        .setDescription("رقم الصفحة")
        .setRequired(true)
    ),

  async execute(interaction) {
    if (!hasPermission(interaction)) {
      return interaction.reply({ content: "هذا الأمر للمالك أو الأدمن فقط.", flags: 64 });
    }

    const channel = interaction.options.getChannel("channel");
    const page = interaction.options.getInteger("page");

    const buffer = await getPageWithWhiteBackground(page);

    await channel.send({
      content: `صفحة رقم ${page}`,
      files: [{ attachment: buffer, name: `page_${page}.png` }]
    });

    return interaction.reply({ content: "تم الإرسال.", flags: 64 });
  }
};
