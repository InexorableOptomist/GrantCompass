import re
from collections import Counter
from typing import Any

GPA_RE = re.compile(r'\bGPA\s*[:\-]?\s*(\d(?:\.\d{1,2})?)\b', re.IGNORECASE)
EMAIL_RE = re.compile(r'[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+')
SKILL_HINTS = {
    'python', 'javascript', 'typescript', 'react', 'fastapi', 'sql', 'java', 'c++',
    'excel', 'nlp', 'leadership', 'research', 'tutoring', 'volunteering',
}
AWARD_RE = re.compile(
    r"\b(award|scholarship|honor|honour|dean'?s list|winner|fellowship|medal|finalist)\b",
    re.IGNORECASE,
)
EDUCATION_RE = re.compile(r'\b(university|college|high school|academy|institute|school)\b', re.IGNORECASE)
MAX_ITEMS = 10
MAX_LINE_LENGTH = 200


def _matching_lines(lines: list[str], pattern: re.Pattern[str]) -> list[str]:
    result: list[str] = []
    for line in lines:
        candidate = line[:MAX_LINE_LENGTH]
        if pattern.search(line) and candidate not in result:
            result.append(candidate)
        if len(result) >= MAX_ITEMS:
            break
    return result


def extract_resume_facts(text: str) -> dict[str, Any]:
    gpa_match = GPA_RE.search(text)
    lines = [line.strip() for line in text.splitlines() if line.strip()]
    words = re.findall(r'[a-z+#.]{2,}', text.lower())
    counts = Counter(word.rstrip('.') for word in words if word.rstrip('.') in SKILL_HINTS)
    return {
        'gpa': float(gpa_match.group(1)) if gpa_match else None,
        'emails_found': sorted(set(EMAIL_RE.findall(text))),
        'skills': [skill for skill, _ in counts.most_common(20)],
        'awards': _matching_lines(lines, AWARD_RE),
        'education': _matching_lines(lines, EDUCATION_RE),
    }


def synthesize_fact_sheet(
    user_id: int,
    identity: dict[str, str],
    resume_docs: list[str],
    supplemental_docs: list[str],
    github_snapshot: dict[str, Any] | None,
    backstory: dict[str, str],
) -> dict[str, Any]:
    combined = '\n\n'.join(resume_docs + supplemental_docs).strip()
    facts = extract_resume_facts(combined) if combined else {}
    skills = set(facts.get('skills', []))
    repos: list[dict[str, Any]] = []
    github_source = None
    if github_snapshot:
        github_source = github_snapshot.get('source')
        repos = github_snapshot.get('repos', [])[:MAX_ITEMS]
        if github_source == 'github':
            skills.update(language.lower() for language in github_snapshot.get('languages', {}))
    return {
        'user_id': user_id,
        'identity': {'full_name': identity.get('full_name', ''), 'email': identity.get('email', '')},
        'academics': {'gpa': facts.get('gpa'), 'education': facts.get('education', [])},
        'experience': {'repos': repos},
        'skills': {'normalized': sorted(skills)},
        'awards': {'detected': facts.get('awards', [])},
        'narrative_hooks': {'entries': backstory},
        'provenance': {
            'resume_docs': len(resume_docs),
            'supplemental_docs': len(supplemental_docs),
            'github_source': github_source,
            'backstory_entries': len(backstory),
        },
    }
