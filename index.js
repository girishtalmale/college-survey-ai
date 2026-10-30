#!/usr/bin/env node

import Parser from 'rss-parser';
import chalk from 'chalk';
import minimist from 'minimist';

const parser = new Parser();

// Helper to calculate relative time
function timeAgo(dateString) {
  if (!dateString) return 'unknown date';
  const now = new Date();
  const past = new Date(dateString);
  const msPerMinute = 60 * 1000;
  const msPerHour = msPerMinute * 60;
  const msPerDay = msPerHour * 24;
  const elapsed = now - past;

  if (elapsed < msPerMinute) {
    return 'just now';
  } else if (elapsed < msPerHour) {
    const mins = Math.round(elapsed / msPerMinute);
    return `${mins} minute${mins > 1 ? 's' : ''} ago`;
  } else if (elapsed < msPerDay) {
    const hours = Math.round(elapsed / msPerHour);
    return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  } else {
    const days = Math.round(elapsed / msPerDay);
    return `${days} day${days > 1 ? 's' : ''} ago`;
  }
}

// Display help menu
function showHelp() {
  console.log(`
${chalk.bold.cyan('Google News CLI')} - Get the latest news directly in your terminal.

${chalk.bold('Usage:')}
  ${chalk.green('google-news')} [options]
  ${chalk.green('node index.js')} [options]

${chalk.bold('Options:')}
  ${chalk.yellow('-s, --search <query>')}   Search for specific topics/keywords
  ${chalk.yellow('-l, --limit <number>')}    Limit the number of news items (default: 10)
  ${chalk.yellow('-h, --help')}              Show this help message

${chalk.bold('Examples:')}
  node index.js
  node index.js --search "artificial intelligence"
  node index.js -s technology -l 5
`);
}

async function main() {
  // Parse command line arguments
  const argv = minimist(process.argv.slice(2), {
    alias: {
      s: 'search',
      l: 'limit',
      h: 'help'
    },
    string: ['search'],
    boolean: ['help'],
    default: {
      limit: 10
    }
  });

  if (argv.help) {
    showHelp();
    return;
  }

  const query = argv.search;
  const limit = parseInt(argv.limit, 10);

  if (isNaN(limit) || limit <= 0) {
    console.error(chalk.red('Error: Limit must be a positive number.'));
    process.exit(1);
  }

  // Construct Google News RSS Feed URL
  let feedUrl = 'https://news.google.com/rss?hl=en-US&gl=US&ceid=US:en';
  let titleHeader = 'Top News Stories';

  if (query) {
    feedUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-US&gl=US&ceid=US:en`;
    titleHeader = `Search Results for: "${query}"`;
  }

  console.log(chalk.cyan(`\nFetching news from Google News...`));

  try {
    const feed = await parser.parseURL(feedUrl);
    
    if (!feed.items || feed.items.length === 0) {
      console.log(chalk.yellow(`\nNo news items found for query: "${query}"`));
      return;
    }

    console.log(chalk.bold.green(`\n=== ${titleHeader.toUpperCase()} ===`));
    console.log(chalk.dim(`Found ${feed.items.length} stories. Showing top ${Math.min(limit, feed.items.length)}:\n`));

    const itemsToShow = feed.items.slice(0, limit);

    itemsToShow.forEach((item, index) => {
      // Google News title format: "Headline - Source"
      const title = item.title || 'No Title';
      const lastDashIndex = title.lastIndexOf(' - ');
      let headline = title;
      let source = 'Google News';

      if (lastDashIndex !== -1) {
        headline = title.substring(0, lastDashIndex);
        source = title.substring(lastDashIndex + 3);
      }

      const formattedIndex = chalk.bold.cyan(`${index + 1}.`);
      console.log(`${formattedIndex} ${chalk.bold(headline)}`);
      
      const meta = [
        chalk.green(source),
        chalk.yellow(timeAgo(item.pubDate))
      ].join(' • ');

      console.log(`   ${meta}`);
      if (item.link) {
        console.log(`   ${chalk.dim.underline.blue(item.link)}`);
      }
      console.log(); // empty line for spacing
    });

  } catch (error) {
    console.error(chalk.red(`\nFailed to fetch news: ${error.message}`));
    console.log(chalk.dim('Please check your internet connection and try again.\n'));
    process.exit(1);
  }
}

main();
