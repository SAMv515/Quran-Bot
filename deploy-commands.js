const { REST, Routes, SlashCommandBuilder } = require("discord.js");
const config = require("./config.json");

const commands = [

  // 🔵 أوامر الإعداد الأساسية
  new SlashCommandBuilder()
    .setName("set-quran-role")
    .setDescription(" 🟢 ( 1 ) تحديد رول ختمة القرآن") 
    .addRoleOption(option =>
      option.setName("role")
        .setDescription("الرول الذي سيتم إعطاؤه للمشتركين")
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("set-quran-channel")
    .setDescription(" 🟢 ( 2 ) تحديد روم ختمة القرآن")
    .addChannelOption(option =>
      option.setName("channel")
        .setDescription("الروم الذي سيتم إرسال الصفحات فيه")
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("set-global-adhan-role")
    .setDescription(" 🔴 ( 3 ) تحديد رول تنبيه أذان مكة")
    .addRoleOption(option =>
      option.setName("role")
        .setDescription("الرول الذي سيتم إعطاؤه للمشتركين في تنبيه أذان مكة")
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("set-makkah-reminder-channel")
    .setDescription(" 🔴 ( 4 ) تحديد روم تنبيه أذان مكة")
    .addChannelOption(option =>
      option.setName("channel")
        .setDescription("الروم الذي سيتم إرسال تنبيهات أذان مكة فيه")
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("catchup-pages")
    .setDescription(" 🟡 ( 5 )  تعويض صفحات الأيام الماضية من الختمة"),

  new SlashCommandBuilder()
    .setName("setup-panel")
    .setDescription(" 🔵 ( 6 )  إنشاء لوحة التحكم الخاصة بختمة القرآن"),

  // 🟢 أوامر التشغيل اليومية
  new SlashCommandBuilder()
    .setName("current-page")
    .setDescription(" 🟣 ( 7 )  عرض الصفحة الحالية في الختمة"),

  new SlashCommandBuilder()
    .setName("test-quran-page")
    .setDescription(" ⚫ ( 8 )  اختبار إرسال صفحة معينة")
    .addChannelOption(option =>
      option.setName("channel")
        .setDescription("الروم الذي سيتم إرسال الصفحة فيه")
        .setRequired(true)
    )
    .addIntegerOption(option =>
      option.setName("page")
        .setDescription("رقم الصفحة")
        .setRequired(true)
    ),

  // ⚪ أوامر التجربة (لا تدخل ضمن ترتيب التشغيل)
  new SlashCommandBuilder()
    .setName("test-api")
    .setDescription("⚪ اختبار API أوقات الصلاة"),

  new SlashCommandBuilder()
    .setName("what-prayer-now")
    .setDescription("⚪ معرفة هل نحن الآن في وقت صلاة"),

  new SlashCommandBuilder()
    .setName("ramadan-day")
    .setDescription("⚪ معرفة اليوم من رمضان"),

  new SlashCommandBuilder()
    .setName("today-prayers")
    .setDescription("⚪ عرض أوقات الصلاة اليوم"),

  // 🧪 أوامر الاختبار المؤقتة — احذفها بعد الانتهاء
  new SlashCommandBuilder()
    .setName("test-quran-now")
    .setDescription("🧪 محاكاة إرسال صفحات القرآن كأنه وقت صلاة الآن"),

  new SlashCommandBuilder()
    .setName("test-adhan-dm")
    .setDescription("🧪 اختبار تنبيهات الأذان عبر الرسائل الخاصة (DM)"),

].map(cmd => cmd.toJSON());

const rest = new REST({ version: "10" }).setToken(config.token);

(async () => {
  try {
    console.log("⏳ جاري رفع الأوامر…");

    await rest.put(
      Routes.applicationCommands(config.clientId),
      { body: commands }
    );

    console.log("✅ تم رفع الأوامر بنجاح!");
  } catch (error) {
    console.error(error);
  }
})();