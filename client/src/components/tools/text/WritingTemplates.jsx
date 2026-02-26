import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/* ── Template Data ─────────────────────────────────────────────────── */
const TEMPLATES = [
  // ── Email ──
  {
    id: 'email-intro',
    title: 'Professional Introduction',
    category: 'Email',
    description: 'Introduce yourself to a new contact or colleague',
    content: `Subject: Introduction — [Your Name], [Your Role]\n\nDear [Recipient Name],\n\nI hope this message finds you well. My name is [Your Name], and I am the [Your Role] at [Company Name]. I am reaching out because [reason for contact].\n\nI would love the opportunity to [desired outcome, e.g., discuss potential collaboration, learn more about your work]. Please let me know if you have availability for a brief call or meeting.\n\nThank you for your time, and I look forward to hearing from you.\n\nBest regards,\n[Your Name]\n[Your Title]\n[Your Contact Information]`,
    example: `Subject: Introduction — Sarah Chen, Product Manager\n\nDear Mr. Johnson,\n\nI hope this message finds you well. My name is Sarah Chen, and I am the Product Manager at TechFlow Inc. I am reaching out because I was impressed by your keynote at the SaaS Summit last week.\n\nI would love the opportunity to discuss potential collaboration between our teams. Please let me know if you have availability for a brief call or meeting.\n\nThank you for your time, and I look forward to hearing from you.\n\nBest regards,\nSarah Chen\nProduct Manager, TechFlow Inc.\nsarah@techflow.com`,
  },
  {
    id: 'email-meeting',
    title: 'Meeting Request',
    category: 'Email',
    description: 'Request a meeting with clear agenda and time options',
    content: `Subject: Meeting Request — [Topic]\n\nHi [Recipient Name],\n\nI would like to schedule a meeting to discuss [topic/agenda]. Here are a few time slots that work for me:\n\n• [Date & Time Option 1]\n• [Date & Time Option 2]\n• [Date & Time Option 3]\n\nThe meeting should take approximately [duration]. We will cover:\n1. [Agenda item 1]\n2. [Agenda item 2]\n3. [Agenda item 3]\n\nPlease let me know which time works best for you, or suggest an alternative.\n\nBest,\n[Your Name]`,
    example: `Subject: Meeting Request — Q3 Marketing Strategy\n\nHi David,\n\nI would like to schedule a meeting to discuss our Q3 marketing strategy. Here are a few time slots that work for me:\n\n• Tuesday, July 15 at 2:00 PM EST\n• Wednesday, July 16 at 10:00 AM EST\n• Thursday, July 17 at 3:00 PM EST\n\nThe meeting should take approximately 45 minutes. We will cover:\n1. Campaign performance review\n2. Budget allocation for Q3\n3. New channel opportunities\n\nPlease let me know which time works best for you, or suggest an alternative.\n\nBest,\nSarah`,
  },
  {
    id: 'email-followup',
    title: 'Follow-Up After Meeting',
    category: 'Email',
    description: 'Send a professional follow-up after a meeting',
    content: `Subject: Follow-Up — [Meeting Topic]\n\nHi [Recipient Name],\n\nThank you for taking the time to meet with me [today/yesterday/on Date]. I appreciated the discussion about [topic].\n\nAs discussed, here are the key action items:\n• [Action item 1] — Owner: [Name], Due: [Date]\n• [Action item 2] — Owner: [Name], Due: [Date]\n• [Action item 3] — Owner: [Name], Due: [Date]\n\nI will [your next step]. Please don't hesitate to reach out if you have any questions.\n\nBest regards,\n[Your Name]`,
    example: `Subject: Follow-Up — Partnership Discussion\n\nHi Maria,\n\nThank you for taking the time to meet with me today. I appreciated the discussion about the co-marketing partnership.\n\nAs discussed, here are the key action items:\n• Draft partnership proposal — Owner: Sarah, Due: July 20\n• Share audience data — Owner: Maria, Due: July 18\n• Schedule follow-up call — Owner: Sarah, Due: July 25\n\nI will have the proposal draft ready by end of next week. Please don't hesitate to reach out if you have any questions.\n\nBest regards,\nSarah`,
  },
  {
    id: 'email-thankyou',
    title: 'Thank You Note',
    category: 'Email',
    description: 'Express gratitude professionally',
    content: `Subject: Thank You — [Reason]\n\nDear [Recipient Name],\n\nI wanted to take a moment to express my sincere gratitude for [what you are thankful for]. Your [support/guidance/help] with [specific situation] made a significant difference.\n\n[Additional detail about the impact or what it meant to you.]\n\nThank you again for your [generosity/time/expertise]. I truly appreciate it.\n\nWarm regards,\n[Your Name]`,
    example: `Subject: Thank You — Interview Opportunity\n\nDear Ms. Rodriguez,\n\nI wanted to take a moment to express my sincere gratitude for the opportunity to interview for the Senior Developer position. Your insights about the team culture and technical challenges made a significant difference in my understanding of the role.\n\nThe conversation about your microservices migration was particularly inspiring, and I am excited about the possibility of contributing to that effort.\n\nThank you again for your time. I truly appreciate it.\n\nWarm regards,\nAlex Kim`,
  },
  {
    id: 'email-complaint',
    title: 'Complaint / Feedback',
    category: 'Email',
    description: 'Professional complaint or constructive feedback',
    content: `Subject: Feedback Regarding [Product/Service/Issue]\n\nDear [Recipient/Customer Service],\n\nI am writing to bring to your attention an issue I experienced with [product/service] on [date].\n\n[Describe the issue clearly and factually.]\n\nThis has impacted me by [describe impact]. I have already tried [steps taken to resolve].\n\nI would appreciate it if you could [desired resolution]. I believe this feedback can help improve [aspect of service].\n\nThank you for your attention to this matter. I look forward to your response.\n\nSincerely,\n[Your Name]\n[Order/Account Number if applicable]`,
    example: `Subject: Feedback Regarding Order #12345 Delivery\n\nDear Customer Service,\n\nI am writing to bring to your attention an issue I experienced with my recent order delivered on March 15.\n\nThe package arrived with visible damage to the outer box, and the laptop inside had a cracked screen. I have attached photos for reference.\n\nThis has impacted me as I need the laptop for work starting Monday. I have already tried contacting the delivery driver with no response.\n\nI would appreciate it if you could arrange a replacement shipment with expedited delivery. I believe this feedback can help improve packaging standards.\n\nThank you for your attention to this matter. I look forward to your response.\n\nSincerely,\nJames Park\nOrder #12345`,
  },
  // ── Blog ──
  {
    id: 'blog-howto',
    title: 'How-To Guide',
    category: 'Blog',
    description: 'Step-by-step tutorial format',
    content: `# How to [Achieve Goal/Complete Task]\n\n*By [Author Name] | [Date]*\n\n## Introduction\n[Brief overview of what the reader will learn and why it matters.]\n\n## What You'll Need\n- [Prerequisite 1]\n- [Prerequisite 2]\n- [Tool/Resource needed]\n\n## Step 1: [First Step Title]\n[Detailed explanation of the first step. Include tips or warnings.]\n\n## Step 2: [Second Step Title]\n[Detailed explanation. Add images or code snippets where helpful.]\n\n## Step 3: [Third Step Title]\n[Continue with clear, actionable instructions.]\n\n## Common Mistakes to Avoid\n- [Mistake 1 and how to prevent it]\n- [Mistake 2 and how to prevent it]\n\n## Conclusion\n[Summarize what was accomplished. Suggest next steps or related guides.]\n\n---\n*Have questions? Leave a comment below or reach out at [contact].*`,
    example: `# How to Set Up a CI/CD Pipeline with GitHub Actions\n\n*By Sarah Chen | March 2024*\n\n## Introduction\nIn this guide, you'll learn how to set up a complete CI/CD pipeline using GitHub Actions. By the end, your code will automatically test and deploy on every push.\n\n## What You'll Need\n- A GitHub repository\n- Node.js 18+ installed locally\n- A hosting provider (we'll use Vercel)\n\n## Step 1: Create Your Workflow File\nCreate .github/workflows/deploy.yml in your repository root...\n\n## Step 2: Configure Build Steps\nAdd your build and test commands to the workflow...\n\n## Step 3: Set Up Deployment Secrets\nNavigate to Settings > Secrets and add your deployment token...\n\n## Common Mistakes to Avoid\n- Forgetting to set the correct Node.js version\n- Not caching dependencies (slows builds significantly)\n\n## Conclusion\nYou now have a fully automated pipeline. Every push to main will trigger tests and deployment.\n\n---\n*Have questions? Leave a comment below or reach out at sarah@techblog.dev.*`,
  },
  {
    id: 'blog-listicle',
    title: 'Listicle (Top 10)',
    category: 'Blog',
    description: 'Numbered list article format',
    content: `# [Number] [Adjective] [Topic] [Timeframe/Context]\n\n*By [Author Name] | [Date]*\n\n[Hook paragraph — why this list matters to the reader.]\n\n## 1. [Item Title]\n[2-3 sentences explaining this item. Why it's on the list, key benefits.]\n\n## 2. [Item Title]\n[Description with specific details or examples.]\n\n## 3. [Item Title]\n[Description. Include a pro tip or personal experience.]\n\n## 4. [Item Title]\n[Description.]\n\n## 5. [Item Title]\n[Description.]\n\n## 6. [Item Title]\n[Description.]\n\n## 7. [Item Title]\n[Description.]\n\n## 8. [Item Title]\n[Description.]\n\n## 9. [Item Title]\n[Description.]\n\n## 10. [Item Title]\n[Description.]\n\n## Final Thoughts\n[Wrap up with a summary and call to action.]\n\n*What would you add to this list? Share in the comments!*`,
    example: `# 10 Must-Have VS Code Extensions for 2024\n\n*By Alex Kim | January 2024*\n\nWhether you're a beginner or a seasoned developer, these extensions will supercharge your VS Code workflow.\n\n## 1. GitHub Copilot\nAI-powered code completion that learns from your codebase. It's like pair programming with an AI.\n\n## 2. Prettier\nAutomatic code formatting on save. Never argue about tabs vs spaces again.\n\n## 3. ESLint\nCatch bugs and enforce coding standards before they reach production...`,
  },
  {
    id: 'blog-review',
    title: 'Product Review',
    category: 'Blog',
    description: 'Structured product or service review',
    content: `# [Product Name] Review: [Brief Verdict]\n\n*By [Author Name] | [Date] | Rating: [X/10]*\n\n## Quick Summary\n[2-3 sentence overview of the product and your overall impression.]\n\n## What Is [Product Name]?\n[Brief description of the product, its purpose, and target audience.]\n\n## Key Features\n- **[Feature 1]**: [Description]\n- **[Feature 2]**: [Description]\n- **[Feature 3]**: [Description]\n\n## Pros\n✅ [Pro 1]\n✅ [Pro 2]\n✅ [Pro 3]\n\n## Cons\n❌ [Con 1]\n❌ [Con 2]\n\n## Who Is It For?\n[Describe the ideal user/buyer.]\n\n## Pricing\n[Pricing details and value assessment.]\n\n## Verdict\n[Final thoughts and recommendation. Would you recommend it?]\n\n**Rating: [X/10]**`,
    example: `# Sony WH-1000XM5 Review: The King of Noise Cancelling\n\n*By James Park | February 2024 | Rating: 9/10*\n\n## Quick Summary\nSony's flagship headphones deliver exceptional noise cancelling, superb sound quality, and all-day comfort. A worthy upgrade.\n\n## Pros\n✅ Industry-leading ANC\n✅ 30-hour battery life\n✅ Lightweight and comfortable\n\n## Cons\n❌ No folding design\n❌ Premium price tag\n\n**Rating: 9/10**`,
  },
  {
    id: 'blog-opinion',
    title: 'Opinion Piece',
    category: 'Blog',
    description: 'Persuasive opinion or editorial article',
    content: `# [Strong Opinion Statement About Topic]\n\n*By [Author Name] | [Date]*\n\n## The Problem\n[Describe the current situation or common belief you're challenging.]\n\n## My Take\n[State your opinion clearly and confidently.]\n\n## Why I Believe This\n[Argument 1 with evidence or personal experience.]\n\n[Argument 2 with data or examples.]\n\n[Argument 3 — address the strongest counterargument.]\n\n## What Should Change\n[Propose a solution or call to action.]\n\n## Conclusion\n[Restate your position. End with a thought-provoking question or statement.]\n\n*Agree or disagree? I'd love to hear your perspective.*`,
    example: `# Remote Work Isn't the Future — Hybrid Is\n\n*By Sarah Chen | March 2024*\n\n## The Problem\nThe tech industry has swung between two extremes: fully remote and full return-to-office. Neither works for everyone.\n\n## My Take\nHybrid work — 2-3 days in office — is the optimal model for most knowledge workers...`,
  },
  {
    id: 'blog-tutorial',
    title: 'Tutorial',
    category: 'Blog',
    description: 'In-depth technical tutorial with code',
    content: `# [Tutorial Title]: A Complete Guide\n\n*By [Author Name] | [Date] | Difficulty: [Beginner/Intermediate/Advanced]*\n\n## Overview\n[What we're building and what the reader will learn.]\n\n## Prerequisites\n- [Skill/knowledge required]\n- [Software/tools needed]\n- [Version requirements]\n\n## Project Setup\n\`\`\`bash\n[Setup commands]\n\`\`\`\n\n## Step 1: [Foundation]\n[Explanation]\n\n\`\`\`[language]\n[Code snippet]\n\`\`\`\n\n## Step 2: [Core Logic]\n[Explanation]\n\n\`\`\`[language]\n[Code snippet]\n\`\`\`\n\n## Step 3: [Polish & Deploy]\n[Explanation]\n\n## Testing\n[How to verify everything works.]\n\n## Next Steps\n[Suggestions for extending the project.]\n\n## Resources\n- [Link 1]\n- [Link 2]`,
    example: `# Building a Real-Time Chat App with Socket.io: A Complete Guide\n\n*By Alex Kim | March 2024 | Difficulty: Intermediate*\n\n## Overview\nWe'll build a real-time chat application using Node.js, Express, and Socket.io with React on the frontend...`,
  },

  // ── Resume ──
  {
    id: 'resume-summary',
    title: 'Professional Summary',
    category: 'Resume',
    description: 'Compelling resume summary/objective statement',
    content: `[Adjective] [Job Title] with [X+ years] of experience in [key skill areas]. Proven track record of [key achievement with metrics]. Skilled in [skill 1], [skill 2], and [skill 3]. Seeking to leverage expertise in [area] to [desired impact] at [Target Company/Industry].`,
    example: `Results-driven Full-Stack Developer with 6+ years of experience in building scalable web applications. Proven track record of reducing page load times by 40% and increasing user engagement by 25%. Skilled in React, Node.js, and AWS cloud architecture. Seeking to leverage expertise in performance optimization to drive product innovation at a growth-stage SaaS company.`,
  },
  {
    id: 'resume-skills',
    title: 'Skills Section',
    category: 'Resume',
    description: 'Organized skills section with categories',
    content: `## Technical Skills\n\n**Languages**: [Language 1], [Language 2], [Language 3], [Language 4]\n**Frameworks**: [Framework 1], [Framework 2], [Framework 3]\n**Databases**: [DB 1], [DB 2], [DB 3]\n**Tools & Platforms**: [Tool 1], [Tool 2], [Tool 3], [Tool 4]\n**Methodologies**: [Method 1], [Method 2], [Method 3]\n**Soft Skills**: [Skill 1], [Skill 2], [Skill 3]`,
    example: `## Technical Skills\n\n**Languages**: JavaScript, TypeScript, Python, Go\n**Frameworks**: React, Next.js, Express, Django\n**Databases**: PostgreSQL, MongoDB, Redis\n**Tools & Platforms**: AWS, Docker, Kubernetes, GitHub Actions\n**Methodologies**: Agile/Scrum, TDD, CI/CD, Microservices\n**Soft Skills**: Technical Leadership, Cross-team Collaboration, Mentoring`,
  },
  {
    id: 'resume-experience',
    title: 'Work Experience Entry',
    category: 'Resume',
    description: 'Achievement-focused work experience bullet points',
    content: `### [Job Title] | [Company Name]\n*[Start Date] — [End Date] | [Location]*\n\n- [Action verb] [what you did] [using what technology/method], resulting in [quantified impact]\n- [Action verb] [project/initiative] that [outcome with metrics]\n- [Action verb] [responsibility] for [scope], improving [metric] by [percentage/number]\n- Led/Collaborated with [team size/cross-functional teams] to [deliver what]`,
    example: `### Senior Frontend Developer | TechFlow Inc.\n*Jan 2021 — Present | San Francisco, CA*\n\n- Architected a component library used by 12 product teams, reducing UI development time by 35%\n- Optimized React rendering pipeline that decreased page load times from 4.2s to 1.8s\n- Mentored 4 junior developers through weekly code reviews and pair programming sessions\n- Led migration from REST to GraphQL, reducing API calls by 60% across the platform`,
  },
  {
    id: 'resume-education',
    title: 'Education Section',
    category: 'Resume',
    description: 'Education entry with relevant details',
    content: `### [Degree] in [Major]\n**[University Name]** | [Graduation Year]\n- GPA: [X.XX/4.00] (include if 3.5+)\n- Relevant Coursework: [Course 1], [Course 2], [Course 3]\n- Honors: [Dean's List, Cum Laude, Scholarships]\n- Activities: [Club/Organization], [Leadership Role]`,
    example: `### Bachelor of Science in Computer Science\n**University of California, Berkeley** | 2020\n- GPA: 3.78/4.00\n- Relevant Coursework: Data Structures, Machine Learning, Distributed Systems\n- Honors: Dean's List (6 semesters), Regents' Scholarship\n- Activities: ACM Chapter President, Hackathon Organizer`,
  },
  // ── Cover Letter ──
  {
    id: 'cover-standard',
    title: 'Standard Application',
    category: 'Cover Letter',
    description: 'Traditional job application cover letter',
    content: `Dear [Hiring Manager Name/Hiring Team],\n\nI am writing to express my interest in the [Job Title] position at [Company Name], as advertised on [where you found the listing]. With [X years] of experience in [relevant field], I am confident in my ability to contribute to your team.\n\nIn my current role at [Current Company], I [key achievement with metrics]. This experience has equipped me with strong skills in [skill 1] and [skill 2], which align directly with the requirements of this position.\n\nWhat excites me most about [Company Name] is [specific reason — mission, product, culture]. I am particularly drawn to [specific project, value, or initiative] and believe my background in [relevant experience] would allow me to make an immediate impact.\n\nI would welcome the opportunity to discuss how my experience and skills can benefit your team. Thank you for considering my application.\n\nSincerely,\n[Your Name]\n[Phone] | [Email] | [LinkedIn URL]`,
    example: `Dear Ms. Thompson,\n\nI am writing to express my interest in the Senior Frontend Developer position at Stripe, as advertised on your careers page. With 5 years of experience in building payment interfaces and developer tools, I am confident in my ability to contribute to your team.\n\nIn my current role at TechFlow, I led the redesign of our checkout flow, increasing conversion rates by 18%. This experience has equipped me with strong skills in React performance optimization and accessible UI design, which align directly with the requirements of this position.\n\nWhat excites me most about Stripe is your mission to increase the GDP of the internet. I am particularly drawn to your developer experience initiatives and believe my background in building component libraries would allow me to make an immediate impact.\n\nI would welcome the opportunity to discuss how my experience and skills can benefit your team. Thank you for considering my application.\n\nSincerely,\nSarah Chen\n(555) 123-4567 | sarah@email.com | linkedin.com/in/sarahchen`,
  },
  {
    id: 'cover-career-change',
    title: 'Career Change',
    category: 'Cover Letter',
    description: 'Cover letter for transitioning to a new field',
    content: `Dear [Hiring Manager Name],\n\nI am excited to apply for the [Job Title] position at [Company Name]. While my background is in [previous field], I have spent the past [timeframe] developing skills in [new field] and am eager to bring my unique perspective to your team.\n\nMy experience in [previous field] has given me strong [transferable skill 1] and [transferable skill 2] abilities. For example, [specific example of transferable achievement]. These skills translate directly to [how they apply to the new role].\n\nTo prepare for this transition, I have [courses completed, certifications earned, projects built, volunteer work]. Most recently, I [specific relevant project or accomplishment in the new field].\n\nI am drawn to [Company Name] because [specific reason]. I believe my combination of [previous field] expertise and [new field] skills offers a unique advantage.\n\nI would love to discuss how my diverse background can add value to your team.\n\nBest regards,\n[Your Name]`,
    example: `Dear Mr. Davis,\n\nI am excited to apply for the UX Designer position at Figma. While my background is in clinical psychology, I have spent the past 18 months developing skills in user experience design and am eager to bring my unique perspective to your team.\n\nMy experience in psychology has given me strong user research and empathy-driven analysis abilities. For example, I conducted 200+ patient interviews using structured methodologies. These skills translate directly to user research and usability testing.\n\nTo prepare for this transition, I completed the Google UX Design Certificate and built 5 case study projects. Most recently, I redesigned a nonprofit's donation flow, increasing completions by 32%.\n\nI am drawn to Figma because of your commitment to making design accessible to everyone. I believe my combination of psychology expertise and design skills offers a unique advantage.\n\nI would love to discuss how my diverse background can add value to your team.\n\nBest regards,\nEmily Torres`,
  },
  {
    id: 'cover-internal',
    title: 'Internal Transfer',
    category: 'Cover Letter',
    description: 'Cover letter for internal position change',
    content: `Dear [Manager Name],\n\nI am writing to express my interest in the [Job Title] position within the [Department] team. Having been with [Company Name] for [X years] in my current role as [Current Title], I have developed a deep understanding of our [products/processes/culture] and am excited about the opportunity to contribute in a new capacity.\n\nIn my current role, I have [achievement 1 with metrics] and [achievement 2]. These experiences have prepared me well for the [target role] by developing my skills in [relevant skill 1] and [relevant skill 2].\n\nI have also [cross-functional work, relevant projects, or training that connects to the new role]. [Specific example of collaboration with the target team.]\n\nI am passionate about [aspect of the new role] and believe this move would allow me to [growth opportunity] while continuing to drive impact for [Company Name].\n\nI would appreciate the opportunity to discuss this further. Thank you for your consideration.\n\nBest regards,\n[Your Name]`,
    example: `Dear Lisa,\n\nI am writing to express my interest in the Engineering Manager position within the Platform team. Having been with Acme Corp for 3 years in my current role as Senior Developer, I have developed a deep understanding of our infrastructure and am excited about the opportunity to contribute in a leadership capacity.\n\nIn my current role, I have led the migration to microservices (reducing deploy times by 70%) and mentored 6 junior developers. These experiences have prepared me well for the EM role by developing my skills in technical leadership and team development.\n\nI have also completed our internal Leadership Accelerator program and regularly collaborate with the Platform team on shared infrastructure projects.\n\nI am passionate about building high-performing engineering teams and believe this move would allow me to scale my impact while continuing to drive technical excellence for Acme Corp.\n\nI would appreciate the opportunity to discuss this further. Thank you for your consideration.\n\nBest regards,\nMarcus Johnson`,
  },
  // ── Business ──
  {
    id: 'biz-proposal',
    title: 'Project Proposal',
    category: 'Business',
    description: 'Structured project proposal document',
    content: `# Project Proposal: [Project Name]\n\n**Prepared by:** [Your Name] | **Date:** [Date] | **Version:** 1.0\n\n## Executive Summary\n[2-3 sentence overview of the project, its goals, and expected impact.]\n\n## Problem Statement\n[Describe the problem or opportunity this project addresses.]\n\n## Proposed Solution\n[Describe your approach, methodology, and key deliverables.]\n\n## Scope\n**In Scope:**\n- [Deliverable 1]\n- [Deliverable 2]\n- [Deliverable 3]\n\n**Out of Scope:**\n- [Exclusion 1]\n- [Exclusion 2]\n\n## Timeline\n| Phase | Duration | Deliverable |\n|-------|----------|-------------|\n| Phase 1 | [X weeks] | [Deliverable] |\n| Phase 2 | [X weeks] | [Deliverable] |\n| Phase 3 | [X weeks] | [Deliverable] |\n\n## Budget\n[Estimated cost breakdown.]\n\n## Success Metrics\n- [KPI 1]: [Target]\n- [KPI 2]: [Target]\n\n## Risks & Mitigation\n- **Risk:** [Risk 1] → **Mitigation:** [Plan]\n- **Risk:** [Risk 2] → **Mitigation:** [Plan]\n\n## Next Steps\n[Immediate actions needed to proceed.]`,
    example: `# Project Proposal: Customer Portal Redesign\n\n**Prepared by:** Sarah Chen | **Date:** March 2024 | **Version:** 1.0\n\n## Executive Summary\nRedesign the customer portal to improve self-service capabilities, targeting a 30% reduction in support tickets and 20% increase in customer satisfaction scores.\n\n## Problem Statement\nOur current portal has a 45% bounce rate and generates 2,000+ support tickets monthly for tasks customers should be able to handle themselves...`,
  },
  {
    id: 'biz-agenda',
    title: 'Meeting Agenda',
    category: 'Business',
    description: 'Structured meeting agenda with time blocks',
    content: `# Meeting Agenda: [Meeting Title]\n\n**Date:** [Date] | **Time:** [Start] — [End] | **Location:** [Room/Link]\n**Facilitator:** [Name] | **Note-taker:** [Name]\n\n## Attendees\n- [Name 1] — [Role]\n- [Name 2] — [Role]\n- [Name 3] — [Role]\n\n## Objectives\n1. [Primary objective]\n2. [Secondary objective]\n\n## Agenda\n\n| Time | Topic | Lead | Notes |\n|------|-------|------|-------|\n| [5 min] | Welcome & check-in | [Name] | |\n| [15 min] | [Topic 1] | [Name] | [Pre-read link] |\n| [15 min] | [Topic 2] | [Name] | |\n| [10 min] | [Topic 3] | [Name] | |\n| [5 min] | Action items & wrap-up | [Facilitator] | |\n\n## Pre-Meeting Preparation\n- [ ] Review [document/data]\n- [ ] Prepare [input/update]\n\n## Action Items (to be filled during meeting)\n- [ ] [Action] — Owner: [Name] — Due: [Date]`,
    example: `# Meeting Agenda: Q3 Planning Sprint\n\n**Date:** July 1, 2024 | **Time:** 10:00 AM — 11:00 AM EST | **Location:** Zoom\n**Facilitator:** Sarah Chen | **Note-taker:** Alex Kim\n\n## Attendees\n- Sarah Chen — Product Manager\n- Alex Kim — Tech Lead\n- Maria Lopez — Designer\n\n## Agenda\n| Time | Topic | Lead |\n|------|-------|------|\n| 5 min | Welcome & check-in | Sarah |\n| 15 min | Q2 retrospective | Alex |\n| 20 min | Q3 roadmap priorities | Sarah |\n| 15 min | Design system updates | Maria |\n| 5 min | Action items & wrap-up | Sarah |`,
  },
  {
    id: 'biz-status',
    title: 'Status Update',
    category: 'Business',
    description: 'Weekly or project status update report',
    content: `# Status Update: [Project/Team Name]\n\n**Period:** [Date Range] | **Author:** [Your Name] | **Status:** 🟢 On Track / 🟡 At Risk / 🔴 Blocked\n\n## Summary\n[1-2 sentence overview of progress this period.]\n\n## Completed This Period\n- ✅ [Accomplishment 1]\n- ✅ [Accomplishment 2]\n- ✅ [Accomplishment 3]\n\n## In Progress\n- 🔄 [Task 1] — [X]% complete — ETA: [Date]\n- 🔄 [Task 2] — [X]% complete — ETA: [Date]\n\n## Blocked / Risks\n- 🚫 [Blocker 1] — Need: [what's needed to unblock]\n- ⚠️ [Risk 1] — Mitigation: [plan]\n\n## Upcoming Next Period\n- [ ] [Planned task 1]\n- [ ] [Planned task 2]\n\n## Metrics\n- [KPI 1]: [Current] → [Target]\n- [KPI 2]: [Current] → [Target]`,
    example: `# Status Update: Customer Portal Redesign\n\n**Period:** March 11-15, 2024 | **Author:** Sarah Chen | **Status:** 🟡 At Risk\n\n## Summary\nCompleted user research phase and began wireframing. Timeline at risk due to delayed API documentation.\n\n## Completed This Period\n- ✅ Conducted 8 user interviews\n- ✅ Synthesized research findings into personas\n- ✅ Drafted information architecture\n\n## Blocked / Risks\n- 🚫 API documentation delayed — Need: Backend team to deliver specs by March 20\n\n## Upcoming Next Period\n- [ ] Complete wireframes for core flows\n- [ ] Begin usability testing recruitment`,
  },
  {
    id: 'biz-executive-summary',
    title: 'Executive Summary',
    category: 'Business',
    description: 'Concise executive summary for reports or proposals',
    content: `# Executive Summary\n\n## Overview\n[One paragraph summarizing the entire document/project/initiative.]\n\n## Key Findings\n1. [Finding 1 with supporting data]\n2. [Finding 2 with supporting data]\n3. [Finding 3 with supporting data]\n\n## Recommendations\n- **[Recommendation 1]**: [Brief rationale]\n- **[Recommendation 2]**: [Brief rationale]\n- **[Recommendation 3]**: [Brief rationale]\n\n## Expected Impact\n- [Metric 1]: [Expected improvement]\n- [Metric 2]: [Expected improvement]\n- **ROI**: [Estimated return]\n\n## Investment Required\n- **Budget**: [Amount]\n- **Timeline**: [Duration]\n- **Resources**: [Team/headcount needed]\n\n## Next Steps\n1. [Immediate action with owner and deadline]\n2. [Follow-up action]\n3. [Decision needed by date]`,
    example: `# Executive Summary\n\n## Overview\nThis proposal recommends migrating our infrastructure to a serverless architecture, projected to reduce operational costs by 40% and improve deployment velocity by 3x within 6 months.\n\n## Key Findings\n1. Current infrastructure costs $45K/month with 60% idle capacity\n2. Deployment cycle averages 2 weeks due to manual processes\n3. Three major outages in Q4 traced to scaling limitations\n\n## Expected Impact\n- Infrastructure costs: $45K → $27K/month\n- Deploy frequency: Bi-weekly → Daily\n- **ROI**: 280% over 12 months`,
  },
  // ── Academic ──
  {
    id: 'acad-abstract',
    title: 'Research Abstract',
    category: 'Academic',
    description: 'Structured research paper abstract',
    content: `## Abstract\n\n**Background:** [1-2 sentences establishing the context and importance of the research area.]\n\n**Objective:** This study aims to [research objective/question].\n\n**Methods:** [Brief description of methodology, sample size, and analytical approach.]\n\n**Results:** [Key findings with specific data points or statistics.]\n\n**Conclusion:** [Main takeaway and implications. Mention limitations and future directions.]\n\n**Keywords:** [keyword 1], [keyword 2], [keyword 3], [keyword 4], [keyword 5]`,
    example: `## Abstract\n\n**Background:** Remote work adoption has accelerated dramatically since 2020, yet its long-term effects on team productivity remain poorly understood.\n\n**Objective:** This study aims to examine the relationship between remote work frequency and team output quality across software development teams.\n\n**Methods:** We conducted a longitudinal study of 150 software teams (N=1,200 developers) across 12 companies over 18 months, measuring sprint velocity, code quality metrics, and team satisfaction scores.\n\n**Results:** Teams working 2-3 days remotely showed 12% higher sprint velocity (p<0.01) and 8% fewer production bugs compared to fully co-located teams. Fully remote teams showed equivalent velocity but 15% lower satisfaction scores.\n\n**Conclusion:** Hybrid work arrangements optimize both productivity and satisfaction for software teams. Future research should examine these patterns across other knowledge work domains.\n\n**Keywords:** remote work, hybrid work, software development, team productivity, organizational behavior`,
  },
  {
    id: 'acad-litreview',
    title: 'Literature Review Intro',
    category: 'Academic',
    description: 'Opening section for a literature review',
    content: `## Literature Review\n\nThe study of [broad topic] has garnered significant attention in recent years, driven by [reason for increased interest]. This literature review examines the current body of research on [specific focus area], with particular attention to [aspect 1], [aspect 2], and [aspect 3].\n\nEarly research in this field, notably [Author, Year] and [Author, Year], established that [foundational finding]. Subsequent studies have expanded this understanding by [how the field evolved].\n\nThis review is organized as follows: Section [X] examines [theme 1], Section [Y] explores [theme 2], and Section [Z] addresses [theme 3]. The review concludes with an identification of gaps in the current literature and directions for future research.\n\n### [Theme 1]\n[Discussion of relevant studies, their methodologies, findings, and how they relate to each other.]\n\n### [Theme 2]\n[Continue with next theme...]\n\n### Gaps in the Literature\n[Identify what remains unknown or understudied. This sets up your research contribution.]`,
    example: `## Literature Review\n\nThe study of artificial intelligence in healthcare has garnered significant attention in recent years, driven by advances in deep learning and the availability of large medical datasets. This literature review examines the current body of research on AI-assisted diagnosis, with particular attention to accuracy, bias, and clinical adoption.\n\nEarly research in this field, notably Esteva et al. (2017) and Rajpurkar et al. (2017), established that deep learning models could match dermatologist-level accuracy in skin cancer detection. Subsequent studies have expanded this understanding by applying similar techniques across radiology, pathology, and ophthalmology...`,
  },
  {
    id: 'acad-thesis',
    title: 'Thesis Statement',
    category: 'Academic',
    description: 'Strong thesis statement templates for essays',
    content: `## Thesis Statement Templates\n\n**Argumentative:**\nAlthough [counterargument/common belief], [your position] because [reason 1], [reason 2], and [reason 3].\n\n**Analytical:**\nAn analysis of [subject] reveals [finding/insight], which suggests that [broader implication].\n\n**Expository:**\n[Subject] [does/is/has] [what] through [method/mechanism 1], [method/mechanism 2], and [method/mechanism 3].\n\n**Compare & Contrast:**\nWhile [Subject A] and [Subject B] share [similarity], they differ fundamentally in [difference 1] and [difference 2], which has implications for [broader context].\n\n---\n\n**Your thesis:** [Write your thesis statement here using one of the templates above.]`,
    example: `## Thesis Statement Templates\n\n**Argumentative (filled):**\nAlthough many educators view standardized testing as an objective measure of student achievement, these assessments ultimately harm educational outcomes because they narrow curriculum focus, increase student anxiety, and disproportionately disadvantage low-income communities.\n\n**Analytical (filled):**\nAn analysis of social media usage patterns among Gen Z reveals a paradoxical relationship between connectivity and loneliness, which suggests that digital communication quality matters more than quantity for psychological well-being.`,
  },
  {
    id: 'acad-labreport',
    title: 'Lab Report',
    category: 'Academic',
    description: 'Scientific lab report structure',
    content: `# [Experiment Title]\n\n**Course:** [Course Name & Number]\n**Author:** [Your Name] | **Lab Partner(s):** [Names]\n**Date Performed:** [Date] | **Date Submitted:** [Date]\n**Instructor:** [Professor Name]\n\n## Abstract\n[Brief summary of purpose, methods, key results, and conclusion — 150-200 words.]\n\n## Introduction\n[Background information and theory. State the hypothesis.]\n\n**Hypothesis:** [If... then... because...]\n\n## Materials and Methods\n### Materials\n- [Material/Equipment 1]\n- [Material/Equipment 2]\n\n### Procedure\n1. [Step 1]\n2. [Step 2]\n3. [Step 3]\n\n## Results\n[Present data in tables and/or graphs. Describe observations without interpretation.]\n\n| Trial | [Variable 1] | [Variable 2] | [Result] |\n|-------|-------------|-------------|----------|\n| 1 | [value] | [value] | [value] |\n| 2 | [value] | [value] | [value] |\n\n## Discussion\n[Interpret results. Was the hypothesis supported? Discuss sources of error and improvements.]\n\n## Conclusion\n[Summarize findings in relation to the hypothesis. Suggest future experiments.]\n\n## References\n[List sources in required citation format.]`,
    example: `# Effect of Temperature on Enzyme Activity\n\n**Course:** BIO 201 — Biochemistry\n**Author:** Alex Kim | **Lab Partner(s):** Sarah Chen\n**Date Performed:** March 10, 2024 | **Date Submitted:** March 17, 2024\n\n## Abstract\nThis experiment investigated the effect of temperature on catalase enzyme activity. Catalase was exposed to temperatures ranging from 10°C to 80°C, and reaction rates were measured by oxygen gas production. Maximum activity was observed at 37°C, supporting the hypothesis that enzyme activity peaks at body temperature...`,
  },
  // ── Social Media ──
  {
    id: 'social-linkedin',
    title: 'LinkedIn Post',
    category: 'Social Media',
    description: 'Engaging LinkedIn post with hook and CTA',
    content: `[Hook — bold statement, question, or surprising stat that stops the scroll]\n\nHere's what I learned:\n\n1️⃣ [Key insight 1]\n[Brief explanation]\n\n2️⃣ [Key insight 2]\n[Brief explanation]\n\n3️⃣ [Key insight 3]\n[Brief explanation]\n\nThe biggest takeaway?\n[One-sentence summary of the main lesson.]\n\n[Call to action — question to drive engagement]\n\n#[hashtag1] #[hashtag2] #[hashtag3]`,
    example: `I rejected a $200K job offer last month.\n\nHere's what I learned:\n\n1️⃣ Compensation isn't just salary\nThe offer had no equity, limited PTO, and a toxic Glassdoor rating. Total comp matters.\n\n2️⃣ Your network is your safety net\nWithin 2 weeks of declining, three connections referred me to better opportunities.\n\n3️⃣ Saying no is a skill\nEvery "no" to the wrong thing is a "yes" to the right one.\n\nThe biggest takeaway?\nKnow your worth AND your values before you negotiate.\n\nWhat's the hardest career decision you've made this year?\n\n#CareerGrowth #JobSearch #TechCareers`,
  },
  {
    id: 'social-twitter-thread',
    title: 'Twitter/X Thread',
    category: 'Social Media',
    description: 'Engaging Twitter/X thread format',
    content: `🧵 [Hook tweet — bold claim or question] (1/[N])\n\n[Expand on the hook with context] (2/[N])\n\n[Point 1 with specific detail or example] (3/[N])\n\n[Point 2 — build on the narrative] (4/[N])\n\n[Point 3 — the surprising or counterintuitive insight] (5/[N])\n\n[Practical takeaway — what the reader can do with this info] (6/[N])\n\nTL;DR:\n• [Bullet 1]\n• [Bullet 2]\n• [Bullet 3]\n\nIf this was helpful, RT the first tweet 🔄\nFollow me @[handle] for more [topic] content (7/7)`,
    example: `🧵 I built a SaaS that makes $10K/month in 6 months. Here's exactly how: (1/7)\n\nI didn't start with a grand vision. I started with a spreadsheet tracking my own pain points at work. (2/7)\n\nMonth 1-2: I built an MVP in 3 weekends using Next.js and Supabase. Total cost: $0 (free tiers). (3/7)\n\nMonth 3: Launched on Product Hunt. Got 200 upvotes and 50 signups. Not viral, but enough to validate. (4/7)\n\nMonth 4-5: The game changer? I DMed every churned user and asked why. Their feedback shaped v2. (5/7)\n\nMonth 6: Added a team plan ($49/mo). Enterprise users found me through SEO blog posts I wrote about the problem space. (6/7)\n\nTL;DR:\n• Start with your own pain\n• Ship fast, learn faster\n• Talk to churned users\n• Content marketing > paid ads early on\n\nIf this was helpful, RT the first tweet 🔄\nFollow me @sarahbuilds for more indie hacker content (7/7)`,
  },
  {
    id: 'social-launch',
    title: 'Product Launch Announcement',
    category: 'Social Media',
    description: 'Product or feature launch announcement post',
    content: `🚀 Big news: [Product/Feature Name] is here!\n\n[One sentence describing what it does and who it's for.]\n\nWhat's new:\n✨ [Feature 1] — [brief benefit]\n✨ [Feature 2] — [brief benefit]\n✨ [Feature 3] — [brief benefit]\n\n[Social proof or early result, e.g., "Already used by X beta testers" or "Built based on feedback from 500+ users"]\n\n🔗 Try it now: [link]\n\n[Special offer if applicable, e.g., "First 100 users get 50% off"]\n\nWe'd love your feedback! Drop a comment or DM us.\n\n#[ProductName] #Launch #[Industry]`,
    example: `🚀 Big news: UtilityHub 2.0 is here!\n\nThe all-in-one toolkit for developers, designers, and creators — now with 100+ free tools.\n\nWhat's new:\n✨ AI Content Detector — check if text is AI-generated\n✨ PDF Editor — annotate, highlight, and sign PDFs in-browser\n✨ 20 Finance Calculators — compound interest, options, tax, and more\n\nAlready used by 10,000+ creators in beta.\n\n🔗 Try it now: utilityhub.dev\n\nFirst 100 Pro signups get 50% off for life!\n\nWe'd love your feedback! Drop a comment or DM us.\n\n#UtilityHub #Launch #DevTools`,
  },
];

