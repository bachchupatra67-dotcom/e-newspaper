#!/usr/bin/env python3
"""Collect permitted education RSS/Atom feeds and create independent reports with Gemini."""
import json, re, time, hashlib, os, urllib.request, urllib.error
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime
from pathlib import Path
from xml.etree import ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
SOURCES = json.loads((ROOT / "config/sources.json").read_text(encoding="utf-8"))
OUT = ROOT / "data/news.json"
MAX_PER_SOURCE, MAX_TOTAL, MAX_NEW = 25, 180, 30
USER_AGENT = "LatestNewspaperBot/2.0 (+https://github.com/bachchupatra67-dotcom/e-newspaper)"
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

def normalise_date(value):
    if not value: return ""
    try: parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        try: parsed = parsedate_to_datetime(value)
        except (TypeError, ValueError, OverflowError): return ""
    if parsed.tzinfo is None: parsed = parsed.replace(tzinfo=timezone.utc)
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
    items = root.findall(".//item") or root.findall(".//{http://www.w3.org/2005/Atom}entry")
    found = []
    for item in items[:MAX_PER_SOURCE]:
        title = clean_text(text_of(item, ["title", "{http://www.w3.org/2005/Atom}title"]))
        url = text_of(item, ["link"])
        if not url:
            link = item.find("{http://www.w3.org/2005/Atom}link")
            url = link.attrib.get("href", "") if link is not None else ""
        summary = clean_text(text_of(item, ["description", "summary", "{http://www.w3.org/2005/Atom}summary"]))
        published_raw = text_of(item, ["pubDate", "published", "updated", "{http://www.w3.org/2005/Atom}published", "{http://www.w3.org/2005/Atom}updated"])
        if not title or not url.startswith("https://"): continue
        if not source.get("summary_allowed", False): summary = ""
        category = classify(title, summary)
        allowed = ("Education","Examinations","Admissions","Results","Scholarships","Student Opportunities","Science","Technology")
        if source.get("education_only") and category not in allowed: continue
        key = hashlib.sha256(url.split("#")[0].encode()).hexdigest()[:18]
        found.append({"id":key,"source_title":title[:240],"title":title[:240],"summary_input":summary[:1800],
                      "url":url,"source":source["name"],"category":category,"published":normalise_date(published_raw)})
    return found

def generate_report(item, api_key):
    """Generate only from feed facts; no source article is fetched or copied."""
    endpoint = f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent?key={api_key}"
    prompt = {
      "task":"Act as an independent education-news desk. Create an original report from the supplied feed metadata only.",
      "rules":[
        "Do not reproduce or imitate a publisher's wording or article structure.",
        "Do not invent facts, dates, figures, quotes, causes, names, eligibility rules or outcomes.",
        "Use only facts explicitly present in the supplied title and permitted feed summary.",
        "If the metadata is too thin for a detailed report, say so plainly and write a brief factual report; never fill gaps with guesses.",
        "Rewrite the headline in fresh neutral language, without changing its meaning.",
        "Write a 1-2 sentence homepage summary and 3-5 short paragraphs for the internal detailed page.",
        "No external URLs, no calls to action to visit another website, no markdown, no promotional language.",
        "Return valid JSON with exactly: headline, summary, body (array of paragraph strings)."
      ],
      "source_metadata":{"publisher":item["source"],"original_headline":item["source_title"],"feed_summary":item["summary_input"],"published":item["published"],"category":item["category"]}
    }
    payload={"contents":[{"parts":[{"text":json.dumps(prompt,ensure_ascii=False)}]}],
             "generationConfig":{"responseMimeType":"application/json","temperature":0.2}}
    req=urllib.request.Request(endpoint,data=json.dumps(payload).encode(),headers={"Content-Type":"application/json","User-Agent":USER_AGENT})
    with urllib.request.urlopen(req,timeout=45) as response: result=json.loads(response.read())
    text=result["candidates"][0]["content"]["parts"][0]["text"]
    data=json.loads(text)
    headline=str(data.get("headline","")).strip()
    summary=str(data.get("summary","")).strip()
    body=data.get("body",[])
    if not headline or not summary or not isinstance(body,list) or not body:
        raise ValueError("AI report did not contain required fields")
    item["title"]=headline[:240]
    item["summary"]=summary[:650]
    item["body"]=[str(p).strip()[:1400] for p in body[:5] if str(p).strip()]
    item["report_status"]="ai_generated_from_permitted_feed_metadata"
    item.pop("summary_input",None)
    return item

def main():
    api_key=os.getenv("GEMINI_API_KEY","").strip()
    if not api_key:
        raise SystemExit("GEMINI_API_KEY is missing. Add it as a GitHub Actions repository secret.")
    fetched, seen = [], set()
    for source in SOURCES:
        if not source.get("enabled",False): continue
        if not source.get("commercial_use_permitted",False):
            print("SKIP:",source["name"],"- source not explicitly cleared for commercial use")
            continue
        try:
            request=urllib.request.Request(source["feed_url"],headers={"User-Agent":USER_AGENT,"Accept":"application/rss+xml, application/atom+xml, application/xml, text/xml"})
            with urllib.request.urlopen(request,timeout=18) as response: payload=response.read(2_500_000)
            for item in parse_feed(payload,source):
                if item["id"] in seen: continue
                seen.add(item["id"])
                try:
                    fetched.append(generate_report(item,api_key))
                    print("REPORT:",item["source"],item["title"])
                    time.sleep(1.2)
                except Exception as error:
                    print("AI REPORT FAILED:",item["source"],type(error).__name__,"- item skipped")
            print("FEED OK:",source["name"])
        except urllib.error.HTTPError as error:
            print("HTTP",error.code,source["name"],"- skipped; no bypass attempted")
        except Exception as error:
            print("FEED WARN:",source["name"],type(error).__name__,"- skipped")
        time.sleep(2)

    previous={}
    if OUT.exists():
        try: previous=json.loads(OUT.read_text(encoding="utf-8"))
        except Exception: pass
    if not fetched:
        print("No permitted, successfully summarised stories. Existing edition retained.")
        return
    merged={item.get("id") or hashlib.sha256(item.get("url","").encode()).hexdigest()[:18]:item
            for item in previous.get("articles",[])}
    for item in fetched: merged[item["id"]]=item
    articles=sorted(merged.values(),key=lambda x:x.get("published") or "",reverse=True)[:MAX_TOTAL]
    if articles==previous.get("articles",[]): print("No changes to publish."); return
    result={"updated_at":datetime.now(timezone.utc).isoformat(),"count":len(articles),"articles":articles}
    OUT.parent.mkdir(parents=True,exist_ok=True)
    OUT.write_text(json.dumps(result,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    print("Published",len(articles),"stories with internal reports.")

if __name__=="__main__": main()
