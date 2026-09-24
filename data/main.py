# pip install pydantic python-dotenv openai requestsi 
import json
import os
import time

import requests
from pydantic import BaseModel, Field
from dotenv import load_dotenv
from openai import OpenAI


# =========================
# Load environment variables
# =========================

load_dotenv()


# =========================
# OpenAI-compatible Gemini client
# =========================

client = OpenAI(
    base_url="https://generativelanguage.googleapis.com/v1beta/openai/"
)


# =========================
# Pydantic schemas
# =========================

class ConferenceDeadline(BaseModel):
    name: str = Field(
        description=(
            "The name of the deadline, such as 'Paper Submission', "
            "'Abstract Submission', 'Notification', or 'Camera Ready'. "
            "Extract it from the label or surrounding text associated with the date."
        )
    )

    date: str = Field(
        description=(
            "The deadline date in ISO 8601 format YYYY-MM-DD. "
            "Extract the date corresponding to this deadline from the conference page."
        )
    )


class ExtractedDeadlineData(BaseModel):
    deadlines: list[ConferenceDeadline] = Field(
        description=(
            "A list of important conference deadlines. "
            "Extract each deadline name and its corresponding date from sections "
            "such as Important Dates, Call for Papers, or Submission Deadlines."
        )
    )


class ExtractedConferenceInfo(BaseModel):
    full_name: str | None = Field(
        default=None,
        description=(
            "The full official name of the conference. "
            "Extract the expanded conference name from the webpage, not only its acronym. "
            "For example, if the conference is 'ATC 2026', return the complete official "
            "conference title if it is explicitly provided on the page. "
            "Do not invent or expand an acronym using outside knowledge. "
            "Return null if the full official name cannot be determined from the page."
        )
    )

    summarization: str | None = Field(
        default=None,
        description=(
            "A concise summary of the conference in 2-4 sentences. "
            "Summarize the conference's main research areas, topics, objectives, "
            "and intended audience based only on information explicitly provided "
            "on the webpage. "
            "Mention notable themes or focus areas if available. "
            "Do not include unsupported information or invent details. "
            "Return null if there is not enough information on the page."
        )
    )

    location: str | None = Field(
        default=None,
        description=(
            "The physical location where the conference will be held. "
            "Extract the venue, city, and country when available. "
            "For example: 'Quy Nhon, Vietnam' or "
            "'International Centre for Interdisciplinary Science and Education, "
            "Quy Nhon, Vietnam'. "
            "Use the conference venue, not the organizer's address. "
            "Do not invent or infer unsupported location information. "
            "Return null if the location is not provided on the page."
        )
    )

    date_happen: str | None = Field(
        default=None,
        description=(
        "The date or date range when the conference will take place. "
        "Extract the official conference event date from the webpage. "
        "If the conference lasts multiple days, return the date range in the format "
        "'YYYY-MM-DD to YYYY-MM-DD'. "
        "If it takes place on a single day, return the date in ISO 8601 format YYYY-MM-DD. "
        "Do not confuse conference dates with submission, notification, registration, "
        "or camera-ready deadlines. "
        "Do not invent missing dates."
        )
    )


# =========================
# Config
# =========================

DATA_DIR = "data"

INPUT_FILE = "conferences.json"
OUTPUT_FILE = os.path.join(
    DATA_DIR,
    "conference_data.json"
)

RATE_LIMIT_SECONDS = 15

REQUEST_TIMEOUT = 30


# =========================
# Create data directory
# =========================

os.makedirs(
    DATA_DIR,
    exist_ok=True,
)


# =========================
# HTTP session
# =========================

session = requests.Session()

session.headers.update({
    "User-Agent": (
        "Mozilla/5.0 "
        "(Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 "
        "(KHTML, like Gecko) "
        "Chrome/120.0 Safari/537.36"
    )
})


# =========================
# HTML cache
# =========================

html_cache = {}


def get_html(url):
    """
    Download webpage HTML.

    If the same URL has already been downloaded,
    return the cached HTML instead of requesting it again.
    """

    if not url:
        return None

    if url in html_cache:
        print(f"Using cached HTML: {url}")
        return html_cache[url]

    print(f"Downloading: {url}")

    response = session.get(
        url,
        timeout=REQUEST_TIMEOUT,
    )

    response.raise_for_status()

    html = response.text

    html_cache[url] = html

    print(
        f"Downloaded {len(html)} characters"
    )

    return html


# =========================
# Extract conference information
# from website_url
# =========================

def extract_conference_info(html):
    llm_response = client.beta.chat.completions.parse(
        model="gemini-3.5-flash-lite",
        messages=[
            {
                "role": "system",
                "content": """
Extract general information about the academic conference from the provided webpage.

This webpage is the conference's main website.

Extract:
1. The full official conference name.
2. A concise summary of the conference.
3. The physical conference location.
4. The official date or date range when the conference takes place.

Rules:
- Only use information explicitly supported by the webpage.
- Do not use outside knowledge.
- Do not invent missing information.
- The full_name must be the expanded official conference title when available.
- Do not guess the expansion of an acronym.
- The summarization should be 2-4 concise sentences.
- The summarization should focus on research areas, topics, objectives,
  themes, and intended audience.
- The location should describe where the conference itself is held.
- Do not confuse the organizer's address with the conference location.
- Include venue, city, and country when they are available.
- The date_happen must describe the actual date or date range when the conference takes place.
- If the conference lasts multiple days, use the format 'YYYY-MM-DD to YYYY-MM-DD'.
- If the conference lasts only one day, use the format 'YYYY-MM-DD'.
- Do not confuse the conference event date with submission, notification,
  registration, or camera-ready deadlines.
- Return null for a field when the webpage does not provide enough
  information to determine it reliably.
""",
            },
            {
                "role": "user",
                "content": html,
            },
        ],
        response_format=ExtractedConferenceInfo,
    )

    return llm_response.choices[0].message.parsed


