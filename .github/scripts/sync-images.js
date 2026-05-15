const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const IMAGE_DIR = path.join(process.cwd(), 'img');
const CONFIG_PATH = path.join(process.cwd(), 'kaoshi.json');
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
const RELEASE_TAG = 'img';

function naturalSort(a, b) {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
}

function padIndex(index) {
  return String(index + 1).padStart(2, '0');
}

function getBranchName() {
  const ref = process.env.GITHUB_REF || '';
  return ref.replace(/^refs\/heads\//, '');
}

function runGit(command) {
  return execSync(command, { stdio: 'inherit' });
}

async function githubRequest(method, url, body, headers = {}) {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    throw new Error('GITHUB_TOKEN is required for GitHub API requests.');
  }

  const opts = {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      ...headers,
    },
  };

  if (body != null) {
    if (body instanceof Buffer) {
      opts.body = body;
    } else {
      opts.body = JSON.stringify(body);
      opts.headers['Content-Type'] = 'application/json';
    }
  }

  const response = await fetch(url, opts);
  const text = await response.text();
  const result = text ? JSON.parse(text) : null;
  if (!response.ok) {
    const message = result && result.message ? result.message : text;
    const error = new Error(`GitHub API ${method} ${url} failed: ${message}`);
    error.status = response.status;
    error.response = result;
    throw error;
  }
  return result;
}

function getMimeType(fileName) {
  const ext = path.extname(fileName).toLowerCase();
  switch (ext) {
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.png':
      return 'image/png';
    case '.gif':
      return 'image/gif';
    case '.webp':
      return 'image/webp';
    default:
      return 'application/octet-stream';
  }
}

function loadConfig() {
  return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
}

function saveConfig(config) {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2) + '\n', 'utf8');
}

function collectImageFiles() {
  if (!fs.existsSync(IMAGE_DIR)) {
    return [];
  }

  return fs.readdirSync(IMAGE_DIR)
    .filter(file => {
      const fullPath = path.join(IMAGE_DIR, file);
      return fs.statSync(fullPath).isFile() && ALLOWED_EXTENSIONS.includes(path.extname(file).toLowerCase());
    })
    .sort(naturalSort);
}

function normalizeImageFiles(files) {
  const renameActions = [];
  const finalNames = files.map((file, idx) => `${padIndex(idx)}${path.extname(file).toLowerCase()}`);

  files.forEach((file, idx) => {
    const desiredName = finalNames[idx];
    if (file !== desiredName) {
      renameActions.push({ source: file, target: desiredName });
    }
  });

  if (renameActions.length === 0) {
    return finalNames;
  }

  const tempSuffix = Date.now();
  const tempMappings = [];

  renameActions.forEach(({ source }) => {
    const sourcePath = path.join(IMAGE_DIR, source);
    const tempName = `${source}.sync-temp-${tempSuffix}`;
    const tempPath = path.join(IMAGE_DIR, tempName);
    fs.renameSync(sourcePath, tempPath);
    tempMappings.push({ tempName, target: renameActions.find(action => action.source === source).target });
  });

  tempMappings.forEach(({ tempName, target }) => {
    const tempPath = path.join(IMAGE_DIR, tempName);
    if (!fs.existsSync(tempPath)) {
      throw new Error(`临时重命名文件不存在: ${tempPath}`);
    }
    const targetPath = path.join(IMAGE_DIR, target);
    fs.renameSync(tempPath, targetPath);
  });

  return finalNames;
}

async function findOrCreateRelease(owner, repo) {
  const tagUrl = `https://api.github.com/repos/${owner}/${repo}/releases/tags/${RELEASE_TAG}`;
  try {
    return await githubRequest('GET', tagUrl);
  } catch (error) {
    if (error.status === 404) {
      const createUrl = `https://api.github.com/repos/${owner}/${repo}/releases`;
      return await githubRequest('POST', createUrl, {
        tag_name: RELEASE_TAG,
        name: RELEASE_TAG,
        body: '自动同步 img 目录图片资源，用于自建下载站。',
        draft: false,
        prerelease: false,
      });
    }
    throw error;
  }
}

