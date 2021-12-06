const Sense = require("../src/index.js");

const options = {
  email: process.env.email,
  password: process.env.password,
};
const sense = new Sense(options);

(async () => {
  const res = await sense.getDailyUsage("DAY", "2021-12-04T00:00:00.000Z");
  console.log(res);
})();
