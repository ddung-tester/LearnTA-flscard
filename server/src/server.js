require("dotenv").config();

const ungDung = require("./app");

const CONG = process.env.PORT || 5000;

ungDung.listen(CONG, () => {
  console.log(`Server running on http://localhost:${CONG}`);
});
