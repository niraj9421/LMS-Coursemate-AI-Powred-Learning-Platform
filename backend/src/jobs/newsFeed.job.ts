import cron from 'node-cron';
import axios from 'axios';
import { News } from '../models/News';
import { Category } from '../models/Category';
import { env } from '../config/env';
import { logger } from '../utils/logger';

const NEWS_CATEGORIES = ['artificial-intelligence', 'technology', 'web-development', 'cybersecurity', 'startups'];

/**
 * Task 17.8 — News feed refresh cron job.
 * Runs every 6 hours. Fetches technology news from News API and upserts articles.
 */
export function startNewsFeedJob(): void {
  cron.schedule('0 */6 * * *', async () => {
    logger.info('[cron] Running news feed refresh job...');
    try {
      for (const categorySlug of NEWS_CATEGORIES) {
        // Find or create category
        let category = await Category.findOne({ slug: categorySlug });
        if (!category) {
          category = await Category.create({
            name: categorySlug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
            slug: categorySlug,
          });
        }

        const response = await axios.get('https://newsapi.org/v2/everything', {
          params: {
            q: categorySlug.replace(/-/g, ' '),
            language: 'en',
            sortBy: 'publishedAt',
            pageSize: 10,
            apiKey: env.NEWS_API_KEY,
          },
          timeout: 10000,
        });

        const articles = response.data?.articles ?? [];
        let upserted = 0;

        for (const article of articles) {
          if (!article.url || !article.title) continue;
          try {
            await News.findOneAndUpdate(
              { sourceUrl: article.url },
              {
                title: article.title,
                summary: article.description ?? article.title,
                imageUrl: article.urlToImage,
                sourceUrl: article.url,
                sourceName: article.source?.name ?? 'Unknown',
                category: category._id,
                publishedAt: new Date(article.publishedAt ?? Date.now()),
              },
              { upsert: true, new: true },
            );
            upserted++;
          } catch {
            // Skip duplicate or invalid articles
          }
        }

        logger.info(`[cron] News feed: upserted ${upserted} articles for category "${categorySlug}".`);
      }
      logger.info('[cron] News feed refresh completed.');
    } catch (err) {
      logger.error('[cron] News feed refresh failed:', err);
    }
  });

  logger.info('[cron] News feed refresh job scheduled (every 6 hours).');
}
