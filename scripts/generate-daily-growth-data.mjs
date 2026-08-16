import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

const OUT_FILE = path.resolve('frontend/public/daily-growth.json')
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || ''
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || ''
const OPENAI_BASE_URL = (process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, '')
const LLM_MODEL = process.env.LLM_MODEL || 'gpt-4o-mini'

const REPOS = [
  'openai/openai-cookbook',
  'langchain-ai/langgraph',
  'run-llama/llama_index',
  'modelcontextprotocol/modelcontextprotocol',
  'microsoft/autogen',
  'vercel/ai',
  'huggingface/smolagents',
  'explodinggradients/ragas',
]

const dayKey = (date = new Date()) =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)

const today = dayKey()
const todayNumber = Number(today.replaceAll('-', ''))

const headers = {
  Accept: 'application/vnd.github+json',
  'X-GitHub-Api-Version': '2022-11-28',
  ...(GITHUB_TOKEN ? { Authorization: `Bearer ${GITHUB_TOKEN}` } : {}),
}

async function githubJson(url) {
  const response = await fetch(url, { headers })
  if (!response.ok) {
    throw new Error(`GitHub request failed ${response.status}: ${url}`)
  }
  return response.json()
}

const completionUrls = (baseUrl) => {
  const normalized = baseUrl.replace(/\/$/, '')
  const urls = [`${normalized}/chat/completions`]
  if (!/\/v1$/i.test(normalized)) urls.push(`${normalized}/v1/chat/completions`)
  return urls
}

const pickTags = (repoName, description = '') => {
  const text = `${repoName} ${description}`.toLowerCase()
  const tags = ['AI 产品']
  if (/rag|index|retriev|eval|ragas/.test(text)) tags.push('RAG')
  if (/agent|graph|autogen|mcp|tool/.test(text)) tags.push('Agent')
  if (/multi|vision|audio|modal/.test(text)) tags.push('多模态')
  if (/sdk|cookbook|vercel|app/.test(text)) tags.push('产品工程')
  return Array.from(new Set(tags)).slice(0, 4)
}

function fallbackQuestion(radar) {
  const title = radar?.title || 'AI 产品热点'
  const cleanTitle = title.replace(/^GitHub 趋势：/, '')
  return {
    id: `question-${today}`,
    title: `如果你是 AI 产品经理，如何把“${cleanTitle}”转化成一个可验证的产品功能？`,
    background: `今日热点来自 ${radar?.source_name || 'GitHub AI 项目'}。请结合目标用户、使用场景、AI 能力边界和效果指标，说明你会如何判断这个方向是否值得做成产品功能。`,
    ability_tags: ['产品思维', 'AI 产品理解', 'MVP 定义', '指标设计'],
    source_ids: radar ? [radar.id] : [],
    suggested_structure: ['先说明目标用户和核心场景', '提炼热点背后的产品机会', '定义 MVP 功能闭环', '说明指标、风险和兜底机制'],
    scoring_guide: {
      structure: ['是否按用户-场景-方案-指标展开', '是否有清晰结论', '是否能形成面试可复述表达'],
      product_thinking: ['是否能把技术热点转成用户价值', '是否说明为什么值得做', '是否有边界和迭代意识'],
      expression: ['是否具体清楚', '是否避免堆术语', '是否有产品经理视角'],
    },
    status: 'new',
    created_at: new Date().toISOString(),
  }
}

async function generateQuestionWithLLM(radarItems) {
  if (!OPENAI_API_KEY || radarItems.length === 0) return fallbackQuestion(radarItems[0])
  const prompt = `你是 AI 产品经理面试训练教练。请根据今天的 AI 产品/技术热点，生成一道“产品思维练习题”。

要求：
- 题目面向 AI 产品经理求职者；
- 不要写成技术八股题，要考察产品判断、MVP、指标、边界；
- 输出严格 JSON，不要 Markdown；
- 字段：title, background, ability_tags, suggested_structure, scoring_guide。

今日热点：
${radarItems.slice(0, 4).map((item, index) => `${index + 1}. ${item.title}\n摘要：${item.summary}\nPM视角：${item.pm_insight}`).join('\n\n')}`

  try {
    const requestOptions = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: LLM_MODEL,
        temperature: 0.6,
        messages: [
          { role: 'system', content: '你只输出合法 JSON。' },
          { role: 'user', content: prompt },
        ],
      }),
    }
    let response = null
    let lastError = null
    for (const url of completionUrls(OPENAI_BASE_URL)) {
      response = await fetch(url, requestOptions)
      if (response.ok) break
      lastError = new Error(`LLM request failed ${response.status}`)
      if (response.status !== 404) break
    }
    if (!response?.ok) throw lastError || new Error('LLM request failed')
    const data = await response.json()
    const content = data.choices?.[0]?.message?.content || ''
    const parsed = JSON.parse(content.replace(/^```json\s*/i, '').replace(/```$/i, '').trim())
    return {
      ...fallbackQuestion(radarItems[0]),
      ...parsed,
      id: `question-${today}`,
      source_ids: radarItems.slice(0, 3).map((item) => item.id),
      status: 'new',
      created_at: new Date().toISOString(),
    }
  } catch (error) {
    console.warn('LLM question generation failed, using fallback:', error.message)
    return fallbackQuestion(radarItems[0])
  }
}