const CATEGORIES = ['All', 'Email', 'Blog', 'Resume', 'Cover Letter', 'Business', 'Academic', 'Social Media'];

/* ── Styles ────────────────────────────────────────────────────────── */
const cardStyle = { background: 'rgba(44,44,46,0.8)', border: '1px solid rgba(255,255,255,0.08)' };
const inputCls = 'w-full px-3 py-2 rounded-xl text-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500/40';
const inputStyle = { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' };

/* ── Placeholder regex ─────────────────────────────────────────────── */
const PLACEHOLDER_RE = /\[([^\]]+)\]/g;

function highlightPlaceholders(text) {
  const parts = [];
  let last = 0;
  let match;
  const re = new RegExp(PLACEHOLDER_RE.source, 'g');
  while ((match = re.exec(text)) !== null) {
    if (match.index > last) parts.push({ type: 'text', value: text.slice(last, match.index) });
    parts.push({ type: 'placeholder', value: match[0], inner: match[1] });
    last = re.lastIndex;
  }
  if (last < text.length) parts.push({ type: 'text', value: text.slice(last) });
  return parts;
}

function PlaceholderPreview({ text }) {
  const parts = highlightPlaceholders(text);
  return (
    <span>
      {parts.map((p, i) =>
        p.type === 'placeholder' ? (
          <span key={i} className="px-1 py-0.5 rounded text-orange-300 font-medium" style={{ background: 'rgba(255,159,67,0.15)' }}>
            {p.value}
          </span>
        ) : (
          <span key={i}>{p.value}</span>
        ),
      )}
    </span>
  );
}

