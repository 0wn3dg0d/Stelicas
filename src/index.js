const { Level } = require('level');
const iconv = require('iconv-lite');
const fs = require('fs').promises;
const path = require('path');
const axios = require('axios');
const { app } = require('electron');

const appPath = app.isPackaged 
  ? path.dirname(app.getPath('exe'))
  : app.getAppPath();

const originalDbPath = path.join(process.env.LOCALAPPDATA, 'Steam', 'htmlcache', 'Local Storage', 'leveldb');
const copyDbPath = path.join(appPath, 'leveldb-copy');
const outputFolder = path.join(appPath, 'output');

const BATCH_SIZE = 200;
const DELAY_BETWEEN_BATCHES = 1000;

const deleteFolder = async (folderPath) => {
  try {
    await fs.rm(folderPath, { recursive: true, force: true });
    console.log(`Deleted old copy: ${folderPath}`);
  } catch (err) {
    console.error(`Error deleting folder ${folderPath}:`, err);
  }
};

const copyFolder = async (source, target) => {
  try {
    await fs.mkdir(target, { recursive: true });
    const files = await fs.readdir(source);

    for (const file of files) {
      const sourcePath = path.join(source, file);
      const targetPath = path.join(target, file);
      const stat = await fs.lstat(sourcePath);

      if (stat.isDirectory()) {
        await copyFolder(sourcePath, targetPath);
      } else {
        await fs.copyFile(sourcePath, targetPath);
      }
    }
    console.log(`Copy completed: ${source} -> ${target}`);
  } catch (err) {
    console.error(`Error copying folder ${source}:`, err);
  }
};

const unserializeCollections = (input) => {
  const transformed = input.startsWith('01') 
    ? input.slice(2).match(/.{1,2}/g).join('00').concat('00') 
    : input.slice(2);
  const iBuf = Buffer.from(transformed, 'hex');
  const decoded = iconv.decode(iBuf, 'utf16le');
  const collections = JSON.parse(decoded);
  const output = {};

  collections.forEach(([key, value]) => {
    if (value.value) {
      value.value = JSON.parse(value.value);
    }
    output[key] = value;
  });

  return output;
};

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

const getGameDetailsBatched = async (appIds, language, countryCode, updateCallback) => {
  const allGameDetails = [];
  const totalBatches = Math.ceil(appIds.length / BATCH_SIZE);

  for (let i = 0; i < appIds.length; i += BATCH_SIZE) {
    const batch = appIds.slice(i, i + BATCH_SIZE);
    console.log(`Fetching batch ${i / BATCH_SIZE + 1} of ${totalBatches}`);

    try {
      const gameDetails = await getGameDetails(batch, language, countryCode);
      allGameDetails.push(...gameDetails);

      const progress = 70 + Math.floor(((i / BATCH_SIZE + 1) / totalBatches) * 20);
      updateCallback(progress, `Fetching game details (${i / BATCH_SIZE + 1}/${totalBatches})...`);
    } catch (err) {
      console.error('Error fetching batch:', err);
    }

    if (i + BATCH_SIZE < appIds.length) {
      await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_BATCHES));
    }
  }

  return allGameDetails;
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
    return response.data.response.store_items;
  } catch (err) {
    console.error('Error fetching game details:', err);
    return [];
  }
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

  if (supported && full_audio && subtitles) {
    return '{TRUE}';
  } else if (!supported && !full_audio && !subtitles) {
    return '{FALSE}';
  } else {
    return `{${supported};${full_audio};${subtitles}}`;
  }
};

const main = async (steam3Id, language, countryCode, supportedLanguage, updateCallback) => {
  const gameCategories = new Map();
  const tagsMap = await loadTags();

  try {
    updateCallback(10, 'Deleting old copy...');
    await deleteFolder(copyDbPath);

    updateCallback(20, 'Copying database...');
    await copyFolder(originalDbPath, copyDbPath);

    updateCallback(30, 'Opening database...');
    const db = new Level(copyDbPath, { valueEncoding: 'hex' });

    updateCallback(40, 'Reading database entries...');
    let totalEntries = 0;
    let processedEntries = 0;

    for await (const _ of db.iterator()) {
      totalEntries++;
    }

    for await (const [key, value] of db.iterator()) {
      if (key.startsWith(`_https://steamloopback.host\u0000\u0001U${steam3Id}-cloud-storage-namespace`)) {
        const decodedValue = unserializeCollections(value);

        for (const collection of Object.values(decodedValue)) {
          if (collection?.value?.name && Array.isArray(collection.value.added)) {
            const collectionName = collection.value.name;
            const gameIds = collection.value.added;

            for (const gameId of gameIds) {
              if (!gameCategories.has(gameId)) {
                gameCategories.set(gameId, new Set());
              }
              gameCategories.get(gameId).add(collectionName);
            }
          }
        }
      }

      processedEntries++;
      const progress = 40 + Math.floor((processedEntries / totalEntries) * 30);
      updateCallback(progress, `Processing database entries (${processedEntries}/${totalEntries})...`);
    }

    updateCallback(70, 'Preparing data for CSV...');
    const appIds = Array.from(gameCategories.keys());
    const idCategoryData = Array.from(gameCategories.entries()).map(([id, categories]) => ({
      game_id: id,
      categories: Array.from(categories).join(';'),
    }));

    await fs.mkdir(outputFolder, { recursive: true });
    await writeToCsv(idCategoryData, path.join(outputFolder, 'id_categories.csv'), ['game_id', 'categories']);

    updateCallback(70, 'Fetching game details...');
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
    await db.close();
  } catch (err) {
    console.error('Error in main:', err);
    updateCallback(0, 'Error occurred. Check console for details.');
  }
};

module.exports = { main };
