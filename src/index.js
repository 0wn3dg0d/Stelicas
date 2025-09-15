const fs = require('fs').promises;
const path = require('path');
const axios = require('axios');
const { app } = require('electron');

const appPath = app.isPackaged
  ? path.dirname(app.getPath('exe'))
  : app.getAppPath();

const outputFolder = path.join(appPath, 'output');

const BATCH_SIZE = 200;
const CONCURRENT_REQUESTS = 10;
const DELAY_BETWEEN_CHUNKS = 1000;

const writeToCsv = async (data, outputPath, headers, delimiter = '\t') => {
  try {
    const headerLine = headers.join(delimiter) + '\n';
    const dataLines = data.map(row => {
      return headers.map(header => {
        const value = row[header];
        return value === undefined || value === null ? '' : value;
      }).join(delimiter);
    }).join('\n');
    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    await fs.writeFile(outputPath, headerLine + dataLines, 'utf8');
    console.log('Data successfully written to CSV file:', outputPath);
  } catch (err) {
    console.error('Error writing to CSV file:', err);
  }
};

const getGameDetails = async (appIds, language, countryCode) => {
  const url = 'https://api.steampowered.com/IStoreBrowseService/GetItems/v1';
  const requestData = {
    ids: appIds.map(id => ({ appid: id })),
    context: { language: language, country_code: countryCode, steam_realm: 1 },
    data_request: {
      include_assets: true,
      include_release: true,
      include_platforms: true,
      include_all_purchase_options: true,
      include_screenshots: true,
      include_trailers: true,
      include_ratings: true,
      include_tag_count: true,
      include_reviews: true,
      include_basic_info: true,
      include_supported_languages: true,
      include_full_description: true,
      include_included_items: true,
    },
  };
  try {
    const response = await axios.get(`${url}?input_json=${encodeURIComponent(JSON.stringify(requestData))}`);
    return response.data.response.store_items || [];
  } catch (err) {
    console.error(`Error fetching game details for batch, returning empty. Error: ${err.message}`);
    return [];
  }
};

const getGameDetailsBatched = async (appIds, language, countryCode, updateCallback) => {
    const allGameDetails = [];
    const chunks = [];
  
    for (let i = 0; i < appIds.length; i += BATCH_SIZE) {
      chunks.push(appIds.slice(i, i + BATCH_SIZE));
    }
  
    const totalChunks = chunks.length;
    let processedChunks = 0;
  
    for (let i = 0; i < totalChunks; i += CONCURRENT_REQUESTS) {
      const currentBatchOfChunks = chunks.slice(i, i + CONCURRENT_REQUESTS);
      
      console.log(`Processing chunk group starting at index ${i}. Total groups: ${Math.ceil(totalChunks/CONCURRENT_REQUESTS)}`);
  
      const promises = currentBatchOfChunks.map(chunk => getGameDetails(chunk, language, countryCode));
  
      try {
        const results = await Promise.all(promises);
        
        results.forEach(gameDetails => {
          if (Array.isArray(gameDetails)) {
            allGameDetails.push(...gameDetails);
          }
        });
  
        processedChunks += currentBatchOfChunks.length;
  
        const progress = 50 + Math.floor((processedChunks / totalChunks) * 40);
        updateCallback(progress, `Fetching game details (${processedChunks}/${totalChunks} batches)...`);
  
      } catch (err) {
        console.error('Error processing a chunk of requests:', err);
      }
  
      if (i + CONCURRENT_REQUESTS < totalChunks) {
        await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_CHUNKS));
      }
    }
  
    return allGameDetails;
};

const loadTags = async () => {
  const tagsMap = new Map();
  try {
    const tagsFile = await fs.readFile(path.join(appPath, 'data', 'tags.txt'), 'utf8');
    tagsFile.split('\n').forEach(line => {
      const [id, name] = line.trim().split('\t');
      if (id && name) {
        tagsMap.set(parseInt(id), name);
      }
    });
  } catch (err) {
    console.error('Error loading tags:', err);
  }
  return tagsMap;
};

const formatDate = (timestamp) => {
  if (!timestamp) return '';
  const date = new Date(parseInt(timestamp) * 1000);
  return `${date.getDate().toString().padStart(2, '0')}.${(date.getMonth() + 1).toString().padStart(2, '0')}.${date.getFullYear()}`;
};

const getLanguageSupport = (supportedLanguages, languageId) => {
  const language = supportedLanguages.find(lang => lang.elanguage === languageId) || {};
  const { supported = false, full_audio = false, subtitles = false } = language;
  if (supported && full_audio && subtitles) return '{TRUE}';
  if (!supported && !full_audio && !subtitles) return '{FALSE}';
  return `{${supported};${full_audio};${subtitles}}`;
};

