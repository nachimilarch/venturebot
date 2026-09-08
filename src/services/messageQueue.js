import { sendTemplateMessage } from './whatsappService.js';
import MessageLog from '../models/MessageLog.js';
import { log } from '../utils/logger.js';

const BATCH_SIZE = parseInt(process.env.BATCH_SIZE || '50', 10);
const BATCH_INTERVAL_MS = parseInt(process.env.BATCH_INTERVAL_MS || '60000', 10);

/**
 * In-memory simple queue (for single-node deployment).
 * For distributed prod, replace with Redis + Bull/Resque.
 */
const queue = [];

function enqueue(job) {
  queue.push(job);
}

async function processBatch() {
  if (!queue.length) {
    return;
  }

  const batch = queue.splice(0, BATCH_SIZE);
  log(`Processing batch of ${batch.length} messages`);

  for (const job of batch) {
    const { messageLogId, to, template_name, template_language, templateComponents } = job;

    try {
      const result = await sendTemplateMessage({
        to,
        template_name,
        template_language,
        templateComponents
      });

      if (result.success) {
        await MessageLog.markSent(messageLogId, result.messageId, result.raw);
      } else {
        await MessageLog.markFailed(
          messageLogId,
          result.error_code,
          result.error_message,
          result.raw
        );
      }
    } catch (err) {
      log('Error processing job', err.message);
      await MessageLog.markFailed(messageLogId, null, err.message, null);
    }
  }
}

/* run every BATCH_INTERVAL_MS */
setInterval(() => {
  processBatch().catch(err => log('Batch processor error', err.message));
}, BATCH_INTERVAL_MS);

export { enqueue };
