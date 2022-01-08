const client = global.client;
const { Collection } = require("discord.js");
const inviterSchema = require("../schemas/inviter");
const inviteMemberSchema = require("../schemas/inviteMember");
const conf = require("../configs/config.json");

/**
 * @param {GuildMember} member
 * @returns {Promise<void>}
 */
module.exports = async (member) => {
  if (member.user.bot) return;

  const gi = client.invites.get(member.guild.id).clone() || new Collection().clone();
  const invites = await member.guild.fetchInvites();
  const invite = invites.find((x) => gi.has(x.code) && gi.get(x.code).uses < x.uses) || gi.find((x) => !invites.has(x.code)) || member.guild.vanityURLCode;
  client.invites.set(member.guild.id, invites);

  const channel = member.guild.channels.cache.get(conf.invLogChannel);
  if (invite === member.guild.vanityURLCode && channel) channel.send(`${member} katıldı! **Davet eden:** Sunucu Özel URL`);
  if (!invite.inviter) return;
  await inviteMemberSchema.findOneAndUpdate({ guildID: member.guild.id, userID: member.user.id }, { $set: { inviter: invite.inviter.id, date: Date.now() } }, { upsert: true });
  if (Date.now() - member.user.createdTimestamp <= 1000 * 60 * 60 * 24 * 7) await inviterSchema.findOneAndUpdate({ guildID: member.guild.id, userID: invite.inviter.id }, { $inc: { total: 1, fake: 1 } }, { upsert: true });
  else await inviterSchema.findOneAndUpdate({ guildID: member.guild.id, userID: invite.inviter.id }, { $inc: { total: 1, regular: 1 } }, { upsert: true })
  const inviterMember = member.guild.members.cache.get(invite.inviter.id);
  if (inviterMember) await inviterMember.updateTask(member.guild.id, "invite", 1);
  const inviterData = await inviterSchema.findOne({ guildID: member.guild.id, userID: invite.inviter.id });
  const total = inviterData ? inviterData.total : 0;
  if (channel) channel.send(`${member} sunucumuza katıldı. ${invite.inviter.tag} tarafından davet edildi. (**${total}** davet)`);
};

module.exports.conf = {
  name: "guildMemberAdd",
};
