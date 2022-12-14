const crypto = require("crypto");
const winEpoch = new Date(Date.UTC(1601, 0, 1)).getTime();

const random = (min, max) => {
  return Math.floor(Math.random() * (max - min + 1) + min);
};

let gLastUSNS = 0;
let gLastTime = 0;
let time = 0;

const getTime = (datetime) => {
  do {
    const winDate = (new Date(datetime).getTime() - winEpoch) * 10000;
    time = winDate + 5748192000000000;
  } while (time === gLastTime && gLastUSNS === 9999);

  if (time === gLastTime) {
    // Если время не изменилось, за микро- и наносекунды
    // возьмем предыдущее значение плюс один
    gLastUSNS++;
  } else {
    // Если время изменилось, за микро- и наносекунды возьмём 0.
    gLastUSNS = random(1, 10000);
    // и запомним значение времени
    gLastTime = time;
  }
  time += gLastUSNS;
  return time;
};

const calcCtrl = (uuid) => {
  let pos = 0;
  let index = 1;
  let sum = 0;
  while (uuid[pos]) {
    const c = uuid[pos++];
    // если символ - десятичная цифра
    if (/\d/.test(c)) {
      // увеличение суммы и индекса
      sum += parseInt(c, 10) * index++;
    }

    // если символ - шестнадцатеричная цифра
    if (/[a-f]/i.test(c)) {
      sum += parseInt(c, 16) * index++;
    }
    // если значение индекса превысило 10, сбрасываем индекс в 1
    if (index > 10) index = 1;
  }

  const r = sum % 16;
  // возврат результата в виде контрольного символа
  if (r < 10) {
    return r;
  }
  return r.toString(16);
};

const isValid = (data) => {
  const res = data.match(/^([0-9a-f]{8}-[0-9a-f]{4}-1[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})-([0-9a-f]{1})$/);
  if (!res) return false;
  const [, uuid, cs] = res;
  if (!uuid && !cs) {
    return false;
  }
  return calcCtrl(uuid) == cs;
};

const bin2Hex = (bin) => {
  const dec = parseInt(bin, 2);
  const hex = dec.toString(16).padStart(4, "0");
  return hex;
};

const gClockSeq = Buffer.alloc(14, crypto.randomBytes(14).readUInt32BE(0, true).toString(2));
const generate = (datetime = new Date()) => {
  const gt = getTime(datetime);

  const buff = Buffer.alloc(57, gt.toString(2));

  const version_time_hide = Buffer.from(buff.buffer, 0, 9); // Из-за смещения 3ех нулей беру 9 байт

  const clockseq_low = Buffer.from(gClockSeq.buffer, 6);
  const variant_clockseq_high = Buffer.from(gClockSeq.buffer, 0, 6);

  const time_low = Buffer.from(buff.buffer, 25);

  const time_mid = Buffer.from(buff.buffer, 9, 16);

  const time = {
    time_bin: buff + "",
    time_low: time_low + "",
    time_mid: (time_mid + "").padStart(16, "0"),
    version_time_hide: "0001000" + version_time_hide,
    clockseq_low: `10${variant_clockseq_high.toString("binary")}${clockseq_low.toString("binary")}`,
  };

  const node = Buffer.alloc(6);
  node[0] = crypto.randomBytes(4).readUInt32BE(0, true);
  node[1] = crypto.randomBytes(4).readUInt32BE(0, true);
  node[2] = crypto.randomBytes(4).readUInt32BE(0, true);
  node[3] = crypto.randomBytes(4).readUInt32BE(0, true);
  node[4] = crypto.randomBytes(4).readUInt32BE(0, true);
  node[5] = crypto.randomBytes(4).readUInt32BE(0, true);
  const result = [
    bin2Hex(time.time_low).padStart(8, "0"),
    bin2Hex(time.time_mid),
    bin2Hex(time.version_time_hide),
    bin2Hex(time.clockseq_low),
    node.toString("hex"),
  ].join("-");
  return result + "-" + calcCtrl(result);
};

const toDate = (uuid) => {
  const [, time_low, time_mid, version_time_hide] = uuid.match(/^([0-9a-f]{8})-([0-9a-f]{4})-([0-9a-f]{4})-([0-9a-f]{4})/);

  const bin_version_time_hide = parseInt(version_time_hide, 16)
    .toString(2)
    .replace(/^1000(.+)/, "$1");
  const bin_time_mid = parseInt(time_mid, 16).toString(2).padStart(16, "0");
  const bin_time_low = parseInt(time_low, 16).toString(2).padStart(32, "0");

  const buff = Buffer.alloc(57, `${bin_version_time_hide}${bin_time_mid}${bin_time_low}`);

  const nSec = parseInt(buff.toString("binary"), 2) - 5748192000000000;
  return new Date(nSec / 10000 + winEpoch);
};

const info = (uuid) => {
  const controlNum = uuid.split("-")[5];

  return {
    len: uuid.length,
    valid: isValid(uuid),
    controlNum,
    gClockSeq: parseInt(gClockSeq.toString("hex"), 16),
    datetime: toDate(uuid),
  };
};

module.exports = {
  generate,
  isValid,
  getTime,
  toDate,
  info,
};
