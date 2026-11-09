from typing import Any


def build_artifact(fact_sheet: dict[str, Any], artifact_type: str, opportunity: str, word_target: int) -> str:
    identity = fact_sheet.get('identity', {})
    name = identity.get('full_name') or 'Applicant'
    skills = fact_sheet.get('skills', {}).get('normalized', [])
    entries = fact_sheet.get('narrative_hooks', {}).get('entries', {})
    awards = fact_sheet.get('awards', {}).get('detected', [])
    education = fact_sheet.get('academics', {}).get('education', [])
    hook = next(iter(entries.values()), '')
    skills_text = ', '.join(skills[:6]) or 'curiosity, persistence, and a commitment to learning'
    factual_lines = '\n'.join(f'- {item}' for item in awards[:5] + education[:5])

    if artifact_type in {'resume', 'cv'}:
        sections = [
            name,
            identity.get('email', ''),
            '',
            'EDUCATION',
            *(education or ['[Add school, program, and dates]']),
            '',
            'SKILLS',
            skills_text,
            '',
            'AWARDS AND RECOGNITION',
            *(awards or ['[Add verified awards or remove this section]']),
        ]
        repos = fact_sheet.get('experience', {}).get('repos', [])
        if repos:
            sections.extend(['', 'PROJECTS'])
            for repo in repos[:10]:
                details = [repo.get('name', 'Project')]
                if repo.get('language'):
                    details.append(repo['language'])
                if repo.get('description'):
                    details.append(repo['description'])
                sections.append(' | '.join(details))
        if artifact_type == 'cv':
            sections.extend(['', 'PROFILE', hook or '[Add a concise, factual academic profile]'])
        return '\n'.join(sections)

    if artifact_type == 'resume_summary':
        return (
            f'{name} brings experience in {skills_text}. '
            'This summary is a draft based only on the information supplied in GrantCompass.'
        )
    if artifact_type == 'cover_letter':
        return (
            f'Dear Scholarship Committee,\n\n'
            f'I am applying for {opportunity}. My background includes {skills_text}. '
            f'{hook}\n\nThank you for considering my application.\n\nSincerely,\n{name}'
        )
    draft = (
        f'My education is an important step toward the future I am working to build. '
        f'{hook}\n\n'
        f'Through my experiences, I have developed skills in {skills_text}. '
        f'I hope to use those skills to contribute to my education and community.\n\n'
        f'Support from {opportunity} would help me focus on my studies and make progress toward my goals. '
        'I would use this opportunity thoughtfully and continue building on the work I have already begun.'
    )
    if factual_lines:
        draft += f'\n\nDetails from my profile to verify before use:\n{factual_lines}'
    return ' '.join(draft.split()[:word_target])


def audit_artifact(content: str, fact_sheet: dict[str, Any], artifact_type: str) -> dict[str, Any]:
    """Deterministic checklist; this is not an AI reviewer or guarantee of truth."""
    concerns: list[dict[str, str]] = []
    if not content.strip():
        concerns.append({'severity': 'high', 'message': 'Draft is empty.'})
    known_terms = set(fact_sheet.get('skills', {}).get('normalized', []))
    known_terms.update(fact_sheet.get('awards', {}).get('detected', []))
    known_terms.update(fact_sheet.get('academics', {}).get('education', []))
    for phrase in ('top 1%', 'nationally recognized', 'first-generation', 'financial hardship'):
        if phrase in content.lower() and not any(phrase in str(item).lower() for item in known_terms):
            concerns.append({
                'severity': 'medium',
                'message': f'Verify the claim "{phrase}" against your source documents.',
            })
    if '[add ' in content.lower():
        concerns.append({'severity': 'medium', 'message': 'Replace or remove every bracketed placeholder before using this draft.'})
    if artifact_type in {'essay', 'cover_letter'} and not fact_sheet.get('narrative_hooks', {}).get('entries'):
        concerns.append({'severity': 'medium', 'message': 'Add a specific personal example to make this draft distinctive.'})
    if len(content.split()) < 50:
        concerns.append({'severity': 'low', 'message': 'Draft is short; check the opportunity prompt and word limit.'})
    return {
        'status': 'needs_review' if concerns else 'checklist_clear',
        'is_ai_review': False,
        'notice': 'Automated checks cannot verify truth or guarantee compliance. Review every statement yourself.',
        'concerns': concerns,
    }