async function deleteReleaseAsset(owner, repo, assetId, assetName) {
  const url = `https://api.github.com/repos/${owner}/${repo}/releases/assets/${assetId}`;
  await githubRequest('DELETE', url, null, { Accept: 'application/vnd.github+json' });
  console.log(`Deleted existing release asset: ${assetName}`);
}

async function uploadReleaseAsset(uploadUrl, filePath, fileName) {
  const fileData = fs.readFileSync(filePath);
  const url = `${uploadUrl.replace('{?name,label}', '')}?name=${encodeURIComponent(fileName)}`;
  await githubRequest('POST', url, fileData, {
    'Content-Type': getMimeType(fileName),
    Accept: 'application/vnd.github+json',
  });
  console.log(`Uploaded release asset: ${fileName}`);
}

(async () => {
  const repository = process.env.GITHUB_REPOSITORY;
  if (!repository) {
    throw new Error('GITHUB_REPOSITORY environment variable is required.');
  }

  const [owner, repo] = repository.split('/');
  if (!owner || !repo) {
    throw new Error(`Invalid GITHUB_REPOSITORY value: ${repository}`);
  }

  const branch = getBranchName();
  const imageFiles = collectImageFiles();
  if (imageFiles.length === 0) {
    console.log('No image files found in img/. Nothing to sync.');
    return;
  }

  const normalizedNames = imageFiles.map((file, idx) => `${padIndex(idx)}${path.extname(file).toLowerCase()}`);
  let finalNames = normalizedNames;
  const hasWrongName = imageFiles.some((file, idx) => file !== normalizedNames[idx]);

  if (hasWrongName) {
    console.log('Detected image naming issues. Renaming files to sequential order.');
    finalNames = normalizeImageFiles(imageFiles);
  }

  const config = loadConfig();
  const baseUrl = `https://git.zxymiku.top/https://github.com/${owner}/${repo}/releases/download/${RELEASE_TAG}/`;
  const newUrls = finalNames.map(name => `${baseUrl}${encodeURIComponent(name)}`);

  const backgroundsChanged =
    !Array.isArray(config.backgrounds) ||
    config.backgrounds.length !== newUrls.length ||
    config.backgrounds.some((url, index) => url !== newUrls[index]);

  if (backgroundsChanged) {
    config.backgrounds = newUrls;
    saveConfig(config);
    console.log('Updated kaoshi.json backgrounds list.');
  } else {
    console.log('kaoshi.json backgrounds already match current image list.');
  }

  const gitStatus = execSync('git status --porcelain', { encoding: 'utf8' }).trim();
  if (gitStatus) {
    console.log('Committing renamed image files and kaoshi.json updates.');
    runGit('git config user.name "github-actions[bot]"');
    runGit('git config user.email "github-actions[bot]@users.noreply.github.com"');
    runGit('git add kaoshi.json img');
    runGit('git commit -m "chore: sync img filenames and kaoshi.json"');
    runGit(`git push origin HEAD:${branch}`);
  } else {
    console.log('No file changes to commit.');
  }

  const release = await findOrCreateRelease(owner, repo);
  const assets = await githubRequest('GET', `https://api.github.com/repos/${owner}/${repo}/releases/${release.id}/assets`);

  for (const asset of assets) {
    if (finalNames.includes(asset.name)) {
      await deleteReleaseAsset(owner, repo, asset.id, asset.name);
    }
  }

  for (const fileName of finalNames) {
    const filePath = path.join(IMAGE_DIR, fileName);
    await uploadReleaseAsset(release.upload_url, filePath, fileName);
  }

  console.log('Image synchronization and release publishing completed.');
})();
