#!/usr/bin/env python3
"""Fetch permitted public RSS feeds and publish link-first story metadata."""
import json, re, time, hashlib, urllib.request, urllib.error
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime
from pathlib import Path
from xml.etree import ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
SOURCES = json.loads((ROOT / "config/sources.json").read_text(encoding="utf-8"))
OUT = ROOT / "data/news.json"
MAX_PER_SOURCE = 35
MAX_TOTAL = 180
USER_AGENT = "LatestNewspaperBot/1.0 (+https://github.com/bachchupatra67-dotcom/e-newspaper; contact: repository owner)"

SCHOLAR_WORDS = re.compile(r"\b(scholarship|fellowship|financial assistance|stipend|grant)\b", re.I)
EXAM_WORDS = re.compile(r"\b(exam|examination|board|cbse|icse|isc|ncert|neet|jee|cuet|admission|entrance test|result|syllabus|assessment)\b", re.I)
EDU_WORDS = re.compile(r"\b(education|school|student|students|university|universities|college|classroom|teacher|learning|curriculum|academic|skill development|literacy)\b", re.I)
SCI_WORDS = re.compile(r"\b(science|research|space|isro|biology|physics|chemistry|climate|environment)\b", re.I)
TECH_WORDS = re.compile(r"\b(technology|artificial intelligence|\bAI\b|cyber|digital|innovation|robotics|software)\b", re.I)
SPORT_WORDS = re.compile(r"\b(sport|sports|cricket|football|tennis|hockey|olympic|athlete|tournament)\b", re.I)
BIZ_WORDS = re.compile(r"\b(business|economy|market|markets|bank|banking|inflation|trade|industry|company|companies|finance)\b", re.I)
WORLD_WORDS = re.compile(r"\b(world|international|global|foreign|united nations|UN summit|overseas|diplomatic)\b", re.I)

def text_of(node, names):
    for name in names:
        found = node.find(name)
        if found is not None and found.text:
            return found.text.strip()
    return ""

def clean_text(value):
    value = re.sub(r"<[^>]+>", " ", value or "")
    value = re.sub(r"<!\[CDATA\[|\]\]>", " ", value)
    return re.sub(r"\s+", " ", value).strip()

def normalise_date(value):
    if not value:
        return ""
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        try:
            parsed = parsedate_to_datetime(value)
        except (TypeError, ValueError, OverflowError):
            return ""
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    return parsed.astimezone(timezone.utc).isoformat()

def classify(title, summary):
    text = title + " " + summary
    if SCHOLAR_WORDS.search(text): return "Scholarships"
    if ADMISSION_WORDS.search(text): return "Admissions"
    if RESULT_WORDS.search(text): return "Results"
    if EXAM_WORDS.search(text): return "Examinations"
    if OPPORTUNITY_WORDS.search(text): return "Student Opportunities"
    if EDU_WORDS.search(text): return "Education"
    if SCI_WORDS.search(text): return "Science"
    if TECH_WORDS.search(text): return "Technology"
    return "Other"

def parse_feed(xml_bytes, source):
    root = ET.fromstring(xml_bytes)
    items = root.findall(".//item")
    if not items:
        items = root.findall(".//{http://www.w3.org/2005/Atom}entry")
    found = []
    for item in items[:MAX_PER_SOURCE]:
        title = clean_text(text_of(item, ["title", "{http://www.w3.org/2005/Atom}title"]))
        url = text_of(item, ["link"])
        if not url:
            link = item.find("{http://www.w3.org/2005/Atom}link")
            url = link.attrib.get("href", "") if link is not None else ""
        summary = clean_text(text_of(item, ["description", "summary", "{http://www.w3.org/2005/Atom}summary"]))
        published_raw = text_of(item, ["pubDate", "published", "updated", "{http://www.w3.org/2005/Atom}published", "{http://www.w3.org/2005/Atom}updated"])
        if not title or not url.startswith("https://"):
            continue
        if not source.get("summary_allowed", False):
            summary = ""
        category = classify(title, summary)
        if source.get("education_only") and category not in ("Education", "Examinations", "Admissions", "Results", "Scholarships", "Student Opportunities", "Science", "Technology"):
            continue
        key = hashlib.sha256(url.split("#")[0].encode()).hexdigest()[:18]
        found.append({"id": key, "title": title[:240], "summary": summary[:260], "url": url, "source": source["name"], "category": category, "published": normalise_date(published_raw)})
    return found

def main():
    fetched, seen = [], set()
    for source in SOURCES:
        if not source.get("enabled", False):
            continue
        try:
            request = urllib.request.Request(source["feed_url"], headers={"User-Agent": USER_AGENT, "Accept": "application/rss+xml, application/atom+xml, application/xml, text/xml"})
            with urllib.request.urlopen(request, timeout=18) as response:
                payload = response.read(2_500_000)
            for article in parse_feed(payload, source):
                if article["id"] not in seen:
                    seen.add(article["id"])
                    fetched.append(article)
            print("OK:", source["name"])
        except urllib.error.HTTPError as error:
            print("HTTP", error.code, source["name"], "- source skipped; no bypass attempted")
        except Exception as error:
            print("WARN:", source["name"], type(error).__name__, "- source skipped")
        time.sleep(2)

    previous = {}
    if OUT.exists():
        try:
            previous = json.loads(OUT.read_text(encoding="utf-8"))
        except Exception:
            pass
    if not fetched and previous.get("articles"):
        print("No source returned items; retaining previous edition.")
        return

    # Merge new feed entries with the last edition so a temporary source outage
    # does not make already-published headlines disappear.
    merged = {item.get("id") or hashlib.sha256(item.get("url", "").encode()).hexdigest()[:18]: item
              for item in previous.get("articles", [])}
    for item in fetched:
        merged[item["id"]] = item
    articles = list(merged.values())
    articles.sort(key=lambda item: item.get("published") or "", reverse=True)
    articles = articles[:MAX_TOTAL]

    if articles == previous.get("articles", []):
        print("No new or changed stories; leaving edition unchanged.")
        return

    result = {"updated_at": datetime.now(timezone.utc).isoformat(), "count": len(articles), "articles": articles}
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print("Published", len(articles), "link-first items.")

if __name__ == "__main__":
    main()
