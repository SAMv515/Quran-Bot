//=========================
//1) المتطلبات (require)
//=========================

const {
  Client,
  GatewayIntentBits,
  Partials,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionsBitField,
  ChannelType,
  StringSelectMenuBuilder
} = require("discord.js");


const config = require("./config.json");
const axios = require("axios");
const cron = require("node-cron");
const fs = require("fs");
const path = require("path");
const { createCanvas, loadImage } = require("canvas");
const fetch = require("node-fetch");


// =========================
// قوائم المدن لكل دولة
// =========================

const citiesByCountry = {
  "Saudi Arabia": [
    { label: "مكة", value: "Mecca" },
    { label: "المدينة", value: "Medina" },
    { label: "جدة", value: "Jeddah" },
    { label: "الرياض", value: "Riyadh" },
    { label: "الدمام", value: "Dammam" },
    { label: "الطائف", value: "Taif" },
    { label: "أبها", value: "Abha" },
    { label: "تبوك", value: "Tabuk" }
  ],

  "Egypt": [
    { label: "القاهرة", value: "Cairo" },
    { label: "الإسكندرية", value: "Alexandria" },
    { label: "الجيزة", value: "Giza" },
    { label: "بورسعيد", value: "Port Said" },
    { label: "أسوان", value: "Aswan" }
  ],

  "United Arab Emirates": [
    { label: "دبي", value: "Dubai" },
    { label: "أبوظبي", value: "Abu Dhabi" },
    { label: "الشارقة", value: "Sharjah" },
    { label: "العين", value: "Al Ain" }
  ],

  "Qatar": [
    { label: "الدوحة", value: "Doha" },
    { label: "الوكرة", value: "Al Wakrah" }
  ],

  "Kuwait": [
    { label: "الكويت", value: "Kuwait City" },
    { label: "حولي", value: "Hawalli" }
  ],

  "Bahrain": [
    { label: "المنامة", value: "Manama" },
    { label: "المحرق", value: "Muharraq" }
  ],

  "Oman": [
    { label: "مسقط", value: "Muscat" },
    { label: "صلالة", value: "Salalah" }
  ],

  "Jordan": [
    { label: "عمّان", value: "Amman" },
    { label: "إربد", value: "Irbid" }
  ],

  "Morocco": [
    { label: "الرباط", value: "Rabat" },
    { label: "الدار البيضاء", value: "Casablanca" },
    { label: "مراكش", value: "Marrakesh" }
  ],

  "Algeria": [
    { label: "الجزائر", value: "Algiers" },
    { label: "وهران", value: "Oran" }
  ],

  "Tunisia": [
    { label: "تونس", value: "Tunis" },
    { label: "صفاقس", value: "Sfax" }
  ],

  "Lebanon": [
    { label: "بيروت", value: "Beirut" },
    { label: "طرابلس", value: "Tripoli" }
  ],

  "Iraq": [
    { label: "بغداد", value: "Baghdad" },
    { label: "البصرة", value: "Basra" },
    { label: "الموصل", value: "Mosul" }
  ]
};


//========================
// 2) إعداد العميل (client)
//=========================

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages
  ],
  partials: [Partials.Channel]
});

client.once("ready", () => {
  console.log(`Logged in as ✅ ${client.user.tag}`);

  client.user.setPresence({
    activities: [
      {
        name: "ختمة القرآن الكريم",
        type: 1,
        url: "https://twitch.tv/QuranBot"
      }
    ],
    status: "online"
  });

  scheduleMakkahQuran();
  schedulePersonalAdhan();
});

// =========================
// نظام الصلاحيات
// =========================
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

// =========================
// تخزين بيانات السيرفر
// =========================
const guildSettings = new Map();       // { quranChannelId, currentPage }
const userPrayerSettings = new Map();  // { city, channelId }




///=========================
//5) الأدوات (Utility Functions)
///=========================


// =========================
// دوال إرسال وتعديل آمنة
// =========================

async function safeSend(channel, data) {
  if (!channel) return null;
  try {
    return await channel.send(data);
  } catch (err) {
    console.error("safeSend error:", err.message);
    return null;
  }
}


async function safeEdit(message, data) {
  if (!message) return null;
  try {
    return await message.edit(data);
  } catch (err) {
    console.error("safeEdit error:", err.message);
    return null;
  }
}




//دالة التحقق الذكي

async function isRealCity(city) {
  const url = `https://geodb-free-service.wirefreethought.com/v1/geo/cities?namePrefix=${encodeURIComponent(city)}&limit=1`;

  try {
    const res = await fetch(url);
    const data = await res.json();

    // إذا ما فيه نتائج → المدينة غير موجودة
    if (!data.data || data.data.length === 0) {
      return false;
    }

    return true; // مدينة حقيقية
  } catch (err) {
    console.error("City validation error:", err);
    return false;
  }
}


