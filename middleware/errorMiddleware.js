const errorMiddleware = (err, req, res, next) => {
    console.log("error: ", err);
    res.status(400).json({
          error: err.message || err,
          ts: new Date().toISOString(),
          host: req.hostname,
          method: req.method,
    });
};

module.exports = {
    errorMiddleware
}