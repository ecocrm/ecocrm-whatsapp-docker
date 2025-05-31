const jwt = require("jsonwebtoken");

module.exports = function (req, res, next) {
  const token = req.header("Authorization");
  if (!token) {
    return res.status(401).json({ message: "Token não fornecido" });
  }

  try {
    const decoded = jwt.verify(token.replace("Bearer ", ""), process.env.JWT_SECRET || "ecocrm_secret_key");
    req.user = decoded.user;
    next();
  } catch (err) {
    res.status(401).json({ message: "Token inválido" });
  }
};
