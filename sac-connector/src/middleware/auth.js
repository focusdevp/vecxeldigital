const auth = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];

  if (!apiKey) {
    return res.status(401).json({
      success: false,
      error: 'Acceso denegado. Header X-API-Key requerido.'
    });
  }

  if (apiKey !== process.env.API_KEY) {
    return res.status(403).json({
      success: false,
      error: 'API Key inválida.'
    });
  }

  next();
};

module.exports = auth;
