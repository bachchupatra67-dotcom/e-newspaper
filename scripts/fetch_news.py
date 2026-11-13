#!/usr/bin/env python3
"""Collect permitted education RSS/Atom items and create concise independent reports."""
import hashlib
import json
import os
import re
import time
import urllib.error
import urllib.request
from datetime import datetime, timedelta, timezone
from email.utils import parsedate_to_datetime
from pathlib import Path
from xml.etree import ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
SOURCES = json.loads((ROOT / "config/sources.json").read_text(encoding="utf-8"))
OUT = ROOT / "data/news.json"
MAX_PER_SOURCE = 25
MAX_NEW_PER_RUN = 8
MAX_TOTAL = 180
MAX_AGE_DAYS = 30
USER_AGENT = "LatestNewspaperBot/3.0 (+https://github.com/bachchupatra67-dotcom/e-newspaper)"
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")

SCHOLAR_WORDS = re.compile(r"\b(scholarship|fellowship|financial assistance|stipend|grant)\b", re.I)
ADMISSION_WORDS = re.compile(r"\b(admission|admissions|enrolment|enrollment|application window|entrance registration)\b", re.I)
RESULT_WORDS = re.compile(r"\b(result|results|scorecard|merit list|answer key)\b", re.I)
OPPORTUNITY_WORDS = re.compile(r"\b(internship|olympiad|competition|student exchange|youth programme|youth program|student opportunity)\b", re.I)
EXAM_WORDS = re.compile(r"\b(exam|examination|board|cbse|icse|isc|ncert|neet|jee|cuet|entrance test|syllabus|assessment)\b", re.I)
EDU_WORDS = re.compile(r"\b(education|school|student|students|university|universities|college|classroom|teacher|learning|curriculum|academic|skill development|literacy)\b", re.I)
SCI_WORDS = re.compile(r"\b(science|research|space|isro|biology|physics|chemistry|climate|environment)\b", re.I)
TECH_WORDS = re.compile(r"\b(technology|artificial intelligence|\bAI\b|cyber|digital|innovation|robotics|software)\b", re.I)

def text_of(node, names):
    for name in names:
        found = node.find(name)
        if found is not None and found.text:
            return found.text.strip()
    return ""

def clean_text(value):
    value = re.sub(r"<[^>]+>", " ", value or "")
    return re.sub(r"\s+", " ", value).strip()

def parse_date(value):
    if not value:
        return None
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        try:
            parsed = parsedate_to_datetime(value)
        except (TypeError, ValueError, OverflowError):
            return None
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    return parsed.astimezone(timezone.utc)

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
    items = root.findall(".//item") or root.findall(".//{http://www.w3.org/2005/Atom}entry")
    found = []
    allowed = {"Education", "Examinations", "Admissions", "Results", "Scholarships",
               "Student Opportunities", "Science", "Technology"}
    cutoff = datetime.now(timezone.utc) - timedelta(days=MAX_AGE_DAYS)
    for item in items[:MAX_PER_SOURCE]:
        title = clean_text(text_of(item, ["title", "{http://www.w3.org/2005/Atom}title"]))
        url = text_of(item, ["link"])
        if not url:
            link = item.find("{http://www.w3.org/2005/Atom}link")
            url = link.attrib.get("href", "") if link is not None else ""
        summary = clean_text(text_of(item, ["description", "summary",
            "{http://www.w3.org/2005/Atom}summary"]))
        published_raw = text_of(item, ["pubDate", "published", "updated",
            "{http://www.w3.org/2005/Atom}published",
            "{http://www.w3.org/2005/Atom}updated"])
        published = parse_date(published_raw)
        if not title or not url.startswith("https://"):
            continue
        if published and published < cutoff:
            continue
        if not source.get("summary_allowed", False):
            summary = ""
        category = classify(title, summary)
        if source.get("education_only", True) and category not in allowed:
            continue
        key = hashlib.sha256(url.split("#")[0].encode()).hexdigest()[:18]
        found.append({
            "id": key, "source_title": title[:240], "title": title[:240],
            "summary_input": summary[:1800], "url": url,
            "source": source["name"], "category": category,
            "published": published.isoformat() if published else ""
        })
    return found

