const { SlashCommandBuilder } = require("discord.js");
const fs = require("fs");
const config = require("../../config.json");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("set-global-adhan-role")
    .setDescription("تعيين رول تنبيه أذان مكة")
    .addRoleOption(opt =>
      opt.setName("role")
        .setDescription("الرول الذي سيتم منشنه")
        .setRequired(true)
    ),

  async execute(interaction) {
    if (!hasPermission(interaction)) {
      return interaction.reply({ content: "هذا الأمر للمالك أو الأدمن فقط.", flags: 64 });
    }

    const role = interaction.options.getRole("role");

    config.globalAdhanRoleId = role.id;
    fs.writeFileSync("./config.json", JSON.stringify(config, null, 2));

    return interaction.reply({
      content: `🕋 تم تعيين رول تنبيه أذان مكة: <@&${role.id}>`,
      flags: 64
    });
  }
};