/* ── Main Component ────────────────────────────────────────────────── */
export default function WritingTemplates() {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [editorContent, setEditorContent] = useState('');
  const [showExample, setShowExample] = useState(false);
  const [copied, setCopied] = useState(false);
  const [downloaded, setDownloaded] = useState(false);

  const filtered = useMemo(() => {
    let list = TEMPLATES;
    if (activeCategory !== 'All') list = list.filter((t) => t.category === activeCategory);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q) ||
          t.category.toLowerCase().includes(q),
      );
    }
    return list;
  }, [activeCategory, search]);

  const loadTemplate = useCallback((tpl) => {
    setSelectedTemplate(tpl);
    setEditorContent(tpl.content);
    setShowExample(false);
    setCopied(false);
    setDownloaded(false);
  }, []);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(editorContent).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [editorContent]);

  const handleDownload = useCallback(() => {
    const blob = new Blob([editorContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedTemplate?.title?.replace(/\s+/g, '-').toLowerCase() || 'template'}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    setDownloaded(true);
    setTimeout(() => setDownloaded(false), 2500);
  }, [editorContent, selectedTemplate]);

  const handleClear = useCallback(() => {
    setSelectedTemplate(null);
    setEditorContent('');
    setShowExample(false);
  }, []);

  const placeholderCount = useMemo(() => {
    const matches = editorContent.match(PLACEHOLDER_RE);
    return matches ? matches.length : 0;
  }, [editorContent]);

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-6">
      {/* Search */}
      <div className="rounded-2xl p-6" style={cardStyle}>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search templates by name, category, or keyword..."
          className={inputCls}
          style={inputStyle}
          aria-label="Search templates"
        />
      </div>

      {/* Category Tabs */}
      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map((cat) => {
          const isActive = activeCategory === cat;
          return (
            <motion.button
              key={cat}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all min-h-[44px] ${
                isActive ? 'text-white shadow-lg' : 'text-surface-300 hover:bg-white/5'
              }`}
              style={
                isActive
                  ? { background: 'linear-gradient(135deg, #FF6363, #FF9F43)' }
                  : { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }
              }
            >
              {cat}
            </motion.button>
          );
        })}
      </div>

      {/* Template Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <AnimatePresence mode="popLayout">
          {filtered.map((tpl) => (
            <motion.button
              key={tpl.id}
              layout
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              onClick={() => loadTemplate(tpl)}
              className={`text-left rounded-2xl p-5 transition-all min-h-[44px] ${
                selectedTemplate?.id === tpl.id ? 'ring-2 ring-primary-500/60' : ''
              }`}
              style={{
                background: selectedTemplate?.id === tpl.id ? 'rgba(255,99,99,0.08)' : 'rgba(44,44,46,0.8)',
                border: selectedTemplate?.id === tpl.id ? '1px solid rgba(255,99,99,0.3)' : '1px solid rgba(255,255,255,0.08)',
              }}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <h3 className="text-sm font-semibold text-surface-100 leading-tight">{tpl.title}</h3>
                <span
                  className="text-[10px] font-medium px-2 py-0.5 rounded-full shrink-0"
                  style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)' }}
                >
                  {tpl.category}
                </span>
              </div>
              <p className="text-xs text-surface-400 leading-relaxed">{tpl.description}</p>
            </motion.button>
          ))}
        </AnimatePresence>
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12 text-surface-400">
          <p className="text-lg mb-1">No templates found</p>
          <p className="text-sm">Try a different search term or category</p>
        </div>
      )}
    </motion.div>
  );
}
