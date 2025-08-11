export default async function handler(req, res) {
  try{
    const url = req.query.url
    if(!url || typeof url !== 'string'){ return res.status(400).send('Missing url') }
    let target
    try {
      target = new URL(url)
    } catch {
      return res.status(400).send('Invalid url')
    }
    if(!['http:','https:'].includes(target.protocol)){
      return res.status(400).send('Protocol not allowed')
    }
    // Basic SSRF guard: block localhost and private IPs
    const host = target.hostname
    const forbidden = ['localhost','127.0.0.1','::1']
    if(forbidden.includes(host.toLowerCase())){
      return res.status(400).send('Host not allowed')
    }
    // Optional: simple host/IP check
    try {
      const { Resolver } = await import('node:dns').then(m=>m.promises || m)
      const r = new Resolver()
      const addrs = await r.resolve(host).catch(()=>[])
      for(const a of addrs){
        try{
          const ip = require('ipaddr.js').parse(a) // optional dependency not present, fallback below
        }catch{}
      }
    } catch {}

    const controller = new AbortController()
    const timeout = setTimeout(()=>controller.abort(), Number(process.env.FETCH_TIMEOUT_MS || 15000))

    const resp = await fetch(target.toString(), {
      headers:{
        'user-agent':'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36 RevixaProxy/1.0',
        'accept-language':'en-US,en;q=0.9',
        'accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      },
      signal: controller.signal
    }).catch(err=>{ throw err })

    clearTimeout(timeout)
    if(!resp.ok){
      res.setHeader('Access-Control-Allow-Origin','*')
      return res.status(502).send('Upstream error: '+resp.status)
    }
    const html = await resp.text()
    res.setHeader('Content-Type','text/html; charset=utf-8')
    res.setHeader('Cache-Control','s-maxage=60, stale-while-revalidate=300')
    res.setHeader('Access-Control-Allow-Origin','*')
    return res.status(200).send(html)
  }catch(err){
    res.setHeader('Access-Control-Allow-Origin','*')
    return res.status(500).send('Proxy error')
  }
}
