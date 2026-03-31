export async function jobsRoutes(fastify) {
  fastify.get('/jobs', async (request, reply) => {
    try {
      const { search = '', location = '', page = 1 } = request.query || {};

      const APP_ID = process.env.ADZUNA_APP_ID;
      const APP_KEY = process.env.ADZUNA_APP_KEY;
      const COUNTRY = process.env.ADZUNA_COUNTRY || 'us';

      if (!APP_ID || !APP_KEY) {
        return reply.send({
          success: false,
          message: 'Missing Adzuna API keys',
          jobs: [],
        });
      }

      const queryParams = new URLSearchParams({
        app_id: APP_ID,
        app_key: APP_KEY,
        results_per_page: '20',
        what: search,
        where: location,
        content_type: 'application/json',
      });

      const url = `https://api.adzuna.com/v1/api/jobs/${COUNTRY}/search/${page}?${queryParams.toString()}`;

      const response = await fetch(url);
      const data = await response.json();

      if (!response.ok) {
        return reply.send({
          success: false,
          message: data?.description || 'Failed to fetch jobs',
          jobs: [],
        });
      }

      const jobs = (data.results || []).map((job) => ({
        id: job.id,
        title: job.title,
        company: job.company?.display_name || 'Unknown',
        location: job.location?.display_name || 'Unknown',
        description: job.description,
        applyUrl: job.redirect_url,
        postedAt: job.created,
      }));

      return reply.send({
        success: true,
        source: 'live',
        jobs,
      });
    } catch (err) {
      console.error('Jobs error:', err);
      return reply.send({
        success: false,
        message: 'Server error',
        jobs: [],
      });
    }
  });
}