//5.1 — معالجة صور صفحات القرآن

async function getPageWithWhiteBackground(pageNumber) {
  const filePath = path.join(config.quranPagesFolder, `${pageNumber}.png`);
  if (!fs.existsSync(filePath)) return null;

  const img = await loadImage(filePath);
  const canvas = createCanvas(img.width, img.height);
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0);

  return canvas.toBuffer("image/png");
}



//5.2 — أوقات أذان مكة

async function getMakkahPrayerTimes() {
  try {
    const today = new Date();
    const d = today.getDate();
    const m = today.getMonth() + 1;
    const y = today.getFullYear();

    const url = `https://api.aladhan.com/v1/calendarByCity?city=Mecca&country=Saudi%20Arabia&method=4&month=${m}&year=${y}`;
    const res = await axios.get(url);

    if (!res.data || !res.data.data || !res.data.data[d - 1]) {
      throw new Error("بيانات الأذان غير متوفرة");
    }

    const data = res.data.data[d - 1].timings;

    return {
      Fajr: data.Fajr.slice(0, 5),
      Dhuhr: data.Dhuhr.slice(0, 5),
      Asr: data.Asr.slice(0, 5),
      Maghrib: data.Maghrib.slice(0, 5),
      Isha: data.Isha.slice(0, 5)
    };

  } catch (err) {
    console.error("خطأ في API أذان مكة:", err.message);
    return null;
  }
}



//5.3 — معرفة اليوم من رمضان

async function getRamadanDayIfAny() {
  try {
    const today = new Date();
    const d = today.getDate();
    const m = today.getMonth() + 1;
    const y = today.getFullYear();

    const url = `https://api.aladhan.com/v1/gToH?date=${d}-${m}-${y}`;
    const res = await axios.get(url);

    if (!res.data || !res.data.data) return null;

    const hijri = res.data.data.hijri;

    const hijriMonth = parseInt(hijri.month.number, 10);
    const hijriDay = parseInt(hijri.day, 10);

    if (hijriMonth !== 9) return null;

    return hijriDay;

  } catch (err) {
    console.error("خطأ في حساب رمضان:", err.message);
    return null;
  }
}


//5.4 — أسماء الصلوات بالعربي

function getArabicPrayerName(key) {
  const map = {
    Fajr: "صلاة الفجر",
    Dhuhr: "صلاة الظهر",
    Asr: "صلاة العصر",
    Maghrib: "صلاة المغرب",
    Isha: "صلاة العشاء"
  };
  return map[key] || "إحدى الصلوات";
}

///5.5 — أوقات الصلاة حسب المدينة (للأذان الشخصي)

async function getPrayerTimesByCity(city, country) {
  try {
    if (!city || !country) {
      console.error("getPrayerTimesByCity called without city or country:", { city, country });
      return null;
    }

    const today = new Date();
    const d = today.getDate();
    const m = today.getMonth() + 1;
    const y = today.getFullYear();

    const url = `https://api.aladhan.com/v1/calendarByCity?city=${encodeURIComponent(city)}&country=${encodeURIComponent(country)}&method=4&month=${m}&year=${y}`;
    console.log("URL:", url);

    const res = await axios.get(url);

    if (!res.data || !res.data.data || !res.data.data[d - 1]) {
      console.error("No data for this city/country:", res.data);
      return null;
    }

    const data = res.data.data[d - 1].timings;

    return {
      Fajr: data.Fajr.slice(0, 5),
      Dhuhr: data.Dhuhr.slice(0, 5),
      Asr: data.Asr.slice(0, 5),
      Maghrib: data.Maghrib.slice(0, 5),
      Isha: data.Isha.slice(0, 5)
    };

  } catch (err) {
    console.error(`خطأ في مدينة ${city}:`, err.message);
    return null;
  }
}

///دالة لتحويل الوقت من 24 إلى 12 ساعة بالعربي

function convertToArabic12(time24) {
  let [hour, minute] = time24.split(":").map(Number);

  const period = hour < 12 ? "ص" : "م";

  if (hour === 0) hour = 12;          // 00 → 12 ص
  else if (hour > 12) hour -= 12;     // 13 → 1 م

  return `${hour}:${minute.toString().padStart(2, "0")} ${period}`;
}

// دالة طرح دقائق من وقت الأذان
function subtractMinutes(time, minutes) {
  let [h, m] = time.split(":").map(Number);
  m -= minutes;

  while (m < 0) {
    m += 60;
    h -= 1;
  }

  if (h < 0) h += 24;

  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
}

// دالة معرفة الصلاة القادمة
function getNextPrayer(times, current) {
  const order = ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"];

  for (const prayer of order) {
    if (times[prayer] > current) {
      return prayer;
    }
  }

  // لو كل الصلوات فاتت → الصلاة القادمة فجر اليوم التالي
  return "Fajr";
}

