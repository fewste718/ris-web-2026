import { mockCreateTicket, mockGetTickets } from '../src/api/mockTickets.js'

// Учебный HTTP mock, подключаемый только к dev-серверу Vite.
export function mockApiPlugin() {
  return {
    name: 'support-tickets-mock',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = new URL(req.url, 'http://localhost')
        if (url.pathname !== '/__mock/api/support-tickets') return next()
        res.setHeader('Content-Type', 'application/json; charset=utf-8')
        res.setHeader('Cache-Control', 'no-store')
        const options = {
          empty: url.searchParams.get('empty') === '1',
          force500: url.searchParams.get('force500') === '1',
        }
        let result
        if (req.method === 'GET') {
          result = await mockGetTickets(options)
        } else if (req.method === 'POST') {
          let body
          try {
            let raw = ''
            for await (const chunk of req) raw += chunk
            body = JSON.parse(raw)
          } catch {
            res.statusCode = 400
            res.end(JSON.stringify({ message: 'Некорректный JSON.' }))
            return
          }
          result = await mockCreateTicket(body, options)
        } else {
          res.setHeader('Allow', 'GET, POST')
          result = { status: 405, data: { message: 'Метод не поддерживается.' } }
        }
        res.statusCode = result.status
        if (result.status === 201) res.setHeader('Location', `/api/support-tickets/${result.data.id}`)
        res.end(JSON.stringify(result.data))
      })
    },
  }
}
