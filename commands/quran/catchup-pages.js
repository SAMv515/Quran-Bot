const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { getRamadanDayIfAny, getPageWithWhiteBackground } = require("../../utils/quran");
const config = require("../../config.json");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("catchup-pages")
    .setDescription("تعويض صفحات الختمة الناقصة"),

  async execute(interaction) {
    if (!hasPermission(interaction)) {
      return interaction.reply({ content: "هذا الأمر للمالك أو الأدمن فقط.", flags: 64 });
    }

    await interaction.deferReply({ flags: 64 });

    const settings = guildSettings.get(interaction.guild.id);
    if (!settings) {
      return interaction.editReply("لم يتم تعيين روم الختمة.");
    }

    const channel = interaction.guild.channels.cache.get(settings.quranChannelId);
    if (!channel) {
      return interaction.editReply("الروم غير موجود.");
    }

    const ramadanDay = await getRamadanDayIfAny();
    if (!ramadanDay) {
      return interaction.editReply("اليوم ليس من رمضان.");
    }

    const requiredPages = ramadanDay * 20;
    const sentPages = settings.currentPage - 1;
    let pagesToSend = requiredPages - sentPages;

    if (pagesToSend <= 0) {
      return interaction.editReply("لا يوجد صفحات ناقصة للتعويض.");
    }

    const pages = [];
    for (let i = 0; i < pagesToSend; i++) {
      pages.push(settings.currentPage + i);
    }

    for (const p of pages) {
      const buffer = await getPageWithWhiteBackground(p);
      if (!buffer) continue;

      await channel.send({
        content: `📖 صفحة رقم **${p}**`,
        files: [{ attachment: buffer, name: `page_${p}.png` }]
      });
    }

    const role = interaction.guild.roles.cache.get(config.quranRoleId);

    const embed = new EmbedBuilder()
      .setTitle("📖 تعويض صفحات الختمة")
      .setDescription(
        `تم إرسال الصفحات التالية:\n\n` +
        pages.map(p => `• الصفحة **${p}**`).join("\n") +
        `\n\nتم التعويض بنجاح 🌙`
      )
      .setColor(0x55A2FA);

    await channel.send({
      content: `${role ? `<@&${role.id}>` : ""} تم تعويض الصفحات.`,
      embeds: [embed]
    });

    settings.currentPage += pagesToSend;

    return interaction.editReply("تم التعويض بنجاح.");
  }
};
