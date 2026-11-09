from typing import Any

# Illustrative local examples only; not live offers or verified current opportunities.
GRANTS: list[dict[str, Any]] = [
    {
        'id': 'demo-stem-pathways',
        'name': 'STEM Pathways (Demonstration)',
        'provider': 'GrantCompass sample data',
        'description': 'Illustrative opportunity for students pursuing science or technology.',
        'tags': ['stem', 'technology', 'science'],
        'amount': '$1,000 (example only)',
        'deadline': None,
        'url': None,
        'eligibility': ['Confirm current eligibility with the provider.'],
    },
    {
        'id': 'demo-community-impact',
        'name': 'Community Impact (Demonstration)',
        'provider': 'GrantCompass sample data',
        'description': 'Illustrative opportunity focused on service and community involvement.',
        'tags': ['volunteering', 'leadership', 'community'],
        'amount': '$500 (example only)',
        'deadline': None,
        'url': None,
        'eligibility': ['Confirm current eligibility with the provider.'],
    },
    {
        'id': 'demo-general-education',
        'name': 'General Education (Demonstration)',
        'provider': 'GrantCompass sample data',
        'description': 'Illustrative general-purpose scholarship record for testing the workflow.',
        'tags': ['education', 'research', 'leadership'],
        'amount': 'Example only',
        'deadline': None,
        'url': None,
        'eligibility': ['Confirm current eligibility with the provider.'],
    },
]


def match_grants(profile: dict[str, Any]) -> list[dict[str, Any]]:
    profile_terms = {str(skill).lower() for skill in profile.get('skills', {}).get('normalized', [])}
    profile_terms.update(
        str(value).lower()
        for value in profile.get('narrative_hooks', {}).get('entries', {}).values()
    )
    results = []
    for grant in GRANTS:
        matches = sorted(set(grant['tags']) & profile_terms)
        results.append({
            **grant,
            'match_score': round(100 * len(matches) / max(1, len(grant['tags']))),
            'matched_terms': matches,
            'match_explanation': 'Keyword overlap only; this is not an eligibility determination.',
        })
    return sorted(results, key=lambda grant: grant['match_score'], reverse=True)
