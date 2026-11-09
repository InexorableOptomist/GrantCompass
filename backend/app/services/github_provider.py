import re
from collections import Counter
from typing import Any

import httpx

from app.config import settings

USERNAME_RE = re.compile(r'^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$')


class GitHubProvider:
    def get_profile_snapshot(self, username: str) -> dict[str, Any]:
        raise NotImplementedError


class MockGitHubProvider(GitHubProvider):
    def get_profile_snapshot(self, username: str) -> dict[str, Any]:
        return {
            'source': 'mock',
            'username': username,
            'repos': [],
            'languages': {},
        }


class LiveGitHubProvider(GitHubProvider):
    base_url = 'https://api.github.com'

    def get_profile_snapshot(self, username: str) -> dict[str, Any]:
        headers = {'Accept': 'application/vnd.github+json'}
        if settings.github_token:
            headers['Authorization'] = f'Bearer {settings.github_token}'
        try:
            response = httpx.get(
                f'{self.base_url}/users/{username}/repos',
                params={'per_page': 50, 'sort': 'pushed', 'type': 'owner'},
                headers=headers,
                timeout=10.0,
            )
            response.raise_for_status()
            raw_repos = response.json()
        except (httpx.HTTPError, ValueError) as exc:
            raise RuntimeError('GitHub request failed') from exc
        if not isinstance(raw_repos, list):
            raise RuntimeError('GitHub returned an unexpected response')

        repos = [
            {
                'name': str(repo.get('name', ''))[:100],
                'language': repo.get('language'),
                'stars': max(0, int(repo.get('stargazers_count', 0))),
                'topics': [str(topic)[:50] for topic in repo.get('topics', [])[:20]],
                'description': str(repo.get('description') or '')[:200],
            }
            for repo in raw_repos
            if isinstance(repo, dict) and not repo.get('fork')
        ]
        languages = Counter(repo['language'] for repo in repos if repo['language'])
        return {'source': 'github', 'username': username, 'repos': repos, 'languages': dict(languages)}


def get_github_provider() -> GitHubProvider:
    return LiveGitHubProvider() if settings.github_live_enabled else MockGitHubProvider()


def validate_username(username: str) -> str:
    username = username.strip()
    if not USERNAME_RE.fullmatch(username):
        raise ValueError('Invalid GitHub username')
    return username
