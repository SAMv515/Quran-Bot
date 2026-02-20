const { PermissionsBitField } = require("discord.js");

function isGuildOwner(interaction) {
  return interaction.guild.ownerId === interaction.user.id;
}

function isAdmin(interaction) {
  return interaction.member.permissions.any([
    PermissionsBitField.Flags.Administrator,
    PermissionsBitField.Flags.ManageGuild,
    PermissionsBitField.Flags.ManageChannels,
    PermissionsBitField.Flags.ManageRoles
  ]);
}

function hasPermission(interaction) {
  return isGuildOwner(interaction) || isAdmin(interaction);
}

module.exports = { isGuildOwner, isAdmin, hasPermission };