const main = async (steam3Id, language, countryCode, supportedLanguage, updateCallback, steamPath) => {
  const gameCategories = new Map();
  const tagsMap = await loadTags();
  try {
    updateCallback(10, 'Finding Steam data file...');
    if (!steamPath) {
        throw new Error('Steam installation path not found. Please select it manually.');
    }
    const collectionsFilePath = path.join(steamPath, 'userdata', steam3Id, 'config', 'cloudstorage', 'cloud-storage-namespace-1.json');
    console.log(`Reading collections from: ${collectionsFilePath}`);
    updateCallback(20, 'Reading collections file...');
    const fileContent = await fs.readFile(collectionsFilePath, 'utf8');
    const collectionsData = JSON.parse(fileContent);

    updateCallback(30, 'Parsing collections...');
    for (const collectionArray of collectionsData) {
      const key = collectionArray[0];
      const data = collectionArray[1];
      if (key.startsWith('user-collections.') && !data.is_deleted) {
        try {
          const collectionValue = JSON.parse(data.value);
          const collectionName = collectionValue.name;
          const gameIds = collectionValue.added;
          if (collectionName && Array.isArray(gameIds)) {
            for (const gameId of gameIds) {
              if (!gameCategories.has(gameId)) {
                gameCategories.set(gameId, new Set());
              }
              gameCategories.get(gameId).add(collectionName);
            }
          }
        } catch (e) {}
      }
    }

    if (gameCategories.size === 0) {
      updateCallback(100, 'No categories found. The output files will be empty.');
      console.log('No game categories were found in the JSON file.');
    }

    updateCallback(40, 'Preparing data for CSV...');
    const appIds = Array.from(gameCategories.keys());
    const idCategoryData = Array.from(gameCategories.entries()).map(([id, categories]) => ({
      game_id: id,
      categories: Array.from(categories).join(';'),
    }));
    await fs.mkdir(outputFolder, { recursive: true });
    await writeToCsv(idCategoryData, path.join(outputFolder, 'id_categories.csv'), ['game_id', 'categories']);
    
    if (appIds.length === 0) {
      await writeToCsv([], path.join(outputFolder, 'final_data.csv'), [
        'game_id', 'name', 'categories', 'type', 'tags', 'release_date',
        'review_percentage', 'review_count', 'is_free', 'is_early_access', 'publishers', 'developers',
        'franchises', 'short_description', 'supported_language', 'Steam-Link', 'Pic'
      ]);
      updateCallback(100, 'Process completed!');
      return;
    }

    updateCallback(50, 'Fetching game details...');
    const gameDetails = await getGameDetailsBatched(appIds, language, countryCode, updateCallback);

    updateCallback(90, 'Preparing final CSV data...');
    const csvData = gameDetails.map(game => {
      const releaseDate = game.release?.original_release_date || game.release?.steam_release_date;
      return {
        game_id: game.appid,
        name: game.name || '',
        categories: Array.from(gameCategories.get(game.appid) || []).join(';'),
        type: typeof game.type === 'number' ? game.type : '',
        tags: (game.tagids || []).map(tagId => tagsMap.get(tagId) || tagId).join(';'),
        release_date: formatDate(releaseDate),
        review_percentage: game.reviews?.summary_filtered?.percent_positive ?? '',
        review_count: game.reviews?.summary_filtered?.review_count ?? '',
        is_free: game.is_free ? 'true' : '',
        is_early_access: game.is_early_access ? 'true' : '',
        publishers: (game.basic_info?.publishers || []).map(p => p.name).join(';'),
        developers: (game.basic_info?.developers || []).map(d => d.name).join(';'),
        franchises: (game.basic_info?.franchises || []).map(f => f.name).join(';'),
        short_description: `"${(game.basic_info?.short_description || '').replace(/"/g, '""').replace(/\r?\n/g, ' ')}"`,
        supported_language: getLanguageSupport(game.supported_languages || [], parseInt(supportedLanguage)),
        'Steam-Link': `https://steamcommunity.com/app/${game.appid}`,
        'Pic': game.assets?.header ? `https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/${game.appid}/${game.assets.header}` : '',
      };
    });

    await writeToCsv(
      csvData,
      path.join(outputFolder, 'final_data.csv'),
      [
        'game_id', 'name', 'categories', 'type', 'tags', 'release_date',
        'review_percentage', 'review_count', 'is_free', 'is_early_access', 'publishers', 'developers',
        'franchises', 'short_description', 'supported_language', 'Steam-Link', 'Pic'
      ]
    );
    updateCallback(100, 'Process completed!');
  } catch (err) {
    console.error('Error in main:', err);
    updateCallback(0, `Error: ${err.message}`);
  }
};

module.exports = { main };