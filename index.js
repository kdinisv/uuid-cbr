const crypto = require("crypto");
const WIN_EPOCH_MS = BigInt(Date.UTC(1601, 0, 1));
const UUID_TIME_OFFSET = 5748192000000000n;
const HUNDRED_NS_PER_MS = 10000n;

const UUID_WITH_CHECKSUM_REGEX =
  /^([0-9a-f]{8})-([0-9a-f]{4})-([0-9a-f]{4})-([0-9a-f]{4})-([0-9a-f]{12})(?:-([0-9a-f]{1}))?$/i;

const formatHex = (value, length) => value.toString(16).padStart(length, "0");

const normalizeNode = (node) => {
  if (Buffer.isBuffer(node)) {
    return Buffer.from(node);
  }

  if (Array.isArray(node)) {
    return Buffer.from(node);
  }

  if (typeof node === "string") {
    return Buffer.from(node, "hex");
  }

  throw new TypeError("Invalid node");
};

const createState = (options = {}) => {
  const node =
    options.node === undefined
      ? crypto.randomBytes(6)
      : normalizeNode(options.node);
  if (node.length !== 6) {
    throw new RangeError("Node must be 6 bytes long");
  }

  node[5] |= 0x01;

  const clockSeq =
    options.clockSeq === undefined
      ? crypto.randomBytes(2).readUInt16LE(0) & 0x1fff
      : Number(options.clockSeq) & 0x1fff;

  return {
    lastUSNS: options.lastUSNS === undefined ? 0 : Number(options.lastUSNS),
    lastTime: options.lastTime === undefined ? 0n : BigInt(options.lastTime),
    node,
    nodeHex: Buffer.from(node).reverse().toString("hex"),
    clockSeq,
    clockSeqLow: clockSeq & 0xff,
    clockSeqHiAndReserved: ((clockSeq & 0x3f00) >> 8) | 0x80,
  };
};

let state = createState();

const ensureState = () => {
  if (!state) {
    state = createState();
  }

  return state;
};

const getTimestamp100ns = (datetime) => {
  const currentState = ensureState();
  const date = new Date(datetime);
  if (Number.isNaN(date.getTime())) {
    throw new TypeError("Invalid datetime");
  }

  const currentTime =
    (BigInt(date.getTime()) - WIN_EPOCH_MS) * HUNDRED_NS_PER_MS +
    UUID_TIME_OFFSET;

  if (currentTime === currentState.lastTime) {
    currentState.lastUSNS++;
  } else {
    currentState.lastUSNS = 0;
    currentState.lastTime = currentTime;
  }

  return currentTime + BigInt(currentState.lastUSNS);
};

const getTime = (datetime) => {
  return Number(getTimestamp100ns(datetime));
};

const calcCtrl = (uuid) => {
  let pos = 0;
  let index = 1;
  let sum = 0;
  while (uuid[pos]) {
    const code = uuid.charCodeAt(pos++);

    if (code >= 48 && code <= 57) {
      sum += (code - 48) * index++;
    } else {
      const lowerCode = code | 32;
      if (lowerCode >= 97 && lowerCode <= 102) {
        sum += (lowerCode - 87) * index++;
      }
    }

    // если значение индекса превысило 10, сбрасываем индекс в 1
    if (index > 10) index = 1;
  }

  const r = sum % 16;
  return r.toString(16);
};

const isValid = (data) => {
  if (typeof data !== "string") {
    return false;
  }

  const res = data.match(
    /^([0-9a-f]{8}-[0-9a-f]{4}-1[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})-([0-9a-f]{1})$/,
  );
  if (!res) return false;
  const [, uuid, cs] = res;
  if (!uuid && !cs) {
    return false;
  }
  return calcCtrl(uuid) === cs;
};

const uuid_create = (datetime = new Date()) => {
  const currentState = ensureState();
  const timeValue = getTimestamp100ns(datetime);

  return {
    time_low: Number(timeValue & 0xffffffffn),
    time_mid: Number((timeValue >> 32n) & 0xffffn),
    time_hi_and_version: Number((timeValue >> 48n) & 0x0fffn) | (1 << 12),
    clock_seq_hi_and_reserved: currentState.clockSeqHiAndReserved,
    clock_seq_low: currentState.clockSeqLow,
    node: Array.from(currentState.node),
  };
};

const generate = (datetime = new Date()) => {
  const currentState = ensureState();
  const uuid = uuid_create(datetime);

  const result =
    `${formatHex(uuid.time_low, 8)}-` +
    `${formatHex(uuid.time_mid, 4)}-` +
    `${formatHex(uuid.time_hi_and_version, 4)}-` +
    `${formatHex(uuid.clock_seq_hi_and_reserved, 2)}${formatHex(uuid.clock_seq_low, 2)}-` +
    currentState.nodeHex;

  return result + "-" + calcCtrl(result);
};

const uid_create = (datetime = new Date()) => generate(datetime);

const uid_init = (options = {}) => {
  state = createState(options);
  return true;
};

const uid_deinit = () => {
  state = null;
};

const uuid_init = (options = {}) => uid_init(options);

const uuid_deinit = () => {
  uid_deinit();
};

const toDate = (uuid) => {
  if (typeof uuid !== "string") {
    throw new TypeError("Invalid UUID");
  }

  const match = uuid.match(UUID_WITH_CHECKSUM_REGEX);
  if (!match) {
    throw new TypeError("Invalid UUID");
  }

  const [, timeLow, timeMid, timeHiAndVersion] = match;
  const timestamp =
    ((BigInt(`0x${timeHiAndVersion}`) & 0x0fffn) << 48n) |
    (BigInt(`0x${timeMid}`) << 32n) |
    BigInt(`0x${timeLow}`);
  const dateMs =
    (timestamp - UUID_TIME_OFFSET) / HUNDRED_NS_PER_MS + WIN_EPOCH_MS;

  return new Date(Number(dateMs));
};

const info = (uuid) => {
  if (typeof uuid !== "string") {
    throw new TypeError("Invalid UUID");
  }

  const controlNum = uuid.split("-")[5];

  return {
    len: uuid.length,
    valid: isValid(uuid),
    controlNum,
    gClockSeq: ensureState().clockSeq,
    datetime: toDate(uuid),
  };
};

module.exports = {
  generate,
  uid_init,
  uid_deinit,
  uid_create,
  uuid_init,
  uuid_deinit,
  uuid_create,
  isValid,
  getTime,
  toDate,
  info,
};
