"""Small lexical-query helper used when vector embeddings are unavailable."""

import re


_STOP_TERMS = {
    "为什么", "是什么", "有什么", "怎么办", "怎么", "如何", "哪些", "是否",
    "这个", "那个", "这些", "那些", "目前", "现在", "请问", "一下", "相关",
    "如果", "成立", "第一个", "第二个", "第三个", "上述", "前面", "刚才",
    "我们", "下周", "给出", "顺序", "改变", "怎样", "假设",
}


def extract_search_terms(query: str, limit: int = 24) -> list[str]:
    """Extract useful ASCII words and Chinese 2-4 character windows."""
    normalized = " ".join(query.strip().split())
    terms: list[str] = []

    for word in re.findall(r"[A-Za-z0-9_.-]{2,}", normalized.lower()):
        if word not in terms:
            terms.append(word)

    for segment in re.findall(r"[\u4e00-\u9fff]{2,}", normalized):
        cleaned = segment
        for stop in _STOP_TERMS:
            cleaned = cleaned.replace(stop, " ")
        for part in cleaned.split():
            if 2 <= len(part) <= 8 and part not in terms:
                terms.append(part)
            for size in (4, 3, 2):
                for index in range(max(0, len(part) - size + 1)):
                    term = part[index:index + size]
                    if term not in terms:
                        terms.append(term)
                    if len(terms) >= limit:
                        return terms

    return terms[:limit]


def lexical_match_score(query: str, text: str) -> float:
    """Return a conservative lexical score for embedding-free retrieval.

    A single generic two-character hit is ignored. Exact short queries and
    longer domain terms still qualify, while overlapping Chinese n-grams make
    specific concepts rank above incidental matches.
    """
    haystack = text.lower()
    terms = extract_search_terms(query, limit=48)
    matched = [term for term in terms if term in haystack]
    if not matched:
        return 0.0

    compact_query = "".join(query.lower().split())
    if 2 <= len(compact_query) <= 12 and compact_query in haystack:
        return 1.0

    long_matches = [term for term in matched if len(term) >= 3]
    if not long_matches and len(matched) < 2:
        return 0.0
    if len(matched) == 1 and len(matched[0]) < 4:
        return 0.0

    weighted_hits = sum(min(len(term), 6) for term in matched)
    weighted_total = sum(min(len(term), 6) for term in terms) or 1
    return round(min(1.0, weighted_hits / weighted_total), 4)