async function buildRadarItems() {
  const repos = await Promise.all(
    REPOS.map(async (fullName) => {
      const repo = await githubJson(`https://api.github.com/repos/${fullName}`)
      let latestRelease = null
      try {
        latestRelease = await githubJson(`https://api.github.com/repos/${fullName}/releases/latest`)
      } catch {
        latestRelease = null
      }
      return { repo, latestRelease }
    }),
  )

  return repos
    .sort((a, b) => new Date(b.repo.pushed_at).getTime() - new Date(a.repo.pushed_at).getTime())
    .map(({ repo, latestRelease }, index) => {
      const tags = pickTags(repo.full_name, repo.description)
      const releaseText = latestRelease
        ? `最新 Release：${latestRelease.name || latestRelease.tag_name}。`
        : '暂无可用最新 Release，主要参考仓库 README、描述和近期活跃度。'
      const fullContent = `${repo.full_name} 是今天纳入 AI 产品雷达的 GitHub 真实资料源。

仓库描述：${repo.description || '暂无描述'}
Star 数：${repo.stargazers_count}
最近更新时间：${repo.pushed_at}
${releaseText}

产品经理视角：
这个资料源可以用来观察 AI 能力如何从技术框架走向产品功能。分析时不要只看“它用了什么技术”，更要看它解决了什么用户任务、是否降低了使用门槛、能否形成稳定工作流、是否需要评估和人工兜底。

面试表达素材：
如果面试官问你如何跟进 AI 产品趋势，可以说：我会从 GitHub/官方资料里观察高活跃项目，把技术变化翻译成产品问题，例如它适合服务哪类用户、能进入哪个工作流、MVP 怎么做、效果如何衡量、失败时怎么兜底。`

      return {
        id: `radar-${today}-${repo.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') || index}`,
        title: `GitHub 趋势：${repo.full_name}`,
        source_name: `GitHub · ${repo.full_name}`,
        source_url: repo.html_url,
        summary: `${repo.description || 'GitHub AI 项目'}。最近更新时间：${new Intl.DateTimeFormat('zh-CN', { dateStyle: 'medium', timeZone: 'Asia/Shanghai' }).format(new Date(repo.pushed_at))}，Star：${repo.stargazers_count}。`,
        full_content: fullContent,
        pm_insight: `从产品视角看，它适合拆成“目标用户—任务场景—AI 能力—MVP 闭环—指标评估—风险兜底”来分析，可沉淀为 AI 产品经理面试素材。`,
        tags,
        created_at: new Date().toISOString(),
        saved_to_knowledge: false,
      }
    })
}

async function main() {
  const radarItems = await buildRadarItems()
  const start = todayNumber % Math.max(1, radarItems.length)
  const rotatedRadar = [...radarItems.slice(start), ...radarItems.slice(0, start)]
  const question = await generateQuestionWithLLM(rotatedRadar)
  const payload = {
    generated_at: new Date().toISOString(),
    date_key: today,
    source: OPENAI_API_KEY ? 'github+llm' : 'github+template',
    question,
    questions: [question],
    radar_items: rotatedRadar,
  }
  await mkdir(path.dirname(OUT_FILE), { recursive: true })
  await writeFile(OUT_FILE, `${JSON.stringify(payload, null, 2)}\n`, 'utf8')
  console.log(`Generated ${OUT_FILE} with ${rotatedRadar.length} radar items for ${today}`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
