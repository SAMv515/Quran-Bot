const axios = require("axios");

async function getMakkahPrayerTimes() {
  try {
    const today = new Date();
    const d = today.getDate();
    const m = today.getMonth() + 1;
    const y = today.getFullYear();

    const url = `https://api.aladhan.com/v1/calendarByCity?city=Mecca&country=Saudi%20Arabia&method=4&month=${m}&year=${y}`;
    const res = await axios.get(url);

    const data = res.data.data[d - 1].timings;

    return {
      Fajr: data.Fajr.slice(0, 5),
      Dhuhr: data.Dhuhr.slice(0, 5),
      Asr: data.Asr.slice(0, 5),
      Maghrib: data.Maghrib.slice(0, 5),
      Isha: data.Isha.slice(0, 5)
    };
  } catch {
    return null;
  }
}

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

function getNextPrayer(times, current) {
  const order = ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"];
  for (const prayer of order) {
    if (times[prayer] > current) return prayer;
  }
  return "Fajr";
}

function getRemainingTime(now, target) {
  const [th, tm] = target.split(":").map(Number);
  const targetDate = new Date(now);
  targetDate.setHours(th, tm, 0, 0);

  if (targetDate < now) targetDate.setDate(targetDate.getDate() + 1);

  const diff = targetDate - now;
  return {
    hours: Math.floor(diff / (1000 * 60 * 60)),
    minutes: Math.floor((diff / (1000 * 60)) % 60)
  };
}

module.exports = {
  getMakkahPrayerTimes,
  getArabicPrayerName,
  getNextPrayer,
  getRemainingTime
};
