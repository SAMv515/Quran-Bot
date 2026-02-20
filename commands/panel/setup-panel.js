const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("setup-panel")
    .setDescription("إنشاء لوحة التحكم الرئيسية للبوت"),

  async execute(interaction) {
    if (!hasPermission(interaction)) {
      return interaction.reply({ content: "هذا الأمر للمالك أو الأدمن فقط.", flags: 64 });
    }

    const embed = new EmbedBuilder()
      .setTitle("ختمة القرآن الكريم 🕋")
      .setDescription(
        "بوت مخصص لختمة القرآن في رمضان.🌙\n" +
        "سيتم إرسال صفحات بعد كل أذان بتوقيت مكة.🕋\n\n" +
        "• زر **تفعيل ختمة القرآن** للاشتراك.✅\n" +
        "• زر **تنبيهات الأذان** لإنشاء روم خاص بك لتذكيرك بالأذان. 🕌"
      )
      .setColor(0x55A2FA);

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("activate_quran")
        .setLabel("تفعيل ختمة القرآن 📖")
        .setStyle(ButtonStyle.Secondary),

      new ButtonBuilder()
        .setCustomId("activate_personal_adhan")
        .setLabel("تنبيهات الأذان الشخصية 🕌")
        .setStyle(ButtonStyle.Secondary),

      new ButtonBuilder()
        .setCustomId("activate_global_adhan")
        .setLabel("تنبيه أذان مكة المكرمة 🕋")
        .setStyle(ButtonStyle.Secondary)
    );

    return interaction.reply({ embeds: [embed], components: [row] });
  }
};
