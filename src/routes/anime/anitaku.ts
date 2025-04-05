import { FastifyRequest, FastifyReply, FastifyInstance, RegisterOptions } from 'fastify';
import { ANIME } from '@consumet/extensions';
import { StreamingServers } from '@consumet/extensions/dist/models';
import cache from '../../utils/cache';
import { redis } from '../../main';
import { Redis } from 'ioredis';

const routes = async (fastify: FastifyInstance, options: RegisterOptions) => {
  const anitaku = new ANIME.Anitaku(process.env.ANITAKU_URL);
  const redisCacheTime = 60 * 60;
  const redisPrefix = 'anitaku:';

  fastify.get('/', (_, rp) => {
    rp.status(200).send({
      intro:
        "Welcome to the Anitaku provider: check out the provider's website @ https://anitaku.so/",
      routes: [
        '/:query',
        '/info/:id',
        '/watch/:episodeId',
        '/servers/:episodeId',
        '/genre/:genre',
        '/genre/list',
        '/top-airing',
        '/movies',
        '/popular',
        '/recent-episodes',
        '/anime-list',
        '/download',
      ],
      documentation: 'https://docs.consumet.org/#tag/anitaku',
    });
  });

  fastify.get('/:query', async (request: FastifyRequest, reply: FastifyReply) => {
    const query = (request.params as { query: string }).query;
    const page = (request.query as { page: number }).page || 1;

    const res = redis ? await cache.fetch(
      redis as Redis,
      `${redisPrefix}search;${page};${query}`,
      async () => await anitaku.search(query, page),
      redisCacheTime,
    ) : await anitaku.search(query, page);

    reply.status(200).send(res);
  });

  fastify.get('/info/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const id = decodeURIComponent((request.params as { id: string }).id);

    try {
      const res = redis ? await cache.fetch(
        redis as Redis,
        `${redisPrefix}info;${id}`,
        async () => await anitaku
          .fetchAnimeInfo(id)
          .catch((err) => reply.status(404).send({ message: err })),
        redisCacheTime,
      ) : await anitaku
        .fetchAnimeInfo(id)
        .catch((err) => reply.status(404).send({ message: err }));

      reply.status(200).send(res);
    } catch {
      reply.status(500).send({ message: 'Something went wrong. Please try again later.' });
    }
  });

  fastify.get('/genre/:genre', async (request: FastifyRequest, reply: FastifyReply) => {
    const genre = (request.params as { genre: string }).genre;
    const page = (request.query as { page: number }).page ?? 1;

    try {
      const res = redis ? await cache.fetch(
        redis as Redis,
        `${redisPrefix}genre;${page};${genre}`,
        async () => await anitaku
          .fetchGenreInfo(genre, page)
          .catch((err) => reply.status(404).send({ message: err })),
        redisCacheTime,
      ) : await anitaku
        .fetchGenreInfo(genre, page)
        .catch((err) => reply.status(404).send({ message: err }));

      reply.status(200).send(res);
    } catch {
      reply.status(500).send({ message: 'Something went wrong. Please try again later.' });
    }
  });

  fastify.get('/genre/list', async (_, reply: FastifyReply) => {
    try {
      const res = redis ? await cache.fetch(
        redis as Redis,
        `${redisPrefix}genre-list`,
        async () => await anitaku
          .fetchGenreList()
          .catch((err) => reply.status(404).send({ message: err })),
        redisCacheTime * 24,
      ) : await anitaku
        .fetchGenreList()
        .catch((err) => reply.status(404).send({ message: err }));

      reply.status(200).send(res);
    } catch {
      reply.status(500).send({ message: 'Something went wrong. Please try again later.' });
    }
  });

  fastify.get('/watch/:episodeId', async (request: FastifyRequest, reply: FastifyReply) => {
    const episodeId = (request.params as { episodeId: string }).episodeId;
    const server = (request.query as { server: StreamingServers }).server;

    if (server && !Object.values(StreamingServers).includes(server)) {
      return reply.status(400).send('Invalid server');
    }

    try {
      const res = redis ? await cache.fetch(
        redis as Redis,
        `${redisPrefix}watch;${server};${episodeId}`,
        async () => await anitaku
          .fetchEpisodeSources(episodeId, server)
          .catch((err) => reply.status(404).send({ message: err })),
        redisCacheTime,
      ) : await anitaku
        .fetchEpisodeSources(episodeId, server)
        .catch((err) => reply.status(404).send({ message: err }));

      reply.status(200).send(res);
    } catch {
      reply.status(500).send({ message: 'Something went wrong. Please try again later.' });
    }
  });

  fastify.get('/servers/:episodeId', async (request: FastifyRequest, reply: FastifyReply) => {
    const episodeId = (request.params as { episodeId: string }).episodeId;

    try {
      const res = redis ? await cache.fetch(
        redis as Redis,
        `${redisPrefix}servers;${episodeId}`,
        async () => await anitaku
          .fetchEpisodeServers(episodeId)
          .catch((err) => reply.status(404).send({ message: err })),
        redisCacheTime,
      ) : await anitaku
        .fetchEpisodeServers(episodeId)
        .catch((err) => reply.status(404).send({ message: err }));

      reply.status(200).send(res);
    } catch {
      reply.status(500).send({ message: 'Something went wrong. Please try again later.' });
    }
  });

  fastify.get('/top-airing', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const page = (request.query as { page: number }).page ?? 1;

      const res = redis ? await cache.fetch(
        redis as Redis,
        `${redisPrefix}top-airing;${page}`,
        async () => await anitaku.fetchTopAiring(page),
        redisCacheTime,
      ) : await anitaku.fetchTopAiring(page);

      reply.status(200).send(res);
    } catch {
      reply.status(500).send({ message: 'Something went wrong. Contact developers for help.' });
    }
  });

  fastify.get('/movies', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const page = (request.query as { page: number }).page ?? 1;

      const res = redis ? await cache.fetch(
        redis as Redis,
        `${redisPrefix}movies;${page}`,
        async () => await anitaku.fetchRecentMovies(page),
        redisCacheTime,
      ) : await anitaku.fetchRecentMovies(page);

      reply.status(200).send(res);
    } catch {
      reply.status(500).send({ message: 'Something went wrong. Contact developers for help.' });
    }
  });

  fastify.get('/popular', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const page = (request.query as { page: number }).page ?? 1;

      const res = redis ? await cache.fetch(
        redis as Redis,
        `${redisPrefix}popular;${page}`,
        async () => await anitaku.fetchPopular(page),
        redisCacheTime,
      ) : await anitaku.fetchPopular(page);

      reply.status(200).send(res);
    } catch {
      reply.status(500).send({ message: 'Something went wrong. Contact developers for help.' });
    }
  });

  fastify.get('/recent-episodes', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const type = (request.query as { type: number }).type ?? 1;
      const page = (request.query as { page: number }).page ?? 1;

      const res = redis ? await cache.fetch(
        redis as Redis,
        `${redisPrefix}recent-episodes;${page};${type}`,
        async () => await anitaku.fetchRecentEpisodes(page, type),
        redisCacheTime,
      ) : await anitaku.fetchRecentEpisodes(page, type);

      reply.status(200).send(res);
    } catch {
      reply.status(500).send({ message: 'Something went wrong. Contact developers for help.' });
    }
  });

  fastify.get('/anime-list', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const page = (request.query as { page: number }).page ?? 1;

      const res = redis ? await cache.fetch(
        redis as Redis,
        `${redisPrefix}anime-list;${page}`,
        async () => await anitaku.fetchAnimeList(page),
        redisCacheTime,
      ) : await anitaku.fetchAnimeList(page);

      reply.status(200).send(res);
    } catch {
      reply.status(500).send({ message: 'Something went wrong. Contact developers for help.' });
    }
  });

  fastify.get('/download', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const downloadLink = (request.query as { link: string }).link;
      if (!downloadLink) return reply.status(400).send('Invalid link');

      const res = redis ? await cache.fetch(
        redis as Redis,
        `${redisPrefix}download-${downloadLink}`,
        async () => await anitaku
          .fetchDirectDownloadLink(downloadLink)
          .catch((err) => reply.status(404).send({ message: err })),
        redisCacheTime * 24,
      ) : await anitaku
        .fetchDirectDownloadLink(downloadLink, process.env.RECAPTCHATOKEN ?? '')
        .catch((err) => reply.status(404).send({ message: err }));

      reply.status(200).send(res);
    } catch {
      reply.status(500).send({ message: 'Something went wrong. Please try again later.' });
    }
  });
};

export default routes;
