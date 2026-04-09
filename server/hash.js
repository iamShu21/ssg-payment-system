const bcrypt = require("bcryptjs");

(async () => {
  try {
    const plain = "admin123";
    const saltRounds = 10;
    const hash = await bcrypt.hash(plain, saltRounds);
    console.log("bcrypt hash:", hash);
  } catch (err) {
    console.error(err);
  }
})();