// دالة حساب الوقت المتبقي للصلاة القادمة
function getRemainingTime(now, target) {
  const [th, tm] = target.split(":").map(Number);
  const targetDate = new Date(now);
  targetDate.setHours(th, tm, 0, 0);

  if (targetDate < now) {
    targetDate.setDate(targetDate.getDate() + 1);
  }

  const diff = targetDate - now;

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff / (1000 * 60)) % 60);

  return { hours, minutes };
}

// دالة إنشاء Embed للعدّاد الحي
function buildCountdownEmbed(nextPrayer, remaining, guildIcon) {
  return new EmbedBuilder()
    .setColor(0x1E90FF)
    .setAuthor({
      name: " العدّاد المباشر لتوقيت مكةالمكرمة | للصلاة القادمة 🕋 ",
      iconURL: guildIcon
    })
    .setThumbnail(guildIcon)
    .setImage("https://i.imgur.com/xafQAm4.png") // صورة مكة من مجلدك
    .setDescription(
      `**🕌 الصلاة القادمة: ${getArabicPrayerName(nextPrayer)} **\n\n` +
      `**⏱️المتبقي للأذان القادم :**\n\n` +
      ` ⌛ **عداد الوقت : ** ${remaining.hours} ساعة و ${remaining.minutes} دقيقة\n\n` +
      `** بتوقيت أم القرى –  منطقة مكة المكرمة 🕋 💠**`
    )
    .setFooter({
      text: "Quran Bot | تنبيهات أذان مكة 🕋 ",
      iconURL: guildIcon
    })
    .setTimestamp();
}

// متغير لتخزين رسالة العدّاد الحي
let liveCountdownMessage = null;

// 🟦 هنا تضيف الدالة
function scheduleMakkahQuran() {
  cron.schedule("* * * * *", async () => {
    try {
      // لو ما تم تعيين روم أصلاً
      if (!config.makkahReminderChannelId) return;

      const channel = client.channels.cache.get(config.makkahReminderChannelId);
      if (!channel) {
        // الروم محذوف → امسح الآيدي من config عشان ما يستمر يحاول
        console.warn("Makkah reminder channel not found, clearing from config.");
        delete config.makkahReminderChannelId;
        fs.writeFileSync("./config.json", JSON.stringify(config, null, 2));
        liveCountdownMessage = null;
        return;
      }

      const times = await getMakkahPrayerTimes();
      if (!times) return;

      const now = new Date();
      const h = now.getHours().toString().padStart(2, "0");
      const m = now.getMinutes().toString().padStart(2, "0");
      const current = `${h}:${m}`;

      const nextPrayer = getNextPrayer(times, current);
      const remaining = getRemainingTime(now, times[nextPrayer]);

      // أول مرة: أرسل رسالة جديدة
      if (!liveCountdownMessage) {
        liveCountdownMessage = await safeSend(channel, {
          embeds: [buildCountdownEmbed(nextPrayer, remaining, channel.guild.iconURL())]
        }).catch((err) => {
          console.error("Error sending live countdown:", err.message);
          liveCountdownMessage = null;
        });
        return;
      }

      // تحديث الرسالة القديمة
      await safeEdit(liveCountdownMessage, {
        embeds: [buildCountdownEmbed(nextPrayer, remaining, channel.guild.iconURL())]
      }).catch((err) => {
        console.error("Error editing live countdown:", err.message);
        // لو طلع Unknown Channel أو الرسالة اختفت → نرجع null
        liveCountdownMessage = null;
      });

    } catch (err) {
      console.error("scheduleMakkahQuran loop error:", err);
    }
  });
}



///=========================
///8) جدولة الأذان الشخصي لكل عضو
///=========================

function schedulePersonalAdhan() {
  cron.schedule("* * * * *", async () => {
    try {
      for (const [userId, settings] of userPrayerSettings.entries()) {
        if (!settings || !settings.channelId) {
          userPrayerSettings.delete(userId);
          continue;
        }

const channel = client.channels.cache.get(settings.channelId);

if (!channel) {
  userPrayerSettings.delete(userId);
  continue;
}

  

        const times = await getPrayerTimesByCity(settings.city, settings.country);
        if (!times) continue;

        const now = new Date();
        const h = now.getHours().toString().padStart(2, "0");
        const m = now.getMinutes().toString().padStart(2, "0");
        const current = `${h}:${m}`;

        const match = Object.entries(times).find(([_, t]) => t === current);
        if (match) {
          const [prayer] = match;

          await safeSend(channel, {
            content: `🕌 حان الآن وقت **${getArabicPrayerName(prayer)}**`
          });
        }
      }
    } catch (err) {
      console.error("schedulePersonalAdhan loop error:", err);
    }
  });
}




