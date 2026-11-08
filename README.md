# GrantCompass 🧭

**Intelligent Funding Opportunity Matcher** - An intelligent web application that analyzes resumes and user profiles to identify and apply for relevant college scholarships and grants.

## Project Vision

GrantCompass streamlines the college funding discovery and application process by:
- Parsing user resumes and credentials
- Analyzing personal/demographic profiles
- Cross-referencing with a curated funding database
- Identifying matching scholarships and grants
- Automating preliminary application submissions

## Project Scope

### Core Features
1. **Resume Parser** - Extract key information (GPA, skills, awards, demographics)
2. **Profile Builder** - Collect user preferences and eligibility criteria
3. **Funding Matcher** - Match user profile against scholarship database
4. **Application Generator** - Pre-fill and track funding applications
5. **Dashboard** - Track matched opportunities and application status

### Tech Stack
- **Frontend**: React/Vue.js (local webapp)
- **Backend**: Python Flask/FastAPI
- **Database**: SQLite (local) or PostgreSQL
- **Resume Processing**: PyPDF2, pdfplumber, or Tesseract OCR
- **Matching Engine**: Simple scoring algorithm or ML-based similarity matching

## Project Viability Assessment

### Why This Project Works
✅ **Personally Useful** - Solves real problem you/others face  
✅ **Low Competitive Risk** - If Alignerr uses concept, execution matters more than idea  
✅ **Portfolio-Worthy** - Demonstrates full-stack skills, NLP/ML, database design  
✅ **Model Testing Ground** - Can experiment with resume parsing, classification, recommendation models  
✅ **Scalable** - Can start simple (rule-based matching), evolve to ML-powered  

### Risks & Mitigations
- **Data Privacy** - Don't store real user data; use anonymized test datasets
- **Funding DB Maintenance** - Use public APIs (e.g., FastWeb, College Board) or start with curated sample data
- **Resume Parsing Complexity** - Start with structured form input; add OCR later
- **Accuracy** - Focus on "discovery" not "automation"; let users review matches

---

## Adversarial Audit: Risk & Threat Assessment

### Threat Model
If Alignerr were to repurpose this concept:

| Threat | Severity | Mitigation |
|--------|----------|-----------|
| **Scaling the matcher** | HIGH | Your implementation demonstrates the core concept; scaling requires domain expertise, partner relationships, funding data access |
| **Stealing the matching algorithm** | MEDIUM | Algorithm is relatively simple (rule-based scoring); your advantage is in user experience and data quality |
| **Competitive MVP** | MEDIUM-HIGH | Alignerr could build similar in 2-4 weeks; differentiate via UX, accuracy, or niche focus |
| **User base capture** | LOW | Requires marketing, trust, and proven matching accuracy |

### Defensive Advantages You Retain
1. **First-mover insights** - You'll learn what matching criteria matter most
2. **User feedback loop** - Real testing data from early users
3. **Integration partnerships** - Relationships with funding databases, schools, or financial aid offices
4. **Brand & trust** - Early adopter loyalty if you build quality
5. **Specialized features** - Post-MVP, add advisory services, live support, or niche targeting (e.g., women in STEM scholarships)

### Recommended Scope Constraints (for Alignerr context)
- **Don't build**: Proprietary funding data, competitor analysis, or pricing algorithms
- **Do build**: Core matching logic, excellent UX, proof-of-concept model testing
- **Focus on**: Resume parsing accuracy, matching quality, user retention

---

## Alternative Project Names (Brainstorm)

| Name | Angle |
|------|-------|
| **GrantCompass** (current) | Navigation/discovery focus |
| **ScholarMatch** | Matching emphasis |
| **FundFinder** | Simple, catchy |
| **CollegeQuest** | Gamification angle |
| **EligibiliTrack** | Eligibility-first approach |
| **OpportUnity** | Optimism + opportunity |
| **ResumePro Scholar** | Resume-centric |
| **GrantGuide** | Advisory/guidance tone |

---

## Getting Started

### Local Development Setup
```bash
# Clone repository
git clone https://github.com/InexorableOptomist/GrantCompass.git
cd GrantCompass

# Install dependencies
pip install -r requirements.txt
npm install

# Run local server
python app.py
# Visit http://localhost:5000
```

### Project Structure
```
GrantCompass/
├── frontend/           # React/Vue webapp
├── backend/            # Flask/FastAPI server
├── models/             # ML models (resume parsing, matching)
├── data/               # Sample funding database, test datasets
├── docs/               # Architecture, API docs, audit reports
└── README.md
```

---

## Success Metrics

- [ ] Parse resume accurately (90%+ extraction accuracy)
- [ ] Match 10+ scholarships per user profile
- [ ] User can view and track matched opportunities
- [ ] Full application flow (create → match → apply → track)
- [ ] Model performance benchmarking complete

---

## Contributing & Sharing

This repository is open for collaboration with Alignerr and the broader community. See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

---

## License

MIT License - See LICENSE file for details

---

**Questions?** Open an issue or reach out. Let's build something useful! 🚀
