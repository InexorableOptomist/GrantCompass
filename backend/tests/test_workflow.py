from fastapi.testclient import TestClient

from app.db import SessionLocal
from app.main import app
from app.models import User


def test_local_profile_to_funding_tracker_and_delete():
    with TestClient(app) as client:
        created = client.post('/users', json={'full_name': 'Sample Student', 'email': 'sample@example.com'})
        assert created.status_code == 200
        user_id = created.json()['id']
        with SessionLocal() as db:
            stored_user = db.get(User, user_id)
            assert 'Sample Student' not in stored_user.full_name_enc
            assert 'sample@example.com' not in stored_user.email_enc

        upload = client.post(
            '/ingestion/upload',
            data={'user_id': str(user_id)},
            files={'file': ('resume.md', b'GPA: 3.8\nPython\nAward: Regional science award\nNorth Valley College', 'text/markdown')},
        )
        assert upload.status_code == 200
        assert upload.json()['source_type'] == 'resume_md'

        sheet = client.get(f'/ingestion/fact-sheet/{user_id}')
        assert sheet.status_code == 200
        assert sheet.json()['academics']['gpa'] == 3.8
        assert 'python' in sheet.json()['skills']['normalized']

        saved = client.post('/narrative/backstory', json={
            'user_id': user_id,
            'prompt_key': 'motivation',
            'response': 'I want to study environmental science.',
        })
        assert saved.status_code == 200
        draft = client.post('/narrative/generate', json={
            'user_id': user_id,
            'artifact_type': 'essay',
            'opportunity_name': 'Example Award',
            'word_target': 200,
        })
        assert draft.status_code == 200
        assert draft.json()['audit']['is_ai_review'] is False
        assert draft.json()['content']

        for artifact_type in ('resume', 'cv'):
            generated = client.post('/narrative/generate', json={
                'user_id': user_id,
                'artifact_type': artifact_type,
                'opportunity_name': 'Example Award',
            })
            assert generated.status_code == 200
            assert 'EDUCATION' in generated.json()['content']
        revised_audit = client.post('/narrative/audit', json={
            'user_id': user_id,
            'artifact_type': 'essay',
            'content': 'This is an edited draft with a verified personal example and enough context to review.',
        })
        assert revised_audit.status_code == 200
        assert revised_audit.json()['audit']['is_ai_review'] is False

        matches = client.get(f'/grants/match/{user_id}')
        assert matches.status_code == 200
        assert matches.json()['items']
        grant_id = matches.json()['items'][0]['id']
        application = client.post('/applications', json={'user_id': user_id, 'grant_id': grant_id})
        assert application.status_code == 200
        application_id = application.json()['id']

        updated = client.put(
            f'/applications/{application_id}/status',
            json={'status': 'in_progress'},
        )
        assert updated.status_code == 200
        assert updated.json()['status'] == 'in_progress'

        deleted = client.delete(f'/users/{user_id}')
        assert deleted.status_code == 204
        assert client.get(f'/users/{user_id}').status_code == 404


def test_upload_rejects_unsupported_and_invalid_files():
    with TestClient(app) as client:
        created = client.post('/users', json={'full_name': 'Another Student', 'email': 'another@example.com'})
        user_id = created.json()['id']
        unsupported = client.post(
            '/ingestion/upload',
            data={'user_id': str(user_id)},
            files={'file': ('resume.exe', b'not a resume', 'application/octet-stream')},
        )
        assert unsupported.status_code == 400
        invalid_pdf = client.post(
            '/ingestion/upload',
            data={'user_id': str(user_id)},
            files={'file': ('resume.pdf', b'not a pdf', 'application/pdf')},
        )
        assert invalid_pdf.status_code == 400
        client.delete(f'/users/{user_id}')
