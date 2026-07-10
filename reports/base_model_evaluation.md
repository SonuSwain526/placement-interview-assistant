# Base Model Evaluation Report

**Assignment Step:** Step 5 (required)
**Model:** Qwen2.5-1.5B-Instruct — NO fine-tuning applied
**Purpose:** Establish baseline before any training. This is the reference
point every later stage is measured against.

---

| # | Question | Base Model Answer | Problem |
|---|----------|-------------------|---------|
| 1 | How should I prepare for Amazon SDE-1 placement? | To prepare for the Amazon SDE-1 (Software Development Engineer - Internship) placement, you need to focus on several key areas:  1. **Technical Skills**: Master your technical skil... | Generic DSA advice — no round structure, no LP mention, no priority order |
| 2 | What DSA topics are most important for product company placements? | 1. **Project-Based Learning** (20%): This is a key component of the DSA curriculum, focusing on real-world problem-solving through projects that address industry challenges.  2. **... | Lists all topics equally — no priority, no company-specific guidance |
| 3 | How do I answer Amazon Leadership Principle questions in a bar-raiser round? | To effectively answer Amazon Leadership Principle questions during a bar-raiser event, focus on demonstrating your commitment to innovation and continuous improvement. Highlight ho... | Generic 'use past examples' — no mention of 16 LPs or STAR method |
| 4 | I have a 6.5 CGPA. Can I still get into good companies? | Yes, having a high CGPA (Grade Point Average) is an important factor in getting accepted by many companies. However, it's not the only determining factor.  To answer your question:... | Vague encouragement — no company-specific CGPA cutoffs or next steps |
| 5 | What is the TCS NQT exam pattern and how do I clear it? | The TCS National Qualification Test (NQT) is an entrance examination conducted by Tata Consultancy Services for selecting candidates to join as Software Developers. Here's a brief ... | Generic 'online test + interview' — no section names, no strategy |
| 6 | How do I prepare for Accenture placement in 2 weeks? | To prepare effectively for an Accenture placement, you can follow these steps:  1. **Understand the Job Description**: Before starting your preparation, understand what the job ent... | Generic 'study hard' — no round structure, no timeline |
| 7 | What should I include in my fresher software developer resume? | When creating a fresh software developer resume, it's important to highlight your relevant experience and skills. Here are some key points you can consider:  1. **Objective or Summ... | Generic resume tips — not fresher/placement specific |
| 8 | How do I negotiate my first salary offer letter? | When negotiating a new job offer, it is important to have a clear understanding of your worth as an employee and the company's expectations. Here are some tips for negotiating your... | Generic 'research market rates' — no steps, no Indian context |
| 9 | I have a backlog in 3rd semester. How does it affect my placements? | The backlog in your third semester can significantly impact your placement opportunities, especially if you are pursuing a job during or after university. Here's how:  1. **Resume ... | Vague reassurance — no actual policy or workaround |
| 10 | What should I do in the 30 days before placement season starts? | Before you start your placement season, there are a few things that will help you prepare for what’s to come. The first thing you need to do is create an action plan. Make sure you... | Generic advice — no concrete timeline or placement season context |

---
## Summary
The base model has no awareness of Indian campus placement structures,
company-specific round formats, or domain vocabulary. Every answer is
generic enough to apply to any job search in any country. This confirms
fine-tuning is necessary — the rest of this pipeline exists to fix exactly
these gaps.