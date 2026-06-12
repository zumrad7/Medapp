module.exports = {
  secret: process.env.JWT_SECRET || 'default_secret_key_change_this',
  jwtExpiration: process.env.JWT_EXPIRE || '7d',
};