/**
 * Essay Outline Generator
 * Pure client-side — no server calls.
 */

const VALID_TYPES = ['argumentative', 'expository', 'narrative', 'compare-contrast', 'persuasive'];
const MIN_PARAGRAPHS = 3;
const MAX_PARAGRAPHS = 7;
const DEFAULT_PARAGRAPHS = 5;

// ── Templates per essay type ─────────────────────────────────

const TEMPLATES = {
  argumentative: {
    hookPrefix: 'Consider the controversial question:',
    thesisPrefix: 'This essay argues that',
    topicTemplates: [
      'The first key argument supporting this position is',
      'Furthermore, evidence demonstrates that',
      'Additionally, a critical factor to consider is',
      'Another compelling reason is',
      'Moreover, historical precedent shows that',
      'It is also worth noting that',
      'A final supporting argument is',
    ],
    supportingPoints: [
      'Present statistical evidence or research findings',
      'Address and refute the counterargument',
      'Provide a real-world example or case study',
    ],
    restatementPrefix: 'In conclusion, the evidence clearly supports that',
    closingPrefix: 'Moving forward, it is essential to recognize',
  },
  expository: {
    hookPrefix: 'An important topic that deserves examination is',
    thesisPrefix: 'This essay explains',
    topicTemplates: [
      'To begin, it is important to understand',
      'The next key aspect to examine is',
      'Another significant element is',
      'Equally important is the role of',
      'A further dimension worth exploring is',
      'One must also consider',
      'Finally, an often-overlooked factor is',
    ],
    supportingPoints: [
      'Define key terms and concepts',
      'Provide factual evidence or data',
      'Offer a clear example to illustrate the point',
    ],
    restatementPrefix: 'In summary, this examination has shown that',
    closingPrefix: 'Understanding this topic is valuable because',
  },
  narrative: {
    hookPrefix: 'It all began when',
    thesisPrefix: 'This narrative explores the experience of',
    topicTemplates: [
      'The story begins with the setting and context of',
      'A pivotal moment occurred when',
      'The turning point came as',
      'Reflecting on this experience reveals',
      'The aftermath brought unexpected changes in',
      'Looking back, the significance of this moment was',
      'The lasting impact of this experience is',
    ],
    supportingPoints: [
      'Describe sensory details and emotions',
      'Include dialogue or internal reflection',
      'Show character development or change',
    ],
    restatementPrefix: 'Looking back on this experience,',
    closingPrefix: 'This story ultimately teaches us that',
  },
  'compare-contrast': {
    hookPrefix: 'When examining the relationship between two subjects,',
    thesisPrefix: 'This essay compares and contrasts',
    topicTemplates: [
      'The first major similarity between the two is',
      'A key difference that stands out is',
      'Both subjects share the characteristic of',
      'However, they diverge significantly in',
      'Another point of comparison is',
      'On the other hand, a notable contrast is',
      'A final area of overlap is',
    ],
    supportingPoints: [
      'Provide specific examples from each subject',
      'Analyze the significance of this similarity or difference',
      'Connect this point to the broader thesis',
    ],
    restatementPrefix: 'Ultimately, comparing these subjects reveals that',
    closingPrefix: 'This analysis demonstrates the importance of',
  },
  persuasive: {
    hookPrefix: 'Imagine a world where',
    thesisPrefix: 'It is imperative that',
    topicTemplates: [
      'The most compelling reason to act is',
      'Beyond that, the evidence shows',
      'Critics may argue otherwise, but',
      'The moral imperative demands that',
      'Practical benefits further support this position because',
      'Society stands to gain significantly from',
      'The urgency of this matter is underscored by',
    ],
    supportingPoints: [
      'Appeal to logic with data or expert opinion',
      'Appeal to emotion with a vivid scenario',
      'Include a call to action or proposed solution',
    ],
    restatementPrefix: 'The case is clear:',
    closingPrefix: 'The time to act is now because',
  },
};

/**
 * Generate an essay outline.
 * @param {string} topic - The essay topic
 * @param {'argumentative'|'expository'|'narrative'|'compare-contrast'|'persuasive'} essayType
 * @param {number} [bodyParagraphs=5] - Number of body paragraphs (3–7)
 * @returns {{ introduction: { thesis: string, hook: string }, body: Array<{ topicSentence: string, supportingPoints: string[] }>, conclusion: { restatement: string, closingThought: string } }}
 */
export function generateOutline(topic, essayType, bodyParagraphs = DEFAULT_PARAGRAPHS) {
  if (!topic || typeof topic !== 'string' || !topic.trim()) {
    throw new Error('Topic is required');
  }
  if (!VALID_TYPES.includes(essayType)) {
    throw new Error(`Invalid essay type: ${essayType}. Use one of: ${VALID_TYPES.join(', ')}`);
  }

  const count = Math.max(MIN_PARAGRAPHS, Math.min(MAX_PARAGRAPHS, bodyParagraphs));
  const template = TEMPLATES[essayType];
  const trimmedTopic = topic.trim();

  const introduction = {
    hook: `${template.hookPrefix} ${trimmedTopic}.`,
    thesis: `${template.thesisPrefix} ${trimmedTopic}.`,
  };

  const body = [];
  for (let i = 0; i < count; i++) {
    const topicTemplate = template.topicTemplates[i % template.topicTemplates.length];
    body.push({
      topicSentence: `${topicTemplate} ${trimmedTopic}.`,
      supportingPoints: [...template.supportingPoints],
    });
  }

  const conclusion = {
    restatement: `${template.restatementPrefix} ${trimmedTopic}.`,
    closingThought: `${template.closingPrefix} ${trimmedTopic}.`,
  };

  return { introduction, body, conclusion };
}
