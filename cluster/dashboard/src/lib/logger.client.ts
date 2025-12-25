import pino from 'pino'

const logger = pino({
  browser: {
    asObject: true,
  },
  level: process.env.NODE_ENV === 'development' ? 'debug' : 'info',
})

export default logger
