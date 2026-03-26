import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

// Mock jobs data
const mockJobs = [
  {
    id: '1',
    title: 'Senior Frontend Developer',
    company: 'Tech Corp',
    location: 'San Francisco, CA',
    description: 'Looking for an experienced React developer with 5+ years of experience.',
    salary: '$120,000 - $150,000',
    skills: ['React', 'JavaScript', 'CSS', 'HTML'],
    applyUrl: 'https://example.com/apply/1',
    postedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: '2',
    title: 'Full Stack Engineer',
    company: 'StartupXYZ',
    location: 'Remote',
    description: 'Join our growing team as a full-stack engineer. Node.js and React required.',
    salary: '$100,000 - $130,000',
    skills: ['Node.js', 'React', 'Redis', 'APIs'],
    applyUrl: 'https://example.com/apply/2',
    postedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: '3',
    title: 'Backend Developer',
    company: 'FinanceApp Inc',
    location: 'New York, NY',
    description: 'Seeking backend developer with experience in microservices and cloud platforms.',
    salary: '$110,000 - $145,000',
    skills: ['Node.js', 'Databases', 'Microservices', 'Cloud'],
    applyUrl: 'https://example.com/apply/3',
    postedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: '4',
    title: 'DevOps Engineer',
    company: 'CloudServices Ltd',
    location: 'Austin, TX',
    description: 'Help us build and maintain our infrastructure on AWS and Kubernetes.',
    salary: '$115,000 - $155,000',
    skills: ['AWS', 'Kubernetes', 'CI/CD', 'Terraform'],
    applyUrl: 'https://example.com/apply/4',
    postedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: '5',
    title: 'UI/UX Designer',
    company: 'DesignStudio',
    location: 'Los Angeles, CA',
    description: 'Creative designer needed for web and mobile app projects.',
    salary: '$90,000 - $120,000',
    skills: ['UI Design', 'UX', 'Figma', 'Prototyping'],
    applyUrl: 'https://example.com/apply/5',
    postedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '../../data');
const RESUMES_FILE = path.join(DATA_DIR, 'resumes.json');
const jobMatchCache = new Map();

async function loadResumes() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
  } catch (err) {
    // ignore
  }

  try {
    const data = await fs.readFile(RESUMES_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (err) {
    return [];
  }
}

function normalizeText(text) {
  return (text || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

function extractWords(text) {
  const normalized = normalizeText(text);
  return Array.from(new Set(normalized.split(' ').filter(Boolean)));
}

function hashText(text) {
  return crypto.createHash('sha256').update(text || '').digest('hex');
}

function computeRuleMatch(job, resumeText) {
  const resumeNorm = normalizeText(resumeText || '');
  const title = job.title || '';
  const description = job.description || '';
  const skills = (job.skills || []).map((s) => s.toLowerCase());
  const jobContent = `${title} ${description} ${skills.join(' ')}`;

  const jobWords = extractWords(jobContent);
  const resumeWords = extractWords(resumeNorm);

  const skillMatches = skills.filter((skill) => resumeNorm.includes(skill.toLowerCase()));
  const skillScore = skills.length > 0 ? Math.round((Math.min(skillMatches.length, skills.length) / skills.length) * 40) : 0;

  const titleMatch = title && resumeNorm.includes(title.toLowerCase()) ? 30 : 0;

  const commonKeywords = jobWords.filter((word) => resumeWords.includes(word));
  const keywordScore = jobWords.length > 0 ? Math.round((commonKeywords.length / jobWords.length) * 30) : 0;

  let rawScore = skillScore + titleMatch + keywordScore;
  rawScore = Math.min(100, Math.max(0, rawScore));

  const matchingSkills = skillMatches.map((s) => s.trim()).filter(Boolean);
  const relevantExperience = titleMatch
    ? `Resume text includes the target role title '${title}'.`
    : `Resume contains ${Math.min(commonKeywords.length, 3)} relevant terms from the job description.`;

  const keywordAlignment = commonKeywords.slice(0, 8);

  return {
    baseScore: rawScore,
    matchingSkills,
    relevantExperience,
    keywordAlignment,
    ruleDetails: {
      skillScore,
      titleMatch: !!titleMatch,
      keywordScore,
      commonKeywords,
    },
  };
}

function tryParseJson(text) {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) {
    return null;
  }
  const snippet = text.slice(start, end + 1);
  try {
    return JSON.parse(snippet);
  } catch (err) {
    return null;
  }
}

const ADZUNA_APP_ID = process.env.ADZUNA_APP_ID;
const ADZUNA_APP_KEY = process.env.ADZUNA_APP_KEY;
const ADZUNA_COUNTRY = process.env.ADZUNA_COUNTRY || 'us';

function mapAdzunaJob(adzunaJob) {
  const location = adzunaJob.location?.display_name || adzunaJob.location?.area?.join(', ') || 'Remote';
  const contractTime = (adzunaJob.contract_time || '').toLowerCase();
  const jobTypeMap = {
    full_time: 'Full-time',
    part_time: 'Part-time',
    contract: 'Contract',
    internship: 'Internship',
    temporary: 'Temporary',
  };

  const workMode = adzunaJob.remote ? 'Remote' : location.toLowerCase().includes('remote') ? 'Remote' : 'Onsite';

  return {
    id: String(adzunaJob.id || adzunaJob.slug || `${Date.now()}-${Math.random()}`),
    title: adzunaJob.title || 'Unknown Role',
    company: adzunaJob.company?.display_name || 'Unknown Company',
    location: location,
    description: adzunaJob.description || adzunaJob.title || '',
    jobType: jobTypeMap[contractTime] || 'Full-time',
    workMode: workMode,
    skills: adzunaJob.tags?.map((tag) => tag?.label || tag).filter(Boolean) || [],
    datePosted: adzunaJob.created || new Date().toISOString(),
    postedAt: adzunaJob.created || new Date().toISOString(),
    applyUrl: adzunaJob.redirect_url || adzunaJob.url || '',
    salary: adzunaJob.salary_is_predicted ? '' : adzunaJob.salary_min && adzunaJob.salary_max ? `$${adzunaJob.salary_min} - $${adzunaJob.salary_max}` : '',
  };
}

async function fetchExternalJobs({ search = '', limit = 10, country = ADZUNA_COUNTRY }) {
  if (!ADZUNA_APP_ID || !ADZUNA_APP_KEY) {
    return null;
  }

  // List of major Adzuna country codes
  const countries = [
    'us', 'gb', 'ca', 'au', 'in', 'de', 'fr', 'nl', 'pl', 'za', 'br', 'ru', 'sg', 'nz', 'it', 'es', 'cz', 'mx', 'at', 'ch', 'be', 'fi', 'se', 'dk', 'no', 'ie', 'ar', 'pt', 'tr', 'hk', 'hu', 'il', 'ro', 'ua', 'ae', 'cl', 'co', 'gr', 'id', 'jp', 'kr', 'my', 'ph', 'sa', 'th', 'tw', 'vn'
  ];

  // If a specific country is requested, use only that
  const fetchCountries =
  country && country !== 'world'
    ? [country]
    : [ADZUNA_COUNTRY || 'us'];

  const allResults = [];
  for (const c of fetchCountries) {
    const queryParams = new URLSearchParams({
      app_id: ADZUNA_APP_ID,
      app_key: ADZUNA_APP_KEY,
      results_per_page: String(Math.max(1, Math.min(limit, 50))),
      what: search || '',
      where: '',
    });

    
    console.log("ADZUNA_APP_ID:", ADZUNA_APP_ID);
    console.log("ADZUNA_APP_KEY exists:", !!ADZUNA_APP_KEY);
    console.log("Country being used:", c);

    const url = `https://api.adzuna.com/v1/api/jobs/${encodeURIComponent(c)}/search/1?${queryParams.toString()}`;
    console.log("Adzuna URL:", url);
    
    try {
      const response = await fetch(url);
      const text = await response.text();

      console.log("Adzuna status:", response.status);
      console.log("Adzuna response:", text);

      if (!response.ok) {
        console.log("Adzuna request failed for country:", c);
        continue;
      }

      const data = JSON.parse(text);

      if (Array.isArray(data.results)) {
        allResults.push(...data.results.map(mapAdzunaJob));
      }
    } catch (err) {
    console.log("Adzuna fetch error for country:", c);
    console.log("Error details:", err?.message || err);
    continue;
  }
    // Limit API calls to avoid rate limits
    if (allResults.length >= limit) break;
  }
  // Remove duplicates by job id
  const uniqueJobs = [];
  const seen = new Set();
  for (const job of allResults) {
    if (!seen.has(job.id)) {
      seen.add(job.id);
      uniqueJobs.push(job);
    }
    if (uniqueJobs.length >= limit) break;
  }
  return uniqueJobs;
}

async function refineWithLangChain(job, resumeText, ruleMatch) {
  if (!process.env.OPENAI_API_KEY) {
    return {
      matchScore: ruleMatch.baseScore,
      explanation: `Skills: ${ruleMatch.matchingSkills.join(', ') || 'None'}; Experience: ${ruleMatch.relevantExperience}; Keywords: ${ruleMatch.keywordAlignment.join(', ') || 'None'}`,
    };
  }

  try {
    const { OpenAI } = await import('langchain/llms/openai');
    const { PromptTemplate } = await import('langchain/prompts');

    const llm = new OpenAI({
      openAIApiKey: process.env.OPENAI_API_KEY,
      temperature: 0.2,
      maxTokens: 220,
    });

    const truncatedResume = resumeText.slice(0, 1500);
    const prompt = `You are a job-matching assistant. For the given job posting and resume excerpt, refine the preliminary match.

Job Title: ${job.title}\nJob Description: ${job.description}\nJob Skills: ${job.skills?.join(', ') || ''}\n
Resume Excerpt: ${truncatedResume}\n
Preliminary base score: ${ruleMatch.baseScore}\nMatching skills: ${ruleMatch.matchingSkills.join(', ') || 'None'}\nRelevant experience note: ${ruleMatch.relevantExperience}\nKeyword alignment: ${ruleMatch.keywordAlignment.join(', ') || 'None'}\n
Output JSON only with keys: matchScore (integer 0-100) and explanation (short, 1-2 sentences and a bullet list of the top 3 matching points).`;

    const response = await llm.call(prompt);

    const parsed = tryParseJson(response);
    if (parsed && typeof parsed.matchScore === 'number' && typeof parsed.explanation === 'string') {
      return {
        matchScore: Math.max(0, Math.min(100, Math.round(parsed.matchScore))),
        explanation: parsed.explanation.trim(),
      };
    }

    return {
      matchScore: ruleMatch.baseScore,
      explanation: `Skills: ${ruleMatch.matchingSkills.join(', ') || 'None'}; Experience: ${ruleMatch.relevantExperience}; Keywords: ${ruleMatch.keywordAlignment.join(', ') || 'None'}`,
    };
  } catch (err) {
    // LangChain not available or failed; fallback to rule-based
    return {
      matchScore: ruleMatch.baseScore,
      explanation: `Skills: ${ruleMatch.matchingSkills.join(', ') || 'None'}; Experience: ${ruleMatch.relevantExperience}; Keywords: ${ruleMatch.keywordAlignment.join(', ') || 'None'}`,
    };
  }
}

async function getMatchForJob(job, resume) {
  const resumeText = resume?.text || '';
  const resumeHash = hashText(resumeText);
  const cacheKey = `${resumeHash}:${job.id}`;

  if (jobMatchCache.has(cacheKey)) {
    return jobMatchCache.get(cacheKey);
  }

  const ruleMatch = computeRuleMatch(job, resumeText);
  const refined = await refineWithLangChain(job, resumeText, ruleMatch);

  const result = {
    matchScore: refined.matchScore,
    explanation: refined.explanation,
    matchingSkills: ruleMatch.matchingSkills,
    relevantExperience: ruleMatch.relevantExperience,
    keywordAlignment: ruleMatch.keywordAlignment,
  };

  jobMatchCache.set(cacheKey, result);
  return result;
}

export async function jobsRoutes(fastify, options) {
  // Shared handler for all job list endpoints

  const handleGetJobs = async (request, reply) => {
    const { limit = 10, search = '', resumeId = '', country = 'world' } = request.query;

    let jobs = [];
    let usingFallback = false;

    // Try external job source first (Adzuna), fallback to mock
    if (ADZUNA_APP_ID && ADZUNA_APP_KEY) {
      try {
        const fetched = await fetchExternalJobs({ search, limit: parseInt(limit, 10) || 10, country });
        console.log('[Adzuna Fetch]', { search, limit, country, fetchedCount: Array.isArray(fetched) ? fetched.length : 0 });
        if (Array.isArray(fetched) && fetched.length > 0) {
          jobs = fetched;
        } else {
          console.warn('[Adzuna] No jobs returned, will use fallback.');
        }
      } catch (err) {
        console.error('[Adzuna Fetch Error]', err);
      }
    }

    if (!jobs.length) {
      usingFallback = true;
      console.log('[Jobs] Using fallback/mock jobs.');
      console.log("ADZUNA_APP_ID:", process.env.ADZUNA_APP_ID);
      console.log("ADZUNA_APP_KEY exists:", !!process.env.ADZUNA_APP_KEY);
      console.log("ADZUNA_COUNTRY:", process.env.ADZUNA_COUNTRY);

      jobs = [...mockJobs];
      if (search) {
        const searchValue = String(search).toLowerCase().trim();
        const searchTerms = searchValue.split(/\s+/).filter(Boolean);

        jobs = jobs.filter((job) => {
          const haystack = `${job.title} ${job.company} ${job.description || ''} ${job.location || ''}`.toLowerCase();
          const isUSQuery = ['united states', 'united states of america', 'usa', 'us'].includes(searchValue);
          if (isUSQuery) return true;
          return searchTerms.every((term) => haystack.includes(term));
        });
      }
    }

    jobs = jobs.slice(0, parseInt(limit, 10) || 10);

    let resume = null;
    if (resumeId) {
      const resumes = await loadResumes();
      resume = resumes.find((r) => r.id === resumeId) || null;
    }

    if (!resume) {
      const resumes = await loadResumes();
      resume = resumes.length > 0 ? resumes[0] : null;
    }

    const scoredJobs = await Promise.all(
      jobs.map(async (job) => {
        const result = resume ? await getMatchForJob(job, resume) : null;
        return {
          ...job,
          matchScore: result?.matchScore ?? 0,
          matchExplanation: result?.explanation || 'Upload a resume to enable match scoring.',
        };
      })
    );

    return reply.code(200).send({
      success: true,
      source: usingFallback ? 'mock' : 'external',
      count: scoredJobs.length,
      total: jobs.length,
      jobs: scoredJobs,
    });
  };

  // Get all jobs endpoint (exact and trailing slash)
  fastify.get('/jobs', handleGetJobs);
  fastify.get('/jobs/', handleGetJobs);

  // Get single job endpoint
  fastify.get('/jobs/:id', async (request, reply) => {
    const { id } = request.params;
    const job = mockJobs.find((j) => j.id === id);

    if (!job) {
      return reply.code(404).send({
        success: false,
        message: 'Job not found',
      });
    }

    return {
      success: true,
      job: job,
    };
  });

  // Search jobs endpoint
  fastify.post('/jobs/search', async (request, reply) => {
    const { query } = request.body;

    if (!query) {
      return reply.code(400).send({
        success: false,
        message: 'Search query is required',
      });
    }

    const results = mockJobs.filter(
      (job) =>
        job.title.toLowerCase().includes(query.toLowerCase()) ||
        job.company.toLowerCase().includes(query.toLowerCase()) ||
        job.description.toLowerCase().includes(query.toLowerCase()) ||
        job.location.toLowerCase().includes(query.toLowerCase())
    );

    return {
      success: true,
      count: results.length,
      jobs: results,
    };
  });
}