# =========================
# Extract deadlines
# from deadline_url
# =========================

def extract_deadlines(html):
    llm_response = client.beta.chat.completions.parse(
        model="gemini-3.5-flash-lite",
        messages=[
            {
                "role": "system",
                "content": """
Extract conference deadline information from the provided webpage.

This webpage is used specifically as the deadline source.

Rules:
- Only use information explicitly supported by the webpage.
- Prefer deadlines for the main conference track.
- Ignore workshop deadlines unless the webpage itself is specifically
  for a workshop.
- Extract all clearly stated important deadlines.
- Examples include:
  - Abstract Submission
  - Paper Submission
  - Full Paper Submission
  - Notification
  - Acceptance Notification
  - Camera Ready
  - Author Registration
- Convert dates to ISO 8601 format YYYY-MM-DD.
- Do not invent missing dates.
- If a deadline has been extended, use the newest explicitly stated
  valid deadline.
- Ignore conference event dates unless they are explicitly described
  as submission-related deadlines.
""",
            },
            {
                "role": "user",
                "content": html,
            },
        ],
        response_format=ExtractedDeadlineData,
    )

    return llm_response.choices[0].message.parsed


# =========================
# Load conferences
# =========================

with open(
    INPUT_FILE,
    "r",
    encoding="utf-8",
) as f:
    conferences = json.load(f)


results = []


# =========================
# Crawl conferences
# =========================

for index, conference in enumerate(
    conferences,
    start=1,
):

    print()
    print("=" * 70)
    print(
        f"[{index}/{len(conferences)}] "
        f"Processing: {conference['name']}"
    )
    print("=" * 70)

    website_url = conference.get(
        "website_url"
    )

    deadline_url = conference.get(
        "deadline_url"
    )

    # Nếu deadline_url không có,
    # fallback sang website_url
    if not deadline_url:
        deadline_url = website_url

    print(
        f"Website URL : {website_url}"
    )

    print(
        f"Deadline URL: {deadline_url}"
    )


    # =========================
    # Default values
    # =========================

    full_name = None
    summarization = None
    location = None
    date_happen = None
    deadlines = []


    # =========================
    # 1. Website URL
    #
    # Extract:
    # - full_name
    # - summarization
    # - location
    # =========================

    try:
        print()
        print(
            "[Website] Extracting conference information..."
        )

        website_html = get_html(
            website_url
        )

        if website_html:
            info = extract_conference_info(
                website_html
            )

            full_name = info.full_name
            summarization = info.summarization
            location = info.location
            date_happen = info.date_happen

            print(
                f"Full name: {full_name}"
            )

            print(
                f"Location: {location}"
            )

            print(
                f"Date happen: {date_happen}"
            )

            print(
                f"Summary: {summarization}"
            )

    except requests.RequestException as e:
        print(
            f"[Website] Crawl error: {e}"
        )

    except Exception as e:
        print(
            f"[Website] LLM / Processing error: {e}"
        )


    # =========================
    # Rate limit between
    # the two LLM requests
    # =========================

    print(
        f"Waiting {RATE_LIMIT_SECONDS} seconds "
        "before deadline extraction..."
    )

    time.sleep(
        RATE_LIMIT_SECONDS
    )


    # =========================
    # 2. Deadline URL
    #
    # Extract:
    # - deadlines
    # =========================

    try:
        print()
        print(
            "[Deadline] Extracting deadlines..."
        )

        deadline_html = get_html(
            deadline_url
        )

        if deadline_html:
            deadline_data = extract_deadlines(
                deadline_html
            )

            deadlines = [
                deadline.model_dump()
                for deadline
                in deadline_data.deadlines
            ]

            print(
                f"Found {len(deadlines)} deadlines:"
            )

            for deadline in deadline_data.deadlines:
                print(
                    f"  - {deadline.name}: "
                    f"{deadline.date}"
                )

    except requests.RequestException as e:
        print(
            f"[Deadline] Crawl error: {e}"
        )

    except Exception as e:
        print(
            f"[Deadline] LLM / Processing error: {e}"
        )


    # =========================
    # Build final result
    # =========================

    result = {
        # Dữ liệu có sẵn
        "name": conference["name"],
        "year": conference["year"],
        "website_url": conference["website_url"],
        "deadline_url": deadline_url,

        # Dữ liệu lấy từ website_url
        "full_name": full_name,
        "summarization": summarization,
        "location": location,
        "date_happen": date_happen,

        # Dữ liệu lấy từ deadline_url
        "deadlines": deadlines,
    }

    results.append(
        result
    )


    # =========================
    # Save after each conference
    # =========================

    with open(
        OUTPUT_FILE,
        "w",
        encoding="utf-8",
    ) as f:

        json.dump(
            results,
            f,
            ensure_ascii=False,
            indent=2,
        )

    print()
    print(
        f"Saved to: {OUTPUT_FILE}"
    )


    # =========================
    # Rate limit before
    # next conference
    # =========================

    if index < len(conferences):

        print(
            f"Waiting {RATE_LIMIT_SECONDS} seconds "
            "before next conference..."
        )

        time.sleep(
            RATE_LIMIT_SECONDS
        )


# =========================
# Finish
# =========================

print()
print("=" * 70)
print("Done!")
print(
    f"Processed: {len(results)} conferences"
)
print(
    f"Output file: {OUTPUT_FILE}"
)