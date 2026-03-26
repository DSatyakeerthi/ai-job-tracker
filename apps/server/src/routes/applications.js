import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '../../data');
const APPLICATIONS_FILE = path.join(DATA_DIR, 'applications.json');

async function ensureDataDir() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
  } catch (err) {
    console.error('Error creating data directory:', err);
  }
}

async function loadApplications() {
  try {
    await ensureDataDir();
    const data = await fs.readFile(APPLICATIONS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (err) {
    return [];
  }
}

async function saveApplications(applications) {
  try {
    await ensureDataDir();
    await fs.writeFile(APPLICATIONS_FILE, JSON.stringify(applications, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving applications:', err);
    throw err;
  }
}

export async function applicationsRoutes(fastify, options) {
  // Get all applications
  fastify.get('/applications', async (request, reply) => {
    try {
      const applications = await loadApplications();
      return reply.code(200).send({
        success: true,
        applications: applications,
      });
    } catch (error) {
      return reply.code(500).send({
        success: false,
        message: 'Error fetching applications',
      });
    }
  });

  // Create new application
  fastify.post('/applications', async (request, reply) => {
    try {
      const { jobId, jobTitle, company, applyUrl, status, appliedAt, timeline } = request.body;

      if (!jobId || !jobTitle || !company) {
        return reply.code(400).send({
          success: false,
          message: 'Missing required fields: jobId, jobTitle, company',
        });
      }

      const applications = await loadApplications();
      const newApplication = {
        id: uuidv4(),
        jobId,
        jobTitle,
        company,
        applyUrl: applyUrl || '',
        status: status || 'Applied',
        appliedAt: appliedAt || new Date().toISOString(),
        timeline: timeline || [{ event: 'Applied', timestamp: new Date().toISOString() }],
      };

      applications.push(newApplication);
      await saveApplications(applications);

      return reply.code(201).send({
        success: true,
        application: newApplication,
      });
    } catch (error) {
      return reply.code(500).send({
        success: false,
        message: 'Error creating application',
      });
    }
  });

  // Update application status
  fastify.patch('/applications/:id/status', async (request, reply) => {
    try {
      const { id } = request.params;
      const { status } = request.body;

      if (!status) {
        return reply.code(400).send({
          success: false,
          message: 'Status is required',
        });
      }

      const applications = await loadApplications();
      const application = applications.find((app) => app.id === id);

      if (!application) {
        return reply.code(404).send({
          success: false,
          message: 'Application not found',
        });
      }

      application.status = status;
      application.timeline.push({
        event: `Status updated to ${status}`,
        timestamp: new Date().toISOString(),
      });

      await saveApplications(applications);

      return reply.code(200).send({
        success: true,
        application: application,
      });
    } catch (error) {
      return reply.code(500).send({
        success: false,
        message: 'Error updating application status',
      });
    }
  });
}