def generate_report(item, api_key):
    endpoint = (f"https://generativelanguage.googleapis.com/v1beta/models/"
                f"{GEMINI_MODEL}:generateContent?key={api_key}")
    prompt = {
        "task": "Write a concise, independent education-news brief from the supplied permitted official feed metadata.",
        "rules": [
            "Use only facts explicitly present in the supplied headline and feed summary.",
            "Do not add background, assumptions, inferred causes, advice, quotes, names, figures, dates or eligibility details not present in the metadata.",
            "Do not imitate the publisher's style or reproduce its wording.",
            "If the metadata is thin, write only one short paragraph and explicitly state that the feed item provides limited detail. Never pad the report.",
            "Write a fresh, neutral headline that preserves the exact meaning.",
            "Write a homepage summary of at most two sentences.",
            "Write one to three short factual paragraphs for the internal article page.",
            "No external URLs, calls to action, markdown, promotional language or invented context.",
            "Return valid JSON with exactly these keys: headline, summary, body. body must be an array of paragraph strings."
        ],
        "source_metadata": {
            "publisher": item["source"],
            "original_headline": item["source_title"],
            "feed_summary": item["summary_input"],
            "published": item["published"],
            "category": item["category"]
        }
    }
    payload = {
        "contents": [{"parts": [{"text": json.dumps(prompt, ensure_ascii=False)}]}],
        "generationConfig": {"responseMimeType": "application/json", "temperature": 0.1}
    }
    req = urllib.request.Request(endpoint, data=json.dumps(payload).encode(),
        headers={"Content-Type": "application/json", "User-Agent": USER_AGENT})
    with urllib.request.urlopen(req, timeout=45) as response:
        result = json.loads(response.read())
    response_text = result["candidates"][0]["content"]["parts"][0]["text"]
    data = json.loads(response_text)
    headline = str(data.get("headline", "")).strip()
    summary = str(data.get("summary", "")).strip()
    body = data.get("body", [])
    if not headline or not summary or not isinstance(body, list) or not body:
        raise ValueError("AI report missing required fields")
    paragraphs = [str(p).strip()[:1000] for p in body[:3] if str(p).strip()]
    if not paragraphs:
        raise ValueError("AI report has no usable paragraphs")
    item["title"] = headline[:240]
    item["summary"] = summary[:500]
    item["body"] = paragraphs
    item["report_status"] = "ai_generated_from_permitted_official_feed_metadata"
    item.pop("summary_input", None)
    return item

def main():
    api_key = os.getenv("GEMINI_API_KEY", "").strip()
    if not api_key:
        raise SystemExit("GEMINI_API_KEY is missing from GitHub Actions secrets.")

    previous = {}
    if OUT.exists():
        try:
            previous = json.loads(OUT.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            previous = {}
    old_articles = previous.get("articles", [])
    known_ids = {str(a.get("id")) for a in old_articles if a.get("id")}
    fetched = []
    attempted_ids = set()

    for source in SOURCES:
        if not source.get("enabled", False):
            continue
        if not source.get("commercial_use_permitted", False):
            print("SKIP:", source["name"], "- commercial reuse not cleared")
            continue
        if not source.get("feed_url"):
            continue
        try:
            request = urllib.request.Request(source["feed_url"], headers={
                "User-Agent": USER_AGENT,
                "Accept": "application/rss+xml, application/atom+xml, application/xml, text/xml"
            })
            with urllib.request.urlopen(request, timeout=20) as response:
                payload = response.read(1_500_000)
            for item in parse_feed(payload, source):
                if item["id"] in known_ids or item["id"] in attempted_ids:
                    continue
                if len(fetched) >= MAX_NEW_PER_RUN:
                    break
                attempted_ids.add(item["id"])
                try:
                    fetched.append(generate_report(item, api_key))
                    print("REPORT CREATED:", source["name"], item["id"])
                except Exception as error:
                    print("REPORT FAILED:", source["name"], type(error).__name__, "- skipped")
                time.sleep(1.0)
            print("FEED CHECKED:", source["name"])
        except urllib.error.HTTPError as error:
            print("FEED HTTP ERROR:", source["name"], error.code, "- skipped")
        except Exception as error:
            print("FEED ERROR:", source["name"], type(error).__name__, "- skipped")
        if len(fetched) >= MAX_NEW_PER_RUN:
            break
        time.sleep(1.0)

    if not fetched:
        print("No new eligible stories. Existing edition retained.")
        return

    merged = {
        str(item.get("id") or hashlib.sha256(item.get("url", "").encode()).hexdigest()[:18]): item
        for item in old_articles
    }
    for item in fetched:
        merged[item["id"]] = item
    articles = sorted(merged.values(),
        key=lambda item: item.get("published") or "", reverse=True)[:MAX_TOTAL]
    result = {
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "count": len(articles),
        "articles": articles
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print("EDITION UPDATED:", len(fetched), "new stories;", len(articles), "total.")

if __name__ == "__main__":
    main()