////=========================
//6) Event واحد للأوامر والأزرار
///=========================


client.on("interactionCreate", async (interaction) => {

  // =========================
  // أوامر السلاش
  // =========================
  if (interaction.isChatInputCommand()) {

    //🟦 أولًا: كيف تختبر أن الـ API شغال؟

if (interaction.commandName === "test-api") {
  await interaction.deferReply({ flags: 64 }); // 

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


//🟩 ثانيًا: كيف تعرف هل نحن الآن في وقت صلاة؟

if (interaction.commandName === "what-prayer-now") {
  const times = await getMakkahPrayerTimes();

  const now = new Date();
  const h = now.getHours().toString().padStart(2, "0");
  const m = now.getMinutes().toString().padStart(2, "0");
  const current = `${h}:${m}`;

  const match = Object.entries(times).find(([_, t]) => t === current);

  if (!match) {
    return interaction.reply({
      content: `الآن الساعة **${current}**\nولا يوجد صلاة في هذا الوقت.`,
      flags: 64
    });
  }

  const [prayerKey] = match;

  return interaction.reply({
    content: `🕌 نحن الآن في وقت **${getArabicPrayerName(prayerKey)}**`,
    flags: 64
  });
}


//🟨 ثالثًا: كيف تعرف اليوم من رمضان؟

if (interaction.commandName === "ramadan-day") {
  const day = await getRamadanDayIfAny();

  return interaction.reply({
    content: day ? `🌙 اليوم هو **${day} رمضان**` : "اليوم ليس من رمضان.",
    flags: 64
  });
}


//🟧 رابعًا: كيف تعرف أوقات الصلاة اليوم؟

if (interaction.commandName === "today-prayers") {
  await interaction.deferReply({ flags: 64 });

  const times = await getMakkahPrayerTimes();

  return interaction.editReply({
    content:
      `🕌 **أوقات صلاة مكة اليوم:**\n\n` +
      `• الفجر: ${times.Fajr}\n` +
      `• الظهر: ${times.Dhuhr}\n` +
      `• العصر: ${times.Asr}\n` +
      `• المغرب: ${times.Maghrib}\n` +
      `• العشاء: ${times.Isha}`
  });
}



//🟦 خامسًا: كيف تعرف الصفحة الحالية في الختمة؟

if (interaction.commandName === "current-page") {
  const settings = guildSettings.get(interaction.guild.id);

  if (!settings) {
    return interaction.reply({ content: "لم يتم تعيين روم الختمة.", flags: 64 });
  }

  return interaction.reply({
    content: `📖 الصفحة الحالية في الختمة: **${settings.currentPage}**`,
    flags: 64
  });
}


//=======================
// /set-makkah-reminder-channel
//=======================


if (interaction.commandName === "set-makkah-reminder-channel") {
  if (!hasPermission(interaction)) {
    return interaction.reply({ content: "هذا الأمر للمالك أو الأدمن فقط.", flags: 64 });
  }

  await interaction.deferReply({ flags: 64 });

  const channel = interaction.options.getChannel("channel");

  config.makkahReminderChannelId = channel.id;
  fs.writeFileSync("./config.json", JSON.stringify(config, null, 2));

  // جلب مواقيت مكة
  const times = await getMakkahPrayerTimes();
  const now = new Date();
  const h = now.getHours().toString().padStart(2, "0");
  const m = now.getMinutes().toString().padStart(2, "0");
  const current = `${h}:${m}`;

  // تحديد الصلاة القادمة
  const nextPrayer = getNextPrayer(times, current);
  const remaining = getRemainingTime(now, times[nextPrayer]);

  // إرسال أول Embed للعدّاد الحي
  liveCountdownMessage = await channel.send({
    embeds: [buildCountdownEmbed(nextPrayer, remaining)]
  });

  return interaction.editReply({
    content: `🕋 تم تعيين روم تنبيهات أذان مكة: ${channel}`
  });
}





//=======================
// /set-global-adhan-role
//=======================

if (interaction.commandName === "set-global-adhan-role") {
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


    // -------------------------
    // /setup-panel
    // -------------------------
    if (interaction.commandName === "setup-panel") {
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

    // -------------------------
    // /set-quran-role
    // -------------------------
    if (interaction.commandName === "set-quran-role") {
      if (!hasPermission(interaction)) {
        return interaction.reply({ content: "هذا الأمر للمالك أو الأدمن فقط.", flags: 64 });
      }

      const role = interaction.options.getRole("role");
      config.quranRoleId = role.id;
      fs.writeFileSync("./config.json", JSON.stringify(config, null, 2));

      return interaction.reply({
        content: `تم تعيين رول الختمة: <@&${role.id}>`,
        flags: 64
      });
    }

    // -------------------------
    // /set-quran-channel
    // -------------------------
    if (interaction.commandName === "set-quran-channel") {
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

    // -------------------------
    // /test-quran-page
    // -------------------------
    if (interaction.commandName === "test-quran-page") {
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

    // -------------------------
    // /catchup-pages
    // -------------------------

// =========================
// /catchup-pages (نسخة مطوّرة)
// =========================

if (interaction.commandName === "catchup-pages") {
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

  // الصفحات المطلوبة حتى اليوم
  const requiredPages = ramadanDay * 20;
  const sentPages = settings.currentPage - 1;
  let pagesToSend = requiredPages - sentPages;

  if (pagesToSend <= 0) {
    return interaction.editReply("لا يوجد صفحات ناقصة للتعويض.");
  }

  // جلب مواقيت مكة لمعرفة الصلاة القادمة
  const times = await getMakkahPrayerTimes();
  const now = new Date();
  const h = now.getHours().toString().padStart(2, "0");
  const m = now.getMinutes().toString().padStart(2, "0");
  const current = `${h}:${m}`;
  const nextPrayer = getNextPrayer(times, current);

  const role = interaction.guild.roles.cache.get(config.quranRoleId);

  // تقسيم الصفحات إلى مجموعات من 4
  const allPages = [];
  for (let i = 0; i < pagesToSend; i++) {
    allPages.push(settings.currentPage + i);
  }

  const groups = [];
  while (allPages.length > 0) {
    groups.push(allPages.splice(0, 4)); // كل 4 صفحات في مجموعة
  }

  // إرسال كل مجموعة
  for (const group of groups) {
    const files = [];

    for (const p of group) {
      const buffer = await getPageWithWhiteBackground(p);
      if (buffer) {
        files.push({
          attachment: buffer,
          name: `page_${p}.png`
        });
      }
    }

    const first = group[0];
    const last = group[group.length - 1];

    const embed = new EmbedBuilder()
      .setColor(0x55A2FA)
      .setTitle("Khatma of the Quran 🕋 |📖 ختمة القرآن الكريم")
      .setDescription(
        `🕌 **حان الآن موعد أذان ${getArabicPrayerName(nextPrayer)}** حسب التوقيت المحلي لمكة المكرمة\n\n` +
        `📖 **تمّ قراءة صفحات (${first} - ${last}) من القرآن الكريم** ضمن ختمة رمضان المبارك.\n\n` +
        `اللهم بلغنا ليلة القدر 🌙`
      )
      .setImage("https://i.imgur.com/ou7luSN.png")
      .setTimestamp();

    await channel.send({
      content: role ? `<@&${role.id}>` : "",
      embeds: [embed],
      files
    });
  }

  // تحديث الصفحة الحالية
  settings.currentPage += pagesToSend;

  return interaction.editReply("تم إرسال التعويضات بنجاح.");
}

  }
  



    // =========================
// القوائم المنسدلة (اختيار الدولة)
// =========================
if (interaction.isStringSelectMenu()) {

  // اختيار الدولة
  if (interaction.customId === "select_country") {
    const country = interaction.values[0];

    userPrayerSettings.set(interaction.user.id, {
      country,
      city: null,
      channelId: null
    });

    // جلب المدن الخاصة بالدولة
    const cities = citiesByCountry[country];

    // حماية: لو الدولة ما لها مدن
    const funnyReplies = [
      "البوت جلس يدور توقيت الصلاة وبالنهاية قال أنا أستقيل… ما لقيت شي",
      "حاولت أجيب لك وقت الصلاة… بس الـ API سوّى نفسه ميت",
      "ما فيه مدن؟ يمكن الدولة تحت الصيانة"
    ];

    if (!cities || cities.length === 0) {
      const randomReply = funnyReplies[Math.floor(Math.random() * funnyReplies.length)];

      await interaction.deferUpdate();
      return interaction.editReply({
        content: randomReply,
        components: [],
        flags: 64
      });
    }

    // إنشاء قائمة المدن
    const cityMenu = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId("select_city")
        .setPlaceholder("اختر مدينتك")
        .addOptions(cities)
    );

    await interaction.deferUpdate();
    return interaction.editReply({
      content: `🌍 الدولة: **${country}**\nاختر مدينتك من القائمة:`,
      components: [cityMenu],
      flags: 64
    });
  }
}



  // اختيار المدينة
  if (interaction.customId === "select_city") {
    await interaction.deferUpdate(); // مهم جدًا لمنع Unknown interaction

    const city = interaction.values[0];
    const userId = interaction.user.id;

    const settings = userPrayerSettings.get(userId);

    userPrayerSettings.set(userId, {
      country: settings.country,
      city,
      channelId: null
    });

    // إنشاء روم خاص
    const privateChannel = await interaction.guild.channels.create({
      name: `تذكير الأذان 🕌 -${city}`,
      type: ChannelType.GuildText,
      permissionOverwrites: [
        { id: interaction.guild.roles.everyone, deny: [PermissionsBitField.Flags.ViewChannel] },
        { id: userId, allow: [PermissionsBitField.Flags.ViewChannel] }
      ]
    });

    userPrayerSettings.set(userId, {
      country: settings.country,
      city,
      channelId: privateChannel.id
    });

// زر حذف التذكير
const deleteButton = new ActionRowBuilder().addComponents(
  new ButtonBuilder()
    .setCustomId("delete_personal_adhan")
    .setLabel(" حذف تذكير الأذان")
    .setStyle(ButtonStyle.Secondary)
);

// إرسال رسالة فيها الزر داخل الروم
await safeSend(privateChannel, {
  content: `🕌 تم إنشاء روم تذكير الأذان لمدينة **${city}**\nيمكنك حذف الروم من هنا:`,
  components: [deleteButton]
});


    // جلب مواقيت الصلاة
    const times = await getPrayerTimesByCity(city, settings.country);

    if (times) {
      await privateChannel.send(
        `🕌 **مواقيت الصلاة اليوم لمدينة ${city}:**\n\n` +
        `• ${getArabicPrayerName("Fajr")}: ${convertToArabic12(times.Fajr)}\n` +
        `• ${getArabicPrayerName("Dhuhr")}: ${convertToArabic12(times.Dhuhr)}\n` +
        `• ${getArabicPrayerName("Asr")}: ${convertToArabic12(times.Asr)}\n` +
        `• ${getArabicPrayerName("Maghrib")}: ${convertToArabic12(times.Maghrib)}\n` +
        `• ${getArabicPrayerName("Isha")}: ${convertToArabic12(times.Isha)}`
      );
    } else {
      await safeSend(privateChannel, "⚠️ تعذر جلب مواقيت الصلاة لهذه المدينة.");
    }

    // تعديل رسالة القائمة
    return interaction.editReply({
      content: `تم إنشاء روم تنبيهات الأذان لمدينة **${city}**`,
      components: []
    });
  }


  // =========================
  // أزرار البوت
  // =========================
  if (interaction.isButton()) {


  // #0
    // -------------------------
    // زر حذف تذكير الاذان داخل الروم
    // -------------------------

if (interaction.customId === "delete_personal_adhan") {
  const userId = interaction.user.id;
  const settings = userPrayerSettings.get(userId);

  if (!settings) {
    return interaction.reply({
      content: "❌ لا يوجد روم تذكير مرتبط بك.",
      flags: 64
    });
  }

  const channel = interaction.guild.channels.cache.get(settings.channelId);

  // احذف الإعدادات
  userPrayerSettings.delete(userId);

  // رد أول (إبفيمرال)
  await interaction.reply({
    content: "🗑️ تم حذف روم تذكير الأذان بنجاح.",
    flags: 64
  });

  // بعد الرد، احذف الروم
  if (channel) {
    await channel.delete().catch(() => {});
  }
}




    // #0
    // -------------------------
    // تفعيل تنبيه أذان مكة
    // -------------------------

    // زر: تفعيل تنبيه أذان مكة
if (interaction.customId === "activate_global_adhan") {

  const roleId = config.globalAdhanRoleId;

  if (!roleId) {
    return interaction.reply({
      content: "❌ لم يتم تعيين رول تنبيه أذان مكة. استخدم أمر: /set-global-adhan-role",
      flags: 64
    });
  }

  const role = interaction.guild.roles.cache.get(roleId);

  if (!role) {
    return interaction.reply({
      content: "❌ الرول الذي تم تعيينه غير موجود في السيرفر.",
      flags: 64
    });
  }

  await interaction.member.roles.add(role);

  return interaction.reply({
    content: `🕋 تم تفعيل تنبيه أذان مكة لك! <@&${role.id}>`,
    flags: 64
  });
}


    


// #1
    // -------------------------
    // زر: تفعيل ختمة القرآن
    // -------------------------
if (interaction.customId === "activate_quran") {
  const role = interaction.guild.roles.cache.get(config.quranRoleId);
  if (!role) {
    return interaction.reply({
      content: "❌ لم يتم تعيين رول الختمة.",
      flags: 64
    });
  }

  await interaction.member.roles.add(role);

  // رسالة خاصة للعضو
  try {
    await interaction.user.send(
      `⬇ ${interaction.user} 🕌\n\n🩵 ` +
      `أرجو منكم الدعاء فقط وتقبل الله منا ومنكم صالح الأعمال`
    );
  } catch (err) {
    console.log("لا يمكن إرسال رسالة خاصة للعضو.");
  }

  return interaction.reply({
    content: `تم تفعيلك في ختمة القرآن <@&${role.id}>`,
    flags: 64
  });
}

//#2 

    // -------------------------
    // زر: تفعيل الأذان الشخصي
    // -------------------------
if (interaction.customId === "activate_personal_adhan") {

  // حماية: منع تكرار الرومات
  const oldSettings = userPrayerSettings.get(interaction.user.id);

  if (oldSettings) {
    const oldChannel = interaction.guild.channels.cache.get(oldSettings.channelId);

    if (oldChannel) {
      return interaction.reply({
        content: `لديك روم تنبيهات موجود مسبقًا: ${oldChannel}\nإذا أردت إنشاء واحد جديد، احذف القديم أولًا.`,
        flags: 64
      });
    } else {
      userPrayerSettings.delete(interaction.user.id);
    }
  }

  // قائمة الدول العربية
const arabCountries = [
  { label: "السعودية", value: "Saudi Arabia" },
  
  { label: "الإمارات", value: "United Arab Emirates" },
  { label: "الكويت", value: "Kuwait" },
  { label: "قطر", value: "Qatar" },
  { label: "البحرين", value: "Bahrain" },
  { label: "عمان", value: "Oman" },
  { label: "اليمن", value: "Yemen" },
  { label: "مصر", value: "Egypt" },
  { label: "الأردن", value: "Jordan" },
  { label: "العراق", value: "Iraq" },
  { label: "سوريا", value: "Syria" },
  { label: "لبنان", value: "Lebanon" },
  { label: "فلسطين", value: "Palestine" },
  { label: "ليبيا", value: "Libya" },
  { label: "تونس", value: "Tunisia" },
  { label: "الجزائر", value: "Algeria" },
  { label: "المغرب", value: "Morocco" },
  { label: "السودان", value: "Sudan" },
  { label: "موريتانيا", value: "Mauritania" }
];

  const countryMenu = new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId("select_country")
      .setPlaceholder("اختر دولتك")
      .addOptions(arabCountries)
  );

  return interaction.reply({
    content: "🌍 **اختر دولتك من القائمة التالية:**",
    components: [countryMenu],
    flags: 64
  });
}

  }
});


///=========================
// 7) جدولة أذان مكة + إرسال صفحات الختمة
///=========================

async function scheduleMakkahQuran() {
  cron.schedule("* * * * *", async () => {

    const times = await getMakkahPrayerTimes();
    if (!times) return;

    const now = new Date();
    const h = now.getHours().toString().padStart(2, "0");
    const m = now.getMinutes().toString().padStart(2, "0");
    const current = `${h}:${m}`;

    const reminderChannel = client.channels.cache.get(config.makkahReminderChannelId);
    const adhanRole = reminderChannel?.guild.roles.cache.get(config.globalAdhanRoleId);

    if (!reminderChannel) return;

    // ============================
    // 🔵 تحديث العدّاد الحي كل دقيقة
    // ============================
    const nextPrayer = getNextPrayer(times, current);
    const remaining = getRemainingTime(now, times[nextPrayer]);

    try {
      if (liveCountdownMessage) {
        await safeEdit(liveCountdownMessage, {
          embeds: [buildCountdownEmbed(nextPrayer, remaining)]
        });
      } else {
        liveCountdownMessage = await reminderChannel.send({
          embeds: [buildCountdownEmbed(nextPrayer, remaining)]
        });
      }
    } catch {
      liveCountdownMessage = await reminderChannel.send({
        embeds: [buildCountdownEmbed(nextPrayer, remaining)]
      });
    }

    // ============================
    // 🔔 أوقات التذكير
    // ============================
    const reminderTimes = {
      "30": {
        Fajr: subtractMinutes(times.Fajr, 30),
        Dhuhr: subtractMinutes(times.Dhuhr, 30),
        Asr: subtractMinutes(times.Asr, 30),
        Maghrib: subtractMinutes(times.Maghrib, 30),
        Isha: subtractMinutes(times.Isha, 30)
      },
      "10": {
        Fajr: subtractMinutes(times.Fajr, 10),
        Dhuhr: subtractMinutes(times.Dhuhr, 10),
        Asr: subtractMinutes(times.Asr, 10),
        Maghrib: subtractMinutes(times.Maghrib, 10),
        Isha: subtractMinutes(times.Isha, 10)
      },
      "5": {
        Fajr: subtractMinutes(times.Fajr, 5),
        Dhuhr: subtractMinutes(times.Dhuhr, 5),
        Asr: subtractMinutes(times.Asr, 5),
        Maghrib: subtractMinutes(times.Maghrib, 5),
        Isha: subtractMinutes(times.Isha, 5)
      }
    };

    // 30 / 10 / 5 دقائق
    for (const min of ["30", "10", "5"]) {
      const match = Object.entries(reminderTimes[min]).find(([_, t]) => t === current);
      if (match) {
        const [prayer] = match;
        reminderChannel.send(
          `${adhanRole} ⏰ تبقى **${min} دقيقة** على أذان **${getArabicPrayerName(prayer)}**`
        );
      }
    }

    // ============================
    // 🕌 عند الأذان
    // ============================
    const nowAdhan = Object.entries(times).find(([_, t]) => t === current);
    if (nowAdhan) {
      const [prayer] = nowAdhan;

      reminderChannel.send(
        `${adhanRole} 🕌
          حان الآن وقت **${getArabicPrayerName(prayer)}** بتوقيت مكة المكرمة`
      );

      // تحديث العدّاد للصلاة التالية
      const nextPrayerAfter = getNextPrayer(times, current);
      const remainingAfter = getRemainingTime(now, times[nextPrayerAfter]);

      try {
        if (liveCountdownMessage) {
          await safeEdit(liveCountdownMessage, {
            embeds: [buildCountdownEmbed(nextPrayerAfter, remainingAfter)]
          });
        } else {
          liveCountdownMessage = await reminderChannel.send({
            embeds: [buildCountdownEmbed(nextPrayerAfter, remainingAfter)]
          });
        }
      } catch {
        liveCountdownMessage = await reminderChannel.send({
          embeds: [buildCountdownEmbed(nextPrayerAfter, remainingAfter)]
        });
      }
    }

    // ============================
    // 📌 رسالة يومية بعد الفجر بدقيقة
    // ============================
    if (current === subtractMinutes(times.Fajr, -1)) {
      reminderChannel.send({ embeds: [makkahTimesEmbed(times)] });
    }
  

    // ============================
    // 📖 نظام إرسال صفحات الختمة
    // ============================

const match = Object.entries(times).find(([_, t]) => t === current);
if (!match) return;

const [prayerKey] = match;
const prayerName = getArabicPrayerName(prayerKey);

const ramadanDay = await getRamadanDayIfAny();

for (const [guildId, settings] of guildSettings.entries()) {
  const guild = client.guilds.cache.get(guildId);
  if (!guild) continue;

  const channel = guild.channels.cache.get(settings.quranChannelId);
  if (!channel) continue;

  const quranRole = guild.roles.cache.get(config.quranRoleId); // ← منشن الختمة

  const pages = [
    settings.currentPage,
    settings.currentPage + 1,
    settings.currentPage + 2,
    settings.currentPage + 3
  ];

  // إرسال الصفحات الأربع
  for (const p of pages) {
    const buffer = await getPageWithWhiteBackground(p);
    if (!buffer) continue;

    await safeSend(channel, {
      content: quranRole ? `<@&${quranRole.id}>` : "", // ← المنشن هنا
      files: [{ attachment: buffer, name: `quran.png` }]
    });
  }

  // الإمبيد الاحترافي
  const prayerEmbed = new EmbedBuilder()
    .setColor(0x55A2FA)
    .setTitle("Khatma of the Quran 🕋 | 📖 ختمة القرآن الكريم")
    .setDescription(
      `🕌 **حان الآن موعد أذان ${prayerName}** حسب التوقيت المحلي لمكة المكرمة\n\n` +
      `📖 **تمّ قراءة صفحات (${pages[0]} - ${pages[3]}) من القرآن الكريم** ضمن ختمة رمضان المبارك.\n\n` +
      `اللهم بلغنا ليلة القدر 🌙`
    )
    .setImage("https://i.imgur.com/ou7luSN.png")
    .setTimestamp();

  await safeSend(channel, {
    content: quranRole ? `<@&${quranRole.id}>` : "", // ← المنشن مع الإمبيد
    embeds: [prayerEmbed]
  });

  // تحديث الصفحة
  settings.currentPage += 4;
  if (settings.currentPage > 604) {
    settings.currentPage = 1;
  }

  // التقدم اليومي
  const pagesSentToday = ((settings.currentPage - 1) % 20);

  if (pagesSentToday === 0 && ramadanDay !== null) {
    const dayEmbed = new EmbedBuilder()
      .setTitle(`📅 تقدم اليوم ${ramadanDay} من الختمة`)
      .setDescription(
        `📖 مجموع الصفحات: 20\n` +
        `🕌 عدد الصلوات المكتملة: 5\n` +
        `🌙 اليوم: ${ramadanDay}`
      )
      .setColor(0x55A2FA)
      .setTimestamp();

    await channel.send({
      content: quranRole ? `<@&${quranRole.id}>` : "",
      embeds: [dayEmbed]
    });
  }
}
 });
}

///=========================
//9) login Token تشغيل البوت
//=========================

client.login(config.token);
