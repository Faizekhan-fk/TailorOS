export const errorHandler = (err, req, res, next) => {
  const status = err.status || err.statusCode || 500;
  const message = status >= 500 && process.env.NODE_ENV === 'production'
    ? 'Internal Server Error'
    : err.message || 'Internal Server Error';

  console.error(`[${status}] ${message}`);

  res.status(status).json({
    success: false,
    message,
    errors: err.errors || [],
  });
};

export default errorHandler;
