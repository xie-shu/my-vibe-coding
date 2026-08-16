const DEFAULT_MODEL = 'gpt-4o-mini'

const CHAT_PROMPT = `你是“AI 成长舱”的 AI 产品经理成长助手。

产品背景：
- 用户正在准备 AI 产品经理面试，也会用工作台做日常 AI 产品学习。
- 工作台包含每日产品思维训练、AI 产品雷达、个人知识库和练习复盘库。
- 回答要像一个有经验的 AI 产品经理教练：具体、可落地、适合面试表达。

回答要求：
1. 先判断问题类型：普通知识/寒暄、知识库问题，还是需要外部实时工具的问题。
2. 不需要检索或工具的问题，直接使用通用知识正常回答，不要因为知识库没有命中就拒答。
3. 需要资料依据的问题，优先结合用户提供的资料上下文、练习记录和 AI 产品雷达内容。
4. 需要实时信息或外部操作的问题，例如天气、股价、汇率、航班、实时新闻，先判断当前是否有对应工具；如果没有工具或工具没有返回结果，必须明确说明当前没有接入对应查询工具/知识库，不能判断，不要编造答案。
5. 普通寒暄和能力介绍问题可以自然回应，例如用户说“你好”“你会做什么”时，简短介绍你能帮什么。
6. 尽量给结构化回答，必要时给面试话术。
7. 中文回答，语气清晰直接。

可参考上下文：
{context}`

function sendSse(res, payload) {
  res.write(`data: ${JSON.stringify(payload)}\n\n`)
}

function safeHistory(history) {
  if (!Array.isArray(history)) return []
  return history.slice(-8).flatMap((item) => {
    if (!item || !['user', 'assistant'].includes(item.role) || typeof item.content !== 'string') return []
    return [{ role: item.role, content: item.content.slice(0, 2000) }]
  })
}

function classifyError(error) {
  const text = String(error?.message || error)
  if (/401|unauthorized|incorrect api key/i.test(text)) return '大模型认证失败，请检查 OPENAI_API_KEY 配置'
  if (/404|model/i.test(text)) return '大模型或接口地址不可用，请检查 OPENAI_BASE_URL 和 LLM_MODEL 配置'
  if (/timeout|aborted/i.test(text)) return '大模型响应超时，请稍后重试'
  return '大模型调用失败，请检查后端服务和模型配置'
}

function completionUrls(baseUrl) {
  const normalized = baseUrl.replace(/\/$/, '')
  const urls = [`${normalized}/chat/completions`]
  if (!/\/v1$/i.test(normalized)) urls.push(`${normalized}/v1/chat/completions`)
  return urls
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    res.status(204).end()
    return
  }

  if (req.method !== 'POST') {
    res.status(405).json({ detail: 'Method Not Allowed' })
    return
  }

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    res.status(500).json({ detail: 'LLM 未配置，请在部署平台配置 OPENAI_API_KEY' })
    return
  }

  const body = req.body || {}
  const query = typeof body.query === 'string' ? body.query.trim() : ''
  if (!query) {
    res.status(400).json({ detail: '查询不能为空' })
    return
  }

  const baseUrl = (process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, '')
  const model = process.env.LLM_MODEL || DEFAULT_MODEL
  const context = typeof body.context === 'string' && body.context.trim() ? body.context : '（暂无额外上下文）'
  const hasImages = Array.isArray(body.images) && body.images.length > 0

  const userContent = hasImages
    ? [
        { type: 'text', text: query },
        ...body.images
          .filter((item) => typeof item === 'string' && item.startsWith('data:image/'))
          .slice(0, 4)
          .map((url) => ({ type: 'image_url', image_url: { url } })),
      ]
    : query

  const messages = [
    { role: 'system', content: CHAT_PROMPT.replace('{context}', context.slice(0, 8000)) },
    ...safeHistory(body.history),
    { role: 'user', content: userContent },
  ]

  res.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
  })

  try {
    let response = null
    let lastError = null
    const requestOptions = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        stream: true,
        temperature: 0.7,
      }),
    }

    for (const url of completionUrls(baseUrl)) {
      response = await fetch(url, requestOptions)
      if (response.ok) break
      lastError = new Error(`LLM request failed ${response.status}: ${await response.text()}`)
      if (response.status !== 404) break
    }

    if (!response.ok || !response.body) {
      throw lastError || new Error(`LLM request failed ${response.status}`)
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { value, done } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const events = buffer.split('\n\n')
      buffer = events.pop() || ''

      for (const event of events) {
        const line = event.split('\n').find((item) => item.startsWith('data: '))
        if (!line) continue
        const data = line.slice(6).trim()
        if (!data || data === '[DONE]') continue
        try {
          const parsed = JSON.parse(data)
          const delta = parsed.choices?.[0]?.delta?.content
          if (delta) sendSse(res, { type: 'token', content: delta })
        } catch {
          // ignore malformed upstream chunks
        }
      }
    }

    sendSse(res, { type: 'done' })
    res.end()
  } catch (error) {
    sendSse(res, { type: 'error', message: classifyError(error) })
    res.end()
  